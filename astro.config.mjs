// @ts-check
import { defineConfig } from 'astro/config';

import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.davidmcclungphoto.co.uk',
  integrations: [markdoc()],
});