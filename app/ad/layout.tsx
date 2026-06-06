import type { ReactNode } from 'react';
import AdNav from '@/components/AdNav';

// Wraps every /ad/* route with the left-side variant switcher. AdNav is a fixed,
// auto-hiding overlay in the letterbox, so it doesn't affect the recording frame.
export default function AdLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdNav />
    </>
  );
}
