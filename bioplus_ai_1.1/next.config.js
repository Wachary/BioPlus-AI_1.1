/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: 'http://bioplus-ai.agaii.org/', // Replace with your target URL
        permanent: true,
      },
    ];
  },
  output: 'export', // Enables static export for GitHub Pages
};

module.exports = nextConfig;
