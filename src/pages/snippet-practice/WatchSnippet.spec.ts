import { cleanup, fireEvent, render } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WatchSnippet from './WatchSnippet.vue'

const {
  destroyMock,
  loadVideoByIdMock,
  loadYoutubeIframeApi,
  pauseVideoMock,
  seekToMock,
} = vi.hoisted(() => ({
  destroyMock: vi.fn(),
  loadVideoByIdMock: vi.fn(),
  loadYoutubeIframeApi: vi.fn(),
  pauseVideoMock: vi.fn(),
  seekToMock: vi.fn(),
}))

const playerState = {
  currentTime: 0,
  onStateChange: null as ((event: YT.OnStateChangeEvent) => void) | null,
}

vi.mock('@/features/video-embed/loadYoutubeIframeApi', () => ({
  loadYoutubeIframeApi,
}))

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('WatchSnippet', () => {
  beforeEach(() => {
    destroyMock.mockReset()
    loadVideoByIdMock.mockReset()
    loadYoutubeIframeApi.mockReset()
    pauseVideoMock.mockReset()
    seekToMock.mockReset()
    playerState.currentTime = 0
    playerState.onStateChange = null
    loadYoutubeIframeApi.mockResolvedValue(undefined)

    window.YT = {
      PlayerState: {
        BUFFERING: 3,
        CUED: 5,
        ENDED: 0,
        PAUSED: 2,
        PLAYING: 1,
        UNSTARTED: -1,
      },
      Player: class {
        constructor(_elementId: string | HTMLElement, options: YT.PlayerOptions) {
          playerState.onStateChange = options.events?.onStateChange ?? null
          Promise.resolve().then(() => {
            options.events?.onReady?.({ target: this as unknown as YT.Player })
          })
        }

        destroy() {
          destroyMock()
        }

        getCurrentTime() {
          return playerState.currentTime
        }

        loadVideoById(options: { videoId: string; startSeconds?: number; endSeconds?: number }) {
          playerState.currentTime = options.startSeconds ?? 0
          loadVideoByIdMock(options)
        }

        pauseVideo() {
          pauseVideoMock()
        }

        playVideo() {}

        seekTo(seconds: number) {
          playerState.currentTime = seconds
          seekToMock(seconds)
        }
      },
    } as unknown as typeof window.YT
  })

  afterEach(() => {
    cleanup()
  })

  it('loads the active snippet on ready and replays it on demand', async () => {
    const { getByRole } = render(WatchSnippet, {
      props: {
        videoId: 'abc123',
        start: 12.5,
        duration: 3.25,
        hasNextSnippet: true,
        nextSnippetQuery: { snippet: '1' },
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushAsyncWork()

    expect(loadVideoByIdMock).toHaveBeenCalledWith({
      endSeconds: 15.75,
      startSeconds: 12.5,
      videoId: 'abc123',
    })

    await fireEvent.click(getByRole('button', { name: 'Replay Snippet' }))

    expect(loadVideoByIdMock).toHaveBeenCalledTimes(2)
  })

  it('stops playback cleanly at the snippet end', async () => {
    vi.useFakeTimers()

    render(WatchSnippet, {
      props: {
        videoId: 'abc123',
        start: 10,
        duration: 2,
        hasNextSnippet: false,
        nextSnippetQuery: { snippet: '1' },
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushAsyncWork()

    expect(loadVideoByIdMock).toHaveBeenCalledTimes(1)

    playerState.currentTime = 12.05
    playerState.onStateChange?.({
      data: window.YT!.PlayerState.PLAYING,
      target: {} as YT.Player,
    })

    vi.advanceTimersByTime(250)

    expect(pauseVideoMock).toHaveBeenCalledTimes(1)
    expect(seekToMock).toHaveBeenCalledWith(12)

    vi.useRealTimers()
  })

  it('reloads the snippet window when props change', async () => {
    const view = render(WatchSnippet, {
      props: {
        videoId: 'abc123',
        start: 4,
        duration: 2,
        hasNextSnippet: true,
        nextSnippetQuery: { snippet: '1' },
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushAsyncWork()

    expect(loadVideoByIdMock).toHaveBeenCalledWith({
      endSeconds: 6,
      startSeconds: 4,
      videoId: 'abc123',
    })

    await view.rerender({
      videoId: 'abc123',
      start: 9,
      duration: 3,
      hasNextSnippet: true,
      nextSnippetQuery: { snippet: '2' },
    })

    await flushAsyncWork()

    expect(loadVideoByIdMock).toHaveBeenLastCalledWith({
      endSeconds: 12,
      startSeconds: 9,
      videoId: 'abc123',
    })
  })

  it('pads very short snippets to a minimum playback duration', async () => {
    render(WatchSnippet, {
      props: {
        videoId: 'abc123',
        start: 0.25,
        duration: 0.5,
        hasNextSnippet: false,
        nextSnippetQuery: { snippet: '1' },
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushAsyncWork()

    expect(loadVideoByIdMock).toHaveBeenLastCalledWith({
      endSeconds: 2,
      startSeconds: 0,
      videoId: 'abc123',
    })
  })
})
