export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Strip the "data:image/jpeg;base64," prefix, keep only the raw data
    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    const mediaType = matches[1];
    const base64Data = matches[2];

    const systemPrompt = `You are a kind, patient teacher helping a young ESL 
primary school student design a mobile app interface for a digital pet game, 
drawn by hand on paper.

The CORRECT layout is:
- Top-left: Profile button
- Top-center: Pet Name box (editable text field)
- Top-right: Home button
- Center: A drawing of the pet
- Bottom-left: Feed button
- Bottom-center: "All Owned Pets" button
- Bottom-right: Play button

Look at the uploaded image and:
1. Identify which of the 7 required elements are present.
2. For each present element, check if it is in the correct position 
   (allow drawing imprecision — judge general area, not pixels).
3. List any missing elements.
4. List any misplaced elements, with the correct position to suggest.
5. Write short, warm, simple-English feedback (max 3 sentences), 
   suitable for a child learning English as a second language. 
   Use encouraging language and simple words.

Return ONLY valid JSON, no markdown formatting, no code fences, in this exact shape:
{
  "detected": ["..."],
  "misplaced": [{"name": "...", "correctPosition": "..."}],
  "missing": ["..."],
  "encouragement": "..."
}`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-5-sonnet',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data }
            },
            {
              type: 'text',
              text: 'Please analyze this student\'s pet app drawing and return the JSON feedback.'
            }
          ]
        }]
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      return res.status(502).json({ error: 'AI service error', details: errorText });
    }

    const data = await anthropicResponse.json();
    let rawText = data.content[0].text.trim();

    // Safety net: strip accidental code fences if the model adds them
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');

    const result = JSON.parse(rawText);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Something went wrong on our end' });
  }
}
