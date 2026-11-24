// ponytail: minimal Astro config with zero external plugins/heavy overhead
import { defineConfig } from 'astro/config';

export default defineConfig({
  // ponytail: standard static output for fast, zero-runtime hosting
  output: 'static',
});
