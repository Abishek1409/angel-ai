export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Invalid request body: messages array required.' });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct',
        messages,
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ message: data.detail || data.message || 'NVIDIA API error' });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
}
