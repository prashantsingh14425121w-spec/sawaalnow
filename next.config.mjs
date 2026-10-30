/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/chat.html" }], afterFiles: [], fallback: [] };
  },
};
