// Fetch oEmbed metadata for supported providers
// Returns { title, author, thumbnail, ... } or null
export async function fetchOEmbed(url) {
  // YouTube
  if (/youtube\.com|youtu\.be/.test(url)) {
    try {
      // Always use canonical video URL for oEmbed (strip playlist param)
      let canonical = url;
      try {
        const u = new URL(url);
        // If v param exists, build canonical video URL
        const v = u.searchParams.get('v');
        if (v) {
          canonical = `https://www.youtube.com/watch?v=${v}`;
        } else if (/youtu\.be$/.test(u.hostname)) {
          // youtu.be short link
          const id = u.pathname.split('/').filter(Boolean)[0];
          if (id) canonical = `https://www.youtube.com/watch?v=${id}`;
        }
      } catch {}
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`);
      if (!res.ok) return null;
      return await res.json();
    } catch {}
  }
  // SoundCloud
  if (/soundcloud\.com/.test(url)) {
    try {
      // Use Vercel proxy endpoint to avoid CORS issues
      const res = await fetch(`/api/soundcloud-oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {}
  }
  // Bandcamp (no official oEmbed, try OpenGraph)
  if (/bandcamp\.com/.test(url)) {
    // Bandcamp does not support oEmbed, fallback to OpenGraph scraping (not possible client-side due to CORS)
    return null;
  }
  // Spotify (no oEmbed, fallback to OpenGraph)
  if (/spotify\.com/.test(url)) {
      try {
        // Spotify provides an oEmbed endpoint which returns a thumbnail_url for tracks/albums/playlists
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
  }
  // Fallback: try generic oEmbed providers if needed
  return null;
}
