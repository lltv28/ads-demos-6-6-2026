type DemoChip = {
  value: string;
};

export function createSeededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(maxExclusive: number, random: () => number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(random() * maxExclusive);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, random);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pickAutoValues(chips: DemoChip[], multiSelect: boolean, random: () => number): string[] {
  if (chips.length === 0) return [];
  if (!multiSelect) {
    return [chips[randomInt(chips.length, random)].value];
  }

  const maxCount = Math.min(3, chips.length);
  const count = randomInt(maxCount, random) + 1;
  return shuffle(chips, random)
    .slice(0, count)
    .map((chip) => chip.value);
}
