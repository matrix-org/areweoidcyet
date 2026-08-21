import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

/** The commit the site was built from, or `null` if it couldn't be determined. */
const commitSha =
  process.env["GITHUB_SHA"] ??
  (await promisify(execFile)("git", ["rev-parse", "HEAD"])
    .then(({ stdout }) => stdout.trim())
    .catch(() => null));

export default defineConfig({
  site: "https://areweoidcyet.com",
  trailingSlash: "always",
  integrations: [mdx(), react()],
  vite: {
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha),
    },
  },
});
