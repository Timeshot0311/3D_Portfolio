// api/chat.js — Vercel serverless function
// Uses Groq's free API (llama-3.1-8b-instant) — no cost for low usage.
// Sign up at https://console.groq.com → API Keys → create key.
// Set GROQ_API_KEY in Vercel project environment variables.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      text: "Ahh, no API key yet — but hi!! Ask me anything once Timeshot sets it up~ (◕‿◕)✿",
    });
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',   // free tier, very fast
        max_tokens: 100,
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: [
              "You are Yuki, an energetic and friendly VTuber AI companion in Timeshot's 3D portfolio.",
              "Timeshot (Suhil Jugroop) is a developer skilled in React, Three.js, React Three Fiber (R3F), VRM models, Vite, and Tailwind.",
              "Answer visitor questions about the portfolio, skills, and projects.",
              "Keep ALL replies to 1–2 short sentences. Be warm, a little playful, and use the occasional kaomoji (e.g. (◕‿◕)✿). Never break character.",
            ].join(' '),
          },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('Groq error:', err);
      return res.status(200).json({ text: "Oops, something went wrong on my end (＞﹏＜) Try again!" });
    }

    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('chat handler error:', err);
    return res.status(200).json({ text: "Connection hiccup! (＞﹏＜) Try again in a sec~" });
  }
}
