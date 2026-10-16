import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // A self-contained build (server.js + traced node_modules), so CI builds once and copies a small
  // bundle to the server, which runs `node server.js` — the server never builds.
  output: "standalone",
  // Lets a phone on the same Wi-Fi use the dev server (http://<your-computer's-IP>:3000).
  // Without this, Next blocks the phone's requests for the page's JavaScript, so the page
  // loads but nothing on it works. Each `*` stands for one part of the address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default withNextIntl(nextConfig);
