import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

import { defineConfig, type ConfigEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }: ConfigEnv) => {
  const isProduction = mode === "production";

  const plugins = [react(), tailwindcss()];
  const prodPlugins: any[] = [];
  if (isProduction) {
    const single = viteSingleFile();
    if (single) prodPlugins.push(single as any);
  }

  // API backend URL from environment (process.env available at build time)
  const viteApiUrl = process.env.VITE_API_URL || '';
  let proxyTarget = 'http://localhost:3001';
  if (viteApiUrl && (viteApiUrl.startsWith('http://') || viteApiUrl.startsWith('https://'))) {
    try {
      proxyTarget = new URL(viteApiUrl).origin;
    } catch {
      // Leave as default if URL parsing fails
    }
  }
  const apiOrigin = proxyTarget;

  return {
    plugins: [...plugins, ...prodPlugins],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API requests to backend to avoid CORS/CSP issues in development
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false, // Set to true for HTTPS backends with valid SSL certificates
        },
      },
      headers: {
        "Content-Security-Policy": `default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${apiOrigin} http://localhost:* ws://localhost:*; font-src 'self' https: data:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';`
      }
    },
  };
});
