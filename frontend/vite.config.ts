import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// strictPort keeps the dev server on 5173, the only origin the backend's CORS allows.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
