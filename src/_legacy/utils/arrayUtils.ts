// a fairly general-purpose utility collection; largely imported from other projects like al-k

/**
 * Picks a random element from an array.
 * @param array The array to pick from.
 * @returns A random element from the array, or undefined if the array is empty.
 */
export const pickRandom = <T>(array: T[]): T | undefined => {
  if (!array.length) return undefined;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

export const pickRandomN = <T>(array: T[], n: number): T[] => {
  if (!array.length || n <= 0) return [];
  if (n >= array.length) return [...array].sort(() => Math.random() - 0.5); // Shuffle and return all items

  const result: T[] = [];
  const usedIndices = new Set<number>();

  while (result.length < n) {
    const randomIndex = Math.floor(Math.random() * array.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      result.push(array[randomIndex]);
    }
  }

  return result;
};


export function getGridDimensions<T>(grid: T[][]): { rows: number; cols: number } {
  const rows = grid.length;
  const cols = grid[0]?.length || 0; // Fallback to 0 if no columns exist
  return { rows, cols };
}


// Fisher-Yates shuffle function to shuffle the array
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}


export function getRandomKeyValue<T extends Record<string, any>>(dict: T): { key: keyof T; value: T[keyof T] } {
  const keys = Object.keys(dict) as Array<keyof T>;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return { key: randomKey, value: dict[randomKey] };
}


export function filterDictByKeySubstring(dict: Record<string, any>, substring: string): Record<string, any> {
  return Object.fromEntries(
    Object.entries(dict).filter(([key]) => key.includes(substring))
  );
}