import { describe, expect, it } from 'vitest'

import { getUniqueVideoVocabWords } from './videoVocab'

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
})
