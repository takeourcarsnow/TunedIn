export function parseYouTubeTitle(meta: any) {
  const title = (meta?.title || '').trim();
  // Common pattern: "Artist - Title (Official Video)"
  const m = title.match(/^([^\-–—]+)[\-–—]\s*(.+)$/);
  if (m) {
    let artist = m[1].trim(); let song = m[2].trim();
    song = song.replace(/\((?:official|lyrics?|video|audio|mv)[^)]*\)/ig, '').trim();
    song = song.replace(/\[[^\]]*\]/g, '').trim();
    return { artist, title: song };
  }
  return { artist: meta?.author_name || '', title };
}
