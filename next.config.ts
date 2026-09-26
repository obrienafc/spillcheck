import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // Chromium ships as a compressed binary that must stay on disk, not be bundled.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default config;
