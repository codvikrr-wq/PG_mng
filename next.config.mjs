/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nkjtskiocmgbefxsbijh.supabase.co",
        port: "",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  allowedDevOrigins: ["192.168.29.90"],
};

export default nextConfig;
