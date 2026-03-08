/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "cloudinary", "bcryptjs"],
};

export default nextConfig;
