// api/tts.js — ElevenLabs TTS proxy
// Set ELEVENLABS_API_KEY in Vercel environment variables.
// Free tier: 10,000 characters/month at console.elevenlabs.io
//
// Voice: Rachel (21m00Tcm4TlvDq8ikWAM) — calm, warm, natural female.
// Model: eleven_turbo_v2 — low latency, great quality.

const VOICE_ID  = 'vGQNBgLaiM3EdZtxIiuY'; // Aerisita
const MODEL_ID  = 'eleven_turbo_v2';
const MAX_CHARS = 500; // guard against runaway requests

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Signal to client to fall back to browser TTS
    return res.status(503).json({ error: 'TTS not configured' });
  }

  const clipped = text.slice(0, MAX_CHARS);

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        Accept:         'audio/mpeg',
      },
      body: JSON.stringify({
        text: clipped,
        model_id: MODEL_ID,
        voice_settings: {
          stability:        0.55,
          similarity_boost: 0.80,
          style:            0.10,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error('[tts] ElevenLabs error:', err);
    return res.status(502).json({ error: 'Upstream TTS failed' });
  }

  const audio = await upstream.arrayBuffer();
  // Cache intro lines for 24 h; chat replies for 1 min
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(Buffer.from(audio));
}
