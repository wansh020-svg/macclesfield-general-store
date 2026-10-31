/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Menu and ordering are one page now.
    return [{ source: "/menu", destination: "/order", permanent: false }];
  },
};

module.exports = nextConfig;
