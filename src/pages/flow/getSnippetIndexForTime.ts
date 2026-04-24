import type { Snippet } from '@/entities/snippet/snippet'

export function getSnippetIndexForTime(snippets: Snippet[], currentTimeSeconds: number): number {
  if (snippets.length === 0) {
    return 0
  }

  for (let index = snippets.length - 1; index >= 0; index -= 1) {
    if (currentTimeSeconds >= snippets[index].start) {
      return index
    }
  }

  return 0
}
