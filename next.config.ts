import type { NextConfig } from "next";

const extraAllowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Allow local-network testing in Next dev without HMR being blocked.
  allowedDevOrigins: ["localhost", "127.0.0.1", "172.20.10.5", "192.168.4.26", ...extraAllowedDevOrigins],
};

export default nextConfig;
