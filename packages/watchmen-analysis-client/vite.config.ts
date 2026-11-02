import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/watchmen/metricflow": {
        target: "http://localhost:8910",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/watchmen/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // split heavy vendors out of the main chunk; pages load them on demand
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("node_modules/mermaid") ||
            id.includes("node_modules/@mermaid-js") ||
            id.includes("node_modules/react-mermaid-js")
          ) return "mermaid";
          if (id.includes("node_modules/@xyflow")) return "xyflow";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/rehype-") ||
            id.includes("node_modules/remark-")
          ) return "markdown";
          if (id.includes("node_modules/@copilotkit")) return "copilotkit";
        },
      },
    },
  },
}));
