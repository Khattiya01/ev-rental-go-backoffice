import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  // Separate build cache dir for the E2E test server (.env.test) so it can run
  // alongside a real dev server on :3000 without both writing to the same .next/.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Allow next/image to serve locally uploaded files from public/uploads/
  // and any external image hostnames used in seeded data
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default withNextIntl(nextConfig);
