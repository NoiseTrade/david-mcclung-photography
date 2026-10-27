import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';

export async function GET(context) {
  const albums = await getCollection('albums');

  const sorted = albums.sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf()
  );

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: sorted.map((album) => ({
      title: album.data.title,
      description: album.data.description,
      pubDate: album.data.publishDate,
      link: `/collections/${album.id}/`,
      categories: album.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}