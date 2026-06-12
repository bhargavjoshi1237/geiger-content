const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/content" : "";

/** @type {import("next").NextConfig} */
const nextConfig = {
  basePath,
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
