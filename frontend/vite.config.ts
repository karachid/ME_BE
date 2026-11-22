import { networkInterfaces } from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev, forward API calls to the Flask backend so no CORS/config is needed.
const backend = "http://127.0.0.1:5000";
const PORT = 5173;

/** This PC's address on the local network (what a phone on the same Wi-Fi can reach). */
function lanUrl(): string | null {
  const candidates: string[] = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      if (a.address.startsWith("169.254.")) continue; // self-assigned, not a real network
      if (a.address.startsWith("192.168.56.")) continue; // VirtualBox host-only adapter
      candidates.push(a.address);
    }
  }
  const best = candidates.find((ip) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(ip));
  return best ? `http://${best}:${PORT}` : null;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Lets the QR page default to an address phones can open, even if the admin
  // itself was opened on "localhost".
  define: { __LAN_URL__: JSON.stringify(lanUrl()) },
  server: {
    port: PORT,
    host: true, // listen on the network so phones on the same Wi-Fi can connect
    proxy: {
      "/auth": backend,
      "/admin": backend,
      "/api": backend,
    },
  },
});
