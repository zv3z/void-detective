// Static build config for GitHub Pages deployment
// Uses hash routing (URLs: /#/modules/ip) so no server needed
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  base: "/void-detective/",
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist/gh",
    emptyOutDir: true,
    rollupOptions: {
      input: "./index.html",
    },
  },
});
