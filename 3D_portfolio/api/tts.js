// api/tts.js — ElevenLabs TTS proxy
// Set ELEVENLABS_API_KEY in Vercel environment variables.
// Free tier: 10,000 characters/month at console.elevenlabs.io

const VOICE_ID  = 'nEYxeXWO3O26xIMBsJ2O'; // Peni
const MAX_CHARS = 500;

// Models to try in order — eleven_multilingual_v2 is available on all tiers
const MODELS = ['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_monolingual_v1'];

async function tryTTS(apiKey, text, modelId) {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        Accept:         'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability:         0.55,
          similarity_boost:  0.80,
          style:             0.10,
          use_speaker_boost: true,
        },
      }),
    },
  );
}

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
    console.warn('[tts] ELEVENLABS_API_KEY not set — falling back to browser TTS');
    return res.status(503).json({ error: 'TTS not configured' });
  }

  const clipped = text.slice(0, MAX_CHARS);
  let lastError = '';

  for (const model of MODELS) {
    let upstream;
    try {
      upstream = await tryTTS(apiKey, clipped, model);
    } catch (fetchErr) {
      lastError = String(fetchErr);
      console.error(`[tts] network error with model ${model}:`, fetchErr);
      continue;
    }

    if (upstream.ok) {
      const audio = await upstream.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.send(Buffer.from(audio));
    }

    // Surface the real ElevenLabs error so it appears in Vercel function logs
    const body = await upstream.text();
    lastError  = `HTTP ${upstream.status}: ${body}`;
    console.error(`[tts] ElevenLabs rejected model=${model} status=${upstream.status}:`, body);

    // 401 = bad key, 422 = bad voice/model — no point retrying other models
    if (upstream.status === 401 || upstream.status === 422) break;
  }

  // All models failed — tell the client so it falls back to browser TTS
  return res.status(502).json({ error: lastError });
}
