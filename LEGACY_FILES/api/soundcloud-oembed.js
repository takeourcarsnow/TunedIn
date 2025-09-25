// Vercel serverless function to proxy SoundCloud oEmbed requests
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    const apiUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch from SoundCloud' });
      return;
    }
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error', details: e.message });
  }
}
