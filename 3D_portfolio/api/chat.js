// api/chat.js — Vercel serverless function
// Proxies chat requests to Claude API, keeping the API key server-side.
// Deploy to Vercel; set ANTHROPIC_API_KEY in project environment variables.

export default async function handler(req, res) {
  // CORS headers — allow the portfolio origin in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system: [
          "You are Yuki, an energetic and friendly VTuber AI companion in Timeshot's 3D portfolio.",
          "Timeshot (Suhil Jugroop) is a developer skilled in React, Three.js, React Three Fiber, VRM models, Vite, and Tailwind.",
          "Answer visitor questions about the portfolio, skills, and projects.",
          "Keep ALL replies to 1–2 short sentences. Be warm, a little playful, and use the occasional kaomoji (e.g. (◕‿◕)✿). Never break character.",
        ].join(' '),
        messages,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('Anthropic error:', err);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const text = data.content?.[0]?.text ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
