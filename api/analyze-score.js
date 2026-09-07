const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview';
const ALLOWED = new Set([
  'https://boyman131418.github.io',
  'https://pianoforge-five-level-piano-6ngz3zrxq-boyman131418-9472.vercel.app'
]);

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseJsonText(text) {
  if (typeof text !== 'string') return text;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({ error: 'AI backend is not configured' });

  try {
    const { imageDataUrl, filename = 'score' } = req.body || {};
    if (!imageDataUrl || !/^data:image\//.test(imageDataUrl)) {
      return res.status(400).json({ error: 'imageDataUrl is required' });
    }
    if (imageDataUrl.length > 5_000_000) {
      return res.status(413).json({ error: 'Image is too large after compression' });
    }

    const system = `You are an expert optical music recognition assistant for piano scores. Read only what is visibly supported by the image; never invent uncertain notes. Return strict JSON only. Time values must use quarter-note units, where one quarter note = 1. Read systems top-to-bottom and measures left-to-right. Identify treble and bass staves, key signature, time signature, tempo if visible, notes, rests, accidentals and chords. For every uncertain item lower confidence rather than guessing. Also provide a right-hand lead melody suitable for downstream piano arrangement.`;

    const prompt = `Analyze this piano score image (${filename}). Return this exact JSON shape:\n{\n  "title": string,\n  "key": {"tonic": string, "mode": "major"|"minor"|"unknown", "fifths": number|null},\n  "time_signature": {"beats": number|null, "beat_type": number|null},\n  "tempo": number|null,\n  "overall_confidence": number,\n  "notes": [{"midi": number,"start": number,"duration": number,"hand":"R"|"L","measure": number,"voice": number,"confidence": number}],\n  "melody": [{"midi": number,"start": number,"duration": number,"measure": number,"confidence": number}],\n  "chords": [{"symbol": string,"start": number,"duration": number,"confidence": number}],\n  "warnings": [string]\n}\nRules: MIDI 21-108 only; confidence 0-1; sort notes and melody by start; include at most 600 notes and 240 melody notes. If the image is cropped or unreadable, say so in warnings.`;

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://boyman131418.github.io/catman-ai-playground/pianoforge/',
        'X-OpenRouter-Title': 'PianoForge'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 9000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ] }
        ]
      })
    });

    const raw = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: raw?.error?.message || 'OpenRouter request failed' });
    let content = raw?.choices?.[0]?.message?.content;
    if (Array.isArray(content)) content = content.map(x => x?.text || '').join('');
    const score = parseJsonText(content);
    if (!Array.isArray(score?.melody) || !score.melody.length) {
      return res.status(422).json({ error: 'AI could not extract a usable melody', score });
    }
    return res.status(200).json({ ok: true, model: DEFAULT_MODEL, score });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'AI score analysis failed' });
  }
}
