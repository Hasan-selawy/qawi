export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

export function VideoThumbnail(_props: { videoUrl?: string | null; borderRadius?: number }) {
  return null;
}
