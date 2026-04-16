import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@mui/")) return "vendor-mui";
          if (id.includes("@tanstack/react-query")) return "vendor-react-query";
          if (id.includes("react-router")) return "vendor-react-router";
          if (id.includes("framer-motion")) return "vendor-framer-motion";
          if (id.includes("axios")) return "vendor-axios";
          if (id.includes("react-hot-toast")) return "vendor-toast";
          return "vendor-misc";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
