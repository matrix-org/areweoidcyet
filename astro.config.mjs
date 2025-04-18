import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://areweoidcyet.com",
  trailingSlash: "always",
  integrations: [mdx(), react()],
});
