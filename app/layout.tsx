import type { Metadata, Viewport } from 'next';
import './base.css';
import './spillcheck.css';

export const metadata: Metadata = {
  title: 'Spillcheck: what does your website spill?',
  description:
    'See every third party your website talks to: fonts, analytics, ad pixels and embeds. Free and open source.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
