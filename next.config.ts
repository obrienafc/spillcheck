import type { NextConfig } from 'next';

// Chromium ships as compressed files that nothing imports, so file tracing
// would leave them out of the function bundle unless listed here.
const chromiumFiles = ['./node_modules/@sparticuz/chromium/bin/**'];

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/scan': chromiumFiles,
    '/api/scan-eu': chromiumFiles,
    '/badge': chromiumFiles,
  },
};

export default config;
