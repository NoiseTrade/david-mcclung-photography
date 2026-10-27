import type { CollectionEntry } from 'astro:content';

export function withVolumes(albums: CollectionEntry<'albums'>[]) {
  const byDateAsc = [...albums].sort(
    (a, b) => a.data.publishDate.valueOf() - b.data.publishDate.valueOf()
  );

  const volumeMap = new Map<string, number>();
  byDateAsc.forEach((album, index) => {
    volumeMap.set(album.id, index + 1);
  });

  return (album: CollectionEntry<'albums'>) => {
    const num = volumeMap.get(album.id)!;
    return `Vol. ${String(num).padStart(2, '0')}`;
  };
}