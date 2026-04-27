import type { Snippet } from '@/entities/snippet/snippet'

export function getSnippetIndexForTime(snippets: Snippet[], currentTimeSeconds: number): number {
  if (snippets.length === 0) {
    return 0
  }

  let low = 0
  let high = snippets.length - 1
  let matchingIndex = 0

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const snippet = snippets[middle]

    if (currentTimeSeconds >= snippet.start) {
      matchingIndex = middle
      low = middle + 1
      continue
    }

    high = middle - 1
  }

  return matchingIndex
}
