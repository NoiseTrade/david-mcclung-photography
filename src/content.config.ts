import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const albums = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/collections' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    coverImage: image(),
    tags: z.array(z.string()),
    publishDate: z.coerce.date(),
    order: z.number().optional(),
    description: z.string().optional(),
    category: z.enum(['digital', 'film', 'b-sides']).default('digital'),
    alts: z.record(z.string(), z.string()).optional(),
  }),
});

export const collections = { albums };