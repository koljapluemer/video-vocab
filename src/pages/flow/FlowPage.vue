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
      recordVideoWatchSlice(new Date(lastVideoWatchTickAt), new Date(now))
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

  const randomVideo = pickRandomVideo(course.value, options?.excludeVideoId)

  activeVideo.value = randomVideo
  snippets.value = await getSnippetsOfVideo(randomVideo.languageCode, randomVideo.youtubeId)
  currentSnippetIndex.value = 0

  if (currentFlashcards.value.length === 0) {
    await setExerciseDeck(0)
  }
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
  recordFlashcardFlip(new Date())
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

    <div v-else-if="activeVideo && currentSnippet" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
  </div>
</template>
