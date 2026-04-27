import { describe, expect, it } from 'vitest'

import { buildFlashcardPromptEntries } from './flashcardPromptEntry'

describe('flashcardPromptEntry', () => {
  it('merges meanings and sorts by descending frequency', () => {
    const entries = buildFlashcardPromptEntries([
      { original: 'uno', meanings: ['one'] },
      { original: 'dos', meanings: ['two'] },
      { original: 'uno', meanings: ['single'] },
      { original: 'tres', meanings: ['three'] },
      { original: 'uno', meanings: ['one'] },
      { original: 'dos', meanings: ['two'] },
    ])

    expect(entries).toEqual([
      {
        word: { original: 'uno', meanings: ['one', 'single'] },
        occurrences: 3,
      },
      {
        word: { original: 'dos', meanings: ['two'] },
        occurrences: 2,
      },
      {
        word: { original: 'tres', meanings: ['three'] },
        occurrences: 1,
      },
    ])
  })
})
