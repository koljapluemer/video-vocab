import { describe, expect, it } from 'vitest'

import {
  getSnippetPlaybackWindow,
  MIN_SNIPPET_PLAYBACK_DURATION_SECONDS,
} from './getSnippetPlaybackWindow'

describe('getSnippetPlaybackWindow', () => {
  it('keeps snippets that already meet the minimum duration unchanged', () => {
    expect(getSnippetPlaybackWindow(12.5, 3.25)).toEqual({
      endSeconds: 15.75,
      startSeconds: 12.5,
    })
  })

  it('pads short snippets on both sides when possible', () => {
    expect(getSnippetPlaybackWindow(10, 0.5)).toEqual({
      endSeconds: 11.25,
      startSeconds: 9.25,
    })
  })

  it('pads only at the end when the snippet starts near zero', () => {
    expect(getSnippetPlaybackWindow(0.25, 0.5)).toEqual({
      endSeconds: 2,
      startSeconds: 0,
    })
  })

  it('expands zero-length snippets to the minimum playback duration', () => {
    expect(getSnippetPlaybackWindow(8, 0)).toEqual({
      endSeconds: 9,
      startSeconds: 7,
    })
    expect(MIN_SNIPPET_PLAYBACK_DURATION_SECONDS).toBe(2)
  })
})
