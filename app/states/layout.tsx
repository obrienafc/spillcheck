import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spillcheck states',
  robots: { index: false },
};

export default function StatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
