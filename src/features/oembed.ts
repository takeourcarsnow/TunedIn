export async function fetchOEmbed(url: string) {
  try {
    const res = await fetch(`/api/soundcloud-oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
