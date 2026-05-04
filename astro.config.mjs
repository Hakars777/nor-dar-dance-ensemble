import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://pink-albatross-667205.hostingersite.com",
  trailingSlash: "always",
  integrations: [
    mdx(),
    tailwind({
      applyBaseStyles: false
    })
  ]
});
