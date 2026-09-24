import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi use the dev server (http://<your-computer's-IP>:3000).
  // Without this, Next blocks the phone's requests for the page's JavaScript, so the page
  // loads but nothing on it works. Each `*` stands for one part of the address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default withNextIntl(nextConfig);
