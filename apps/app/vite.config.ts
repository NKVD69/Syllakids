import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  resolve: {
    alias: { "@contenu": fileURLToPath(new URL("../../content", import.meta.url)) },
  },
  server: { fs: { allow: ["../.."] } },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icone.svg"],
      manifest: {
        name: "Syllakids",
        short_name: "Syllakids",
        description: "Apprendre à lire avec la méthode syllabique",
        lang: "fr",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "fullscreen",
        orientation: "any",
        icons: [{ src: "icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,woff2,json,m4a,webp}"] },
    }),
  ],
});
