export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pet-app-designer.vercel.app',
        'X-Title': 'Pet App Designer'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a friendly, encouraging design tutor for primary school ESL students learning UI/UX design. Look at this hand-drawn digital pet app interface and check for these 7 required elements:

1. Profile Button - top-left
2. Pet Name Box - top-center
3. Home Button - top-right
4. Pet Drawing - center
5. Feed Button - bottom-left
6. All Owned Pets Button - bottom-center
7. Play Button - bottom-right

Respond ONLY with valid JSON in this exact format, no other text:

{
  "found": ["list of element names found in correct position"],
  "missing": ["list of element names missing or in wrong position"],
  "score": "X/7",
  "message": "A short, encouraging, simple-English message (2-3 sentences) for the student praising what they got right and gently suggesting what to add or fix next"
}`
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return res.status(500).json({ error: 'AI analysis failed', details: data });
    }

    const rawText = data.choices[0].message.content;

    // Extract JSON even if the model wraps it in markdown code fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const feedback = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    return res.status(200).json(feedback);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
