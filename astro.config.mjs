import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import config from "./src/config/config.json";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_BASE_URL,
  base: config.site.base_path ? config.site.base_path : "/",
  trailingSlash: "always",
  integrations: [
    react(),
    sitemap({
      changefreq: "daily",
      priority: 0.7,
      lastmod: new Date(),
    }),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    }),
    mdx(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    })
  ],
  markdown: {
    remarkPlugins: [],
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true
    },
    extendDefaultPlugins: true
  },
  image: {
    remotePatterns: [{
      protocol: "https"
    }]
  },
  experimental: {
    contentCollectionCache: false,
  },
});
