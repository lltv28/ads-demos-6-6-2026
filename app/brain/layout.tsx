import type { ReactNode } from 'react';

// The Sales Brain is its own app surface (not a /hive recording stage), so it
// has no HiveNav — just a light full-bleed canvas.
export default function BrainLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
