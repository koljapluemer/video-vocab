<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type Rating } from 'ts-fsrs'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course, type Video } from '@/entities/course/course'
import {
  buildFlashcardPromptEntries,
  type FlashcardPromptEntry,
} from '@/entities/flashcard/flashcardPromptEntry'
import {
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
} from '@/entities/flashcard/flashcardStore'
import { buildFlashcardId, type Flashcard } from '@/entities/flashcard/flashcard'
import { getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import {
  recordFlashcardFlip,
  recordVideoWatchSlice,
} from '@/features/device-stats/deviceStatsStorage'
import FlashcardIntroductionCard from '@/features/flashcard-review/FlashcardIntroductionCard.vue'
import FlashCard from '@/features/flashcard-review/FlashCard.vue'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'

import { getSnippetIndexForTime } from './getSnippetIndexForTime'

const route = useRoute()
const router = useRouter()

const selectedLanguageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const activeVideo = ref<Video | null>(null)
const snippets = shallowRef<Snippet[]>([])
const isLoading = ref(true)
const loadError = ref('')
const playerError = ref('')
const isResolvingPrompt = ref(false)
const progressUpdatedAt = ref(0)
const playerHostId = `flow-player-${Math.random().toString(36).slice(2)}`

type ParallelPracticePrompt =
  | { kind: 'introduction'; entry: FlashcardPromptEntry }
  | { kind: 'flashcard'; flashcard: Flashcard }
  | { kind: 'waiting' }

const currentPrompt = ref<ParallelPracticePrompt | null>(null)
const lastShownCardId = ref<string | null>(null)

let player: YT.Player | null = null
let videoWatchTimer: number | null = null
let lastVideoWatchTickAt = Date.now()
let isPlayerActivelyPlaying = false

const videoId = computed(() => route.params.videoId as string)

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

function getCurrentPlaybackSnippetIndex() {
  const currentTimeSeconds =
    player && typeof player.getCurrentTime === 'function'
      ? player.getCurrentTime()
      : 0
  return getSnippetIndexForTime(snippets.value, currentTimeSeconds)
}

function pickRandomPrompt(promptEntries: ParallelPracticePrompt[]): ParallelPracticePrompt {
  return promptEntries[Math.floor(Math.random() * promptEntries.length)]!
}

async function resolveCurrentPrompt() {
  if (snippets.value.length === 0) {
    currentPrompt.value = { kind: 'waiting' }
    return
  }

  isResolvingPrompt.value = true

  try {
    const snippetIndex = getCurrentPlaybackSnippetIndex()
    const candidateEntries = buildFlashcardPromptEntries([
      ...(snippets.value[snippetIndex]?.words ?? []),
      ...(snippets.value[snippetIndex + 1]?.words ?? []),
    ])
    const savedCards = await getSavedCardsForWords(
      selectedLanguageCode,
      candidateEntries.map((entry) => entry.word),
    )
    const savedCardsById = new Map(
      savedCards.map((flashcard) => [flashcard.cardId, flashcard] as const),
    )
    const now = new Date()
    const eligiblePrompts: ParallelPracticePrompt[] = []

    for (const entry of candidateEntries) {
      const cardId = buildFlashcardId(selectedLanguageCode, entry.word.original)
      if (cardId === lastShownCardId.value) {
        continue
      }

      const savedCard = savedCardsById.get(cardId)
      if (!savedCard) {
        eligiblePrompts.push({ kind: 'introduction', entry })
        continue
      }

      if (savedCard.due <= now) {
        eligiblePrompts.push({ kind: 'flashcard', flashcard: savedCard })
      }
    }

    currentPrompt.value =
      eligiblePrompts.length > 0
        ? pickRandomPrompt(eligiblePrompts)
        : { kind: 'waiting' }
  } finally {
    isResolvingPrompt.value = false
  }
}

async function loadSpecificVideo(courseVideo: Video) {
  const nextSnippets = await getSnippetsOfVideo(courseVideo.languageCode, courseVideo.youtubeId)

  activeVideo.value = courseVideo
  snippets.value = nextSnippets
  playerError.value = ''
  lastShownCardId.value = null
  currentPrompt.value = null
  await resolveCurrentPrompt()
}

function playActiveVideo() {
  if (!player || !activeVideo.value) {
    return
  }

  player.loadVideoById({
    videoId: activeVideo.value.youtubeId,
    startSeconds: 0,
  })
}

async function openRandomNextVideo() {
  if (!course.value) {
    return
  }

  const nextVideo = pickRandomVideo(course.value, activeVideo.value?.youtubeId)
  await router.push({
    name: 'video-practice',
    params: { videoId: nextVideo.youtubeId, practiceMode: 'parallel' },
  })
}

async function loadCurrentParallelPractice() {
  if (!selectedLanguageCode) {
    await router.push({ name: 'target-language' })
    return
  }

  try {
    isLoading.value = true
    loadError.value = ''
    course.value = await getCourse(selectedLanguageCode)

    const requestedVideo = await getVideoById(selectedLanguageCode, videoId.value)
    if (!requestedVideo) {
      loadError.value = 'This video could not be found.'
      return
    }

    await loadSpecificVideo(requestedVideo)
  } catch (error) {
    console.error('Failed to initialize parallel practice:', error)
    loadError.value = 'Unable to load parallel practice right now.'
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
          } else if (
            event.data === window.YT!.PlayerState.PAUSED ||
            event.data === window.YT!.PlayerState.ENDED
          ) {
            stopVideoWatchTracking()
          }
        },
        onError: () => {
          playerError.value = 'The selected YouTube video could not be played in parallel practice.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize YouTube player:', error)
    playerError.value = 'Unable to initialize the embedded YouTube player.'
  }
}

async function handleRememberIntroduction() {
  if (currentPrompt.value?.kind !== 'introduction') {
    return
  }

  const createdCard = await createCardForWord(selectedLanguageCode, currentPrompt.value.entry.word)
  lastShownCardId.value = createdCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

async function handleFlashcardRated(rating: Rating) {
  if (currentPrompt.value?.kind !== 'flashcard') {
    return
  }

  const updatedCard = await applyRating(currentPrompt.value.flashcard.cardId, rating, new Date())
  lastShownCardId.value = updatedCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(selectedLanguageCode, new Date())
}

onMounted(async () => {
  await loadCurrentParallelPractice()

  if (activeVideo.value && currentPrompt.value) {
    await initializePlayer()
  }
})

onBeforeUnmount(() => {
  stopVideoWatchTracking()
  player?.destroy()
  player = null
})
</script>

<template>
  <VideoPracticeLayout active-mode="parallel" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="activeVideo && currentPrompt" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section>
          <div class="flex min-h-[32rem] w-full flex-col items-center justify-center gap-6">
            <span v-if="isResolvingPrompt" class="loading loading-spinner loading-lg"></span>

            <FlashcardIntroductionCard
              v-else-if="currentPrompt.kind === 'introduction'"
              :word="currentPrompt.entry.word"
              @remember="handleRememberIntroduction"
            />

            <FlashCard
              v-else-if="currentPrompt.kind === 'flashcard'"
              :flashcard="currentPrompt.flashcard"
              @flashcard-revealed="handleFlashcardRevealed"
              @single-flashcard-rated="handleFlashcardRated"
            />

            <div v-else class="mx-auto w-full max-w-2xl space-y-6">
              <IndexCard
                :rows="[
                  { type: 'text', text: 'Keep watching', size: 'auto' },
                  { type: 'divider' },
                  { type: 'text', text: 'No eligible card in the current snippet window.', size: 'normal' },
                ]"
                fill
              />

              <div class="flex justify-center">
                <button type="button" class="btn" @click="resolveCurrentPrompt()">
                  Check Current Moment
                </button>
              </div>
            </div>
          </div>
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

      <VideoVocabProgressBar
        :language-code="selectedLanguageCode"
        :snippets="snippets"
        :updated-at="progressUpdatedAt"
      />

      <div class="flex justify-center gap-2">

        <router-link :to="{ name: 'video-list' }" class="btn">
          Back to Video Overview
        </router-link>
        <button type="button" class="btn" @click="openRandomNextVideo">
          Switch Video
        </button>
      </div>

    </div>
  </VideoPracticeLayout>
</template>
