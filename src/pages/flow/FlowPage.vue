<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Rating } from 'ts-fsrs'
import { useRouter } from 'vue-router'

import { getCourse, type Course, type Video } from '@/entities/course/course'
import type { Flashcard } from '@/entities/flashcard/flashcard'
import { applyRating, getOrCreateCardsForWords } from '@/entities/flashcard/flashcardStore'
import { getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import {
  recordFlashcardFlip,
  recordVideoWatchSlice,
} from '@/features/device-stats/deviceStatsStorage'
import FlashCardsWrapper from '@/features/flashcard-review/FlashCardsWrapper.vue'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'

import { buildFlowDeckWords } from './buildFlowDeck'
import { getSnippetIndexForTime } from './getSnippetIndexForTime'
import { pickRandomVideo } from './pickRandomVideo'

const router = useRouter()

const selectedLanguageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const activeVideo = ref<Video | null>(null)
const snippets = ref<Snippet[]>([])
const currentSnippetIndex = ref(0)
const activeExerciseSnippetIndex = ref(0)
const isLoading = ref(true)
const loadError = ref('')
const playerError = ref('')
const currentFlashcards = ref<Flashcard[]>([])
const flashcardDeckVersion = ref(0)
const playerHostId = `flow-player-${Math.random().toString(36).slice(2)}`

let player: YT.Player | null = null
let snippetTimer: number | null = null
let videoWatchTimer: number | null = null
let lastVideoWatchTickAt = Date.now()
let isPlayerActivelyPlaying = false

const currentSnippet = computed(() => snippets.value[currentSnippetIndex.value] ?? null)
const hasSnippets = computed(() => snippets.value.length > 0)
const flashcardDeckKey = computed(() => `${flashcardDeckVersion.value}`)
const courseVideos = computed(() => course.value?.videos ?? [])
const activeVideoIndex = computed(() =>
  courseVideos.value.findIndex((video) => video.youtubeId === activeVideo.value?.youtubeId),
)
const hasMultipleVideos = computed(() => courseVideos.value.length > 1)
const previousVideo = computed(() => {
  if (activeVideoIndex.value <= 0) {
    return null
  }

  return courseVideos.value[activeVideoIndex.value - 1] ?? null
})
const nextVideo = computed(() => {
  if (activeVideoIndex.value < 0 || activeVideoIndex.value >= courseVideos.value.length - 1) {
    return null
  }

  return courseVideos.value[activeVideoIndex.value + 1] ?? null
})

async function setExerciseDeck(snippetIndex: number) {
  activeExerciseSnippetIndex.value = snippetIndex
  currentFlashcards.value = await getOrCreateCardsForWords(
    selectedLanguageCode,
    buildFlowDeckWords(snippets.value, snippetIndex),
  )
  flashcardDeckVersion.value += 1
}

function clearSnippetTimer() {
  if (snippetTimer !== null) {
    window.clearInterval(snippetTimer)
    snippetTimer = null
  }
}

function clearVideoWatchTimer() {
  if (videoWatchTimer !== null) {
    window.clearInterval(videoWatchTimer)
    videoWatchTimer = null
  }
}

function stopVideoWatchTracking() {
  isPlayerActivelyPlaying = false
  clearVideoWatchTimer()
}

function startVideoWatchTracking() {
  lastVideoWatchTickAt = Date.now()

  if (videoWatchTimer !== null) {
    return
  }

  videoWatchTimer = window.setInterval(() => {
    const now = Date.now()
    if (isPlayerActivelyPlaying && !document.hidden) {
      recordVideoWatchSlice(selectedLanguageCode, new Date(lastVideoWatchTickAt), new Date(now))
    }
    lastVideoWatchTickAt = now
  }, 5_000)
}

function startTrackingPlayback() {
  clearSnippetTimer()

  snippetTimer = window.setInterval(() => {
    if (!player) {
      return
    }

    const nextIndex = getSnippetIndexForTime(snippets.value, player.getCurrentTime())
    if (nextIndex !== currentSnippetIndex.value) {
      currentSnippetIndex.value = nextIndex
    }
  }, 250)
}

async function loadRandomVideo(options?: { excludeVideoId?: string }) {
  if (!course.value) {
    return
  }

  const candidates = course.value.videos.filter((video) => video.youtubeId !== options?.excludeVideoId)
  const remainingVideos = candidates.length > 0 ? [...candidates] : [...course.value.videos]

  while (remainingVideos.length > 0) {
    const randomVideo = pickRandomVideo({
      ...course.value,
      videos: remainingVideos,
    })

    try {
      await loadSpecificVideo(randomVideo)
      break
    } catch (error) {
      console.error(`Failed to load flow video '${randomVideo.youtubeId}':`, error)
      const nextIndex = remainingVideos.findIndex((video) => video.youtubeId === randomVideo.youtubeId)
      remainingVideos.splice(nextIndex, 1)
    }
  }

  if (!activeVideo.value || snippets.value.length === 0) {
    throw new Error(`No flow videos could be loaded for '${course.value.languageCode}'`)
  }
}

async function loadSpecificVideo(video: Video) {
  const nextSnippets = await getSnippetsOfVideo(video.languageCode, video.youtubeId)

  activeVideo.value = video
  snippets.value = nextSnippets
  currentSnippetIndex.value = 0
  playerError.value = ''
  await setExerciseDeck(0)
}

function playActiveVideo() {
  if (!player || !activeVideo.value) {
    return
  }

  player.loadVideoById({
    videoId: activeVideo.value.youtubeId,
    startSeconds: 0,
  })
  startTrackingPlayback()
}

async function queueRandomVideo() {
  await loadRandomVideo({ excludeVideoId: activeVideo.value?.youtubeId })
  playActiveVideo()
}

async function switchToVideo(video: Video) {
  if (video.youtubeId === activeVideo.value?.youtubeId) {
    return
  }

  try {
    await loadSpecificVideo(video)
    playActiveVideo()
  } catch (error) {
    console.error(`Failed to switch flow video '${video.youtubeId}':`, error)
    playerError.value = 'Unable to load the selected flow video.'
  }
}

async function loadInitialFlow() {
  if (!selectedLanguageCode) {
    await router.push({ name: 'target-language' })
    return
  }

  try {
    isLoading.value = true
    loadError.value = ''
    course.value = await getCourse(selectedLanguageCode)

    if (course.value.videos.length === 0) {
      loadError.value = 'This language does not have any videos yet.'
      return
    }

    await loadRandomVideo()
  } catch (error) {
    console.error('Failed to initialize flow mode:', error)
    loadError.value = 'Unable to load flow mode right now.'
  } finally {
    isLoading.value = false
  }
}

async function initializePlayer() {
  try {
    await loadYoutubeIframeApi()
    player = new window.YT!.Player(playerHostId, {
      videoId: activeVideo.value?.youtubeId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          playActiveVideo()
        },
        onStateChange: (event) => {
          if (event.data === window.YT!.PlayerState.PLAYING) {
            isPlayerActivelyPlaying = true
            startVideoWatchTracking()
          } else if (event.data === window.YT!.PlayerState.PAUSED ||
            event.data === window.YT!.PlayerState.ENDED) {
            stopVideoWatchTracking()
          }

          if (event.data === window.YT!.PlayerState.ENDED) {
            void queueRandomVideo()
          }
        },
        onError: () => {
          playerError.value = 'The selected YouTube video could not be played in flow mode.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize YouTube player:', error)
    playerError.value = 'Unable to initialize the embedded YouTube player.'
  }
}

function handleAllFlashcardsCompleted() {
  if (snippets.value.length === 0) {
    return
  }

  const nextExerciseSnippetIndex = Math.min(
    snippets.value.length - 1,
    Math.max(currentSnippetIndex.value, activeExerciseSnippetIndex.value + 1),
  )

  void setExerciseDeck(nextExerciseSnippetIndex)
}

async function handleSingleFlashcardRated(flashcard: Flashcard, rating: Rating) {
  const updatedFlashcard = await applyRating(flashcard.cardId, rating, new Date())
  Object.assign(flashcard, updatedFlashcard)
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(selectedLanguageCode, new Date())
}

onMounted(async () => {
  await loadInitialFlow()

  if (hasSnippets.value) {
    await initializePlayer()
  }
})

onBeforeUnmount(() => {
  clearSnippetTimer()
  stopVideoWatchTracking()
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="mx-auto w-full p-4">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="activeVideo && currentSnippet" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section>
          <FlashCardsWrapper
            :key="flashcardDeckKey"
            :flashcards="currentFlashcards"
            @all-flashcards-completed="handleAllFlashcardsCompleted"
            @flashcard-revealed="handleFlashcardRevealed"
            @single-flashcard-rated="handleSingleFlashcardRated"
          />
        </section>

        <section class="space-y-4">
          <div v-if="playerError" class="alert alert-error">
            <span>{{ playerError }}</span>
          </div>

          <div class="overflow-hidden rounded-xl bg-black">
            <div class="aspect-video w-full" :id="playerHostId"></div>
          </div>
        </section>
      </div>

      <section v-if="hasMultipleVideos" class="space-y-3">

        <div class="flex flex-wrap items-start justify-center gap-3">
          <button
            type="button"
            class="w-24 text-left md:w-28"
            :class="previousVideo ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'"
            :disabled="!previousVideo"
            aria-label="Previous video"
            @click="previousVideo && switchToVideo(previousVideo)"
          >
            <div class="space-y-1 rounded-xl border border-base-300 p-2 transition-all duration-200 hover:border-primary/60 hover:bg-base-200/60">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Previous</p>
              <div class="overflow-hidden rounded-lg bg-base-200">
                <img
                  v-if="previousVideo"
                  :src="`https://img.youtube.com/vi/${previousVideo.youtubeId}/mqdefault.jpg`"
                  :alt="`Previous flow video ${previousVideo.youtubeId}`"
                  class="aspect-video w-full object-cover"
                />
                <div v-else class="aspect-video w-full bg-base-200"></div>
              </div>
            </div>
          </button>

          <div class="w-24 rounded-xl border border-primary bg-base-200/60 p-2 md:w-28">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Current</p>
            <div class="mt-1 overflow-hidden rounded-lg">
              <img
                :src="`https://img.youtube.com/vi/${activeVideo.youtubeId}/mqdefault.jpg`"
                :alt="`Current flow video ${activeVideo.youtubeId}`"
                class="aspect-video w-full object-cover"
              />
            </div>
          </div>

          <button
            type="button"
            class="w-24 text-left md:w-28"
            :class="nextVideo ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'"
            :disabled="!nextVideo"
            aria-label="Next video"
            @click="nextVideo && switchToVideo(nextVideo)"
          >
            <div class="space-y-1 rounded-xl border border-base-300 p-2 transition-all duration-200 hover:border-primary/60 hover:bg-base-200/60">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">Next</p>
              <div class="overflow-hidden rounded-lg bg-base-200">
                <img
                  v-if="nextVideo"
                  :src="`https://img.youtube.com/vi/${nextVideo.youtubeId}/mqdefault.jpg`"
                  :alt="`Next flow video ${nextVideo.youtubeId}`"
                  class="aspect-video w-full object-cover"
                />
                <div v-else class="aspect-video w-full bg-base-200"></div>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
