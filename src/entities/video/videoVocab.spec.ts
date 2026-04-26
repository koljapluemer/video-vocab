import { describe, expect, it } from 'vitest'

import { buildVideoVocabEntries, getUniqueVideoVocabWords } from './videoVocab'

describe('videoVocab', () => {
  it('merges meanings for the same word across a video', () => {
    const words = getUniqueVideoVocabWords([
      {
        words: [
          { original: 'salut', meanings: ['hi'] },
          { original: 'salut', meanings: ['hello'] },
        ],
      },
    ])

    expect(words).toEqual([
      { original: 'salut', meanings: ['hi', 'hello'] },
    ])
  })

  it('sorts vocab entries by descending frequency', () => {
    const entries = buildVideoVocabEntries([
      {
        words: [
          { original: 'uno', meanings: ['one'] },
          { original: 'dos', meanings: ['two'] },
        ],
      },
      {
        words: [
          { original: 'uno', meanings: ['one'] },
          { original: 'tres', meanings: ['three'] },
        ],
      },
      {
        words: [
          { original: 'uno', meanings: ['one'] },
          { original: 'dos', meanings: ['two'] },
        ],
      },
    ])

    expect(entries).toEqual([
      {
        word: { original: 'uno', meanings: ['one'] },
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
