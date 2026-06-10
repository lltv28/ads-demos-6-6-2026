import type { ReactNode } from 'react';
import HiveNav from '@/components/HiveNav';

// Wraps every /hive/* route with the variant switcher. HiveNav starts hidden
// (left-edge hover to reveal), so by default nothing overlays the stage.
export default function HiveLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <HiveNav />
    </>
  );
}
