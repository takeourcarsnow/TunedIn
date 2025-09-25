// YouTube oEmbed returns title (usually "Artist - Song" or video title) and author_name (uploader)
// Try to split title into artist/title if possible
export function parseYouTubeTitle(oembed) {
  if (!oembed || !oembed.title) return { artist: '', title: '' };
  // Try to split on ' - ' (common for music videos)
  const dashIdx = oembed.title.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < oembed.title.length - 3) {
    return {
      artist: oembed.title.slice(0, dashIdx).trim(),
      title: oembed.title.slice(dashIdx + 3).trim(),
    };
  }
  // Fallback: treat uploader as artist, oembed.title as title
  return {
    artist: oembed.author_name || '',
    title: oembed.title,
  };
}
