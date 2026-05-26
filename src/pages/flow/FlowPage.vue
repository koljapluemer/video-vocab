<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Rating } from 'ts-fsrs'
import { useRoute, useRouter } from 'vue-router'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import type { VideoPracticeMode } from '@/dumb/videoPracticeMode'
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course, type Video } from '@/entities/course/course'
import { applyRating, createCardForWord } from '@/entities/flashcard/flashcardStore'
import { getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import {
  recordFlashcardFlip,
  recordVideoWatchSlice,
} from '@/features/device-stats/deviceStatsStorage'
import FlashCard from '@/features/flashcard-review/FlashCard.vue'
import FlashcardIntroductionCard from '@/features/flashcard-review/FlashcardIntroductionCard.vue'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import { loadYoutubeIframeApi } from '@/features/video-embed/loadYoutubeIframeApi'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'

import CustomPracticeOverlay, { type CustomPracticeQueueItem } from './CustomPracticeOverlay.vue'
import {
  buildPromptCardId,
  getSnippetWindowEligiblePrompts,
  pickRandomPrompt,
  pickWholeVideoDueSeenPrompt,
  type FlowPracticePrompt,
} from './flowPracticePrompt'
import { getSnippetIndexForTime } from './getSnippetIndexForTime'

const CUSTOM_QUEUE_LIMIT = 6
const CUSTOM_SPAWN_MIN_DELAY_MS = 2_000
const CUSTOM_SPAWN_MAX_DELAY_MS = 5_000
const WHOLE_VIDEO_DUE_SEEN_PROMPT_CHANCE = 0.2

const route = useRoute()
const router = useRouter()

const selectedLanguageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const activeVideo = ref<Video | null>(null)
const snippets = shallowRef<Snippet[]>([])
const isLoading = ref(true)
const loadError = ref('')
const practiceError = ref('')
const playerError = ref('')
const isResolvingPrompt = ref(false)
const progressUpdatedAt = ref(0)
const currentPrompt = ref<FlowPracticePrompt | null>(null)
const customQueue = ref<CustomPracticeQueueItem[]>([])
const lastShownCardId = ref<string | null>(null)
const playerHostId = `flow-player-${Math.random().toString(36).slice(2)}`

let customQueueId = 0
let player: YT.Player | null = null
let videoWatchTimer: number | null = null
let customSpawnTimer: number | null = null
let lastVideoWatchTickAt = Date.now()
let isPlayerActivelyPlaying = false

const videoId = computed(() => route.params.videoId as string)
const activeMode = computed(() => route.params.practiceMode as VideoPracticeMode)
const isCustomMode = computed(() => activeMode.value === 'custom')

function clearVideoWatchTimer() {
  if (videoWatchTimer !== null) {
    window.clearInterval(videoWatchTimer)
    videoWatchTimer = null
  }
}

function clearCustomSpawnTimer() {
  if (customSpawnTimer !== null) {
    window.clearTimeout(customSpawnTimer)
    customSpawnTimer = null
  }
}

function stopVideoWatchTracking() {
  isPlayerActivelyPlaying = false
  clearVideoWatchTimer()
  clearCustomSpawnTimer()
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

function nextCustomSpawnDelay() {
  return (
    CUSTOM_SPAWN_MIN_DELAY_MS +
    Math.floor(Math.random() * (CUSTOM_SPAWN_MAX_DELAY_MS - CUSTOM_SPAWN_MIN_DELAY_MS + 1))
  )
}

function updateCustomQueueItem(
  queueId: string,
  updater: (item: CustomPracticeQueueItem) => CustomPracticeQueueItem,
) {
  customQueue.value = customQueue.value.map((item) => (item.queueId === queueId ? updater(item) : item))
}

function removeCustomQueueItem(queueId: string) {
  customQueue.value = customQueue.value.filter((item) => item.queueId !== queueId)
  scheduleCustomSpawn()
}

function buildExcludedCustomCardIds(): string[] {
  const excludedCardIds = customQueue.value.map((item) =>
    buildPromptCardId(selectedLanguageCode, item.prompt),
  )

  if (lastShownCardId.value) {
    excludedCardIds.push(lastShownCardId.value)
  }

  return excludedCardIds
}

function shouldSpawnCustomQueueItem() {
  return (
    isCustomMode.value &&
    !loadError.value &&
    !!activeVideo.value &&
    isPlayerActivelyPlaying &&
    !document.hidden &&
    customQueue.value.length < CUSTOM_QUEUE_LIMIT
  )
}

async function pickCustomPrompt() {
  if (snippets.value.length === 0) {
    return null
  }

  const eligiblePrompts = await getSnippetWindowEligiblePrompts({
    languageCode: selectedLanguageCode,
    snippets: snippets.value,
    snippetIndex: getCurrentPlaybackSnippetIndex(),
    excludedCardIds: buildExcludedCustomCardIds(),
  })

  return eligiblePrompts.length > 0 ? pickRandomPrompt(eligiblePrompts) : null
}

async function spawnCustomQueueItem() {
  if (!shouldSpawnCustomQueueItem()) {
    return
  }

  const prompt = await pickCustomPrompt()
  if (!prompt) {
    return
  }

  customQueue.value = [
    ...customQueue.value,
    {
      queueId: `custom-queue-${customQueueId++}`,
      prompt,
      revealed: false,
      isSubmitting: false,
    },
  ]
}

async function runCustomSpawnCycle() {
  customSpawnTimer = null

  if (!shouldSpawnCustomQueueItem()) {
    return
  }

  await spawnCustomQueueItem()
  scheduleCustomSpawn()
}

function scheduleCustomSpawn() {
  clearCustomSpawnTimer()

  if (!shouldSpawnCustomQueueItem()) {
    return
  }

  customSpawnTimer = window.setTimeout(() => {
    void runCustomSpawnCycle()
  }, nextCustomSpawnDelay())
}

async function resolveCurrentPrompt() {
  if (snippets.value.length === 0) {
    currentPrompt.value = { kind: 'waiting' }
    return
  }

  isResolvingPrompt.value = true

  try {
    const now = new Date()
    const excludedCardIds = lastShownCardId.value ? [lastShownCardId.value] : []

    if (Math.random() < WHOLE_VIDEO_DUE_SEEN_PROMPT_CHANCE) {
      const wholeVideoPrompt = await pickWholeVideoDueSeenPrompt({
        languageCode: selectedLanguageCode,
        snippets: snippets.value,
        excludedCardIds,
        now,
      })
      if (wholeVideoPrompt) {
        currentPrompt.value = wholeVideoPrompt
        return
      }
    }

    const eligiblePrompts = await getSnippetWindowEligiblePrompts({
      languageCode: selectedLanguageCode,
      snippets: snippets.value,
      snippetIndex: getCurrentPlaybackSnippetIndex(),
      excludedCardIds,
      now,
    })

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
  practiceError.value = ''
  lastShownCardId.value = null
  currentPrompt.value = null
  customQueue.value = []
  clearCustomSpawnTimer()

  if (!isCustomMode.value) {
    await resolveCurrentPrompt()
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
}

async function openRandomNextVideo() {
  if (!course.value) {
    return
  }

  const nextVideo = pickRandomVideo(course.value, activeVideo.value?.youtubeId)
  await router.push({
    name: 'video-practice',
    params: { videoId: nextVideo.youtubeId, practiceMode: activeMode.value },
  })
}

async function loadCurrentPractice() {
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
    console.error('Failed to initialize video practice:', error)
    loadError.value = 'Unable to load video practice right now.'
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
            scheduleCustomSpawn()
            return
          }

          stopVideoWatchTracking()
        },
        onError: () => {
          playerError.value = 'The selected YouTube video could not be played in this mode.'
        },
      },
    })
  } catch (error) {
    console.error('Failed to initialize YouTube player:', error)
    playerError.value = 'Unable to initialize the embedded YouTube player.'
  }
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(selectedLanguageCode, new Date())
}

async function handleRememberIntroduction() {
  if (currentPrompt.value?.kind !== 'introduction') {
    return
  }

  practiceError.value = ''
  const createdCard = await createCardForWord(selectedLanguageCode, currentPrompt.value.entry.word)
  lastShownCardId.value = createdCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

async function handleFlashcardRated(rating: Rating) {
  if (currentPrompt.value?.kind !== 'flashcard') {
    return
  }

  practiceError.value = ''
  const updatedCard = await applyRating(currentPrompt.value.flashcard.cardId, rating, new Date())
  lastShownCardId.value = updatedCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

function handleCustomReveal(queueId: string) {
  const queueItem = customQueue.value.find((item) => item.queueId === queueId)
  if (!queueItem || queueItem.revealed || queueItem.isSubmitting) {
    return
  }

  updateCustomQueueItem(queueId, (item) => ({ ...item, revealed: true }))
  recordFlashcardFlip(selectedLanguageCode, new Date())
}

async function handleCustomRemember(queueId: string) {
  const queueItem = customQueue.value.find((item) => item.queueId === queueId)
  if (!queueItem || queueItem.prompt.kind !== 'introduction' || queueItem.isSubmitting) {
    return
  }

  practiceError.value = ''
  updateCustomQueueItem(queueId, (item) => ({ ...item, isSubmitting: true }))

  try {
    const createdCard = await createCardForWord(selectedLanguageCode, queueItem.prompt.entry.word)
    lastShownCardId.value = createdCard.cardId
    progressUpdatedAt.value = Date.now()
    removeCustomQueueItem(queueId)
  } catch (error) {
    console.error('Failed to save custom practice card:', error)
    practiceError.value = 'Unable to save this card right now.'
    updateCustomQueueItem(queueId, (item) => ({ ...item, isSubmitting: false }))
  }
}

async function handleCustomRated(queueId: string, rating: Rating) {
  const queueItem = customQueue.value.find((item) => item.queueId === queueId)
  if (!queueItem || queueItem.prompt.kind !== 'flashcard' || queueItem.isSubmitting) {
    return
  }

  practiceError.value = ''
  updateCustomQueueItem(queueId, (item) => ({ ...item, isSubmitting: true }))

  try {
    const updatedCard = await applyRating(queueItem.prompt.flashcard.cardId, rating, new Date())
    lastShownCardId.value = updatedCard.cardId
    progressUpdatedAt.value = Date.now()
    removeCustomQueueItem(queueId)
  } catch (error) {
    console.error('Failed to rate custom practice card:', error)
    practiceError.value = 'Unable to update this card right now.'
    updateCustomQueueItem(queueId, (item) => ({ ...item, isSubmitting: false }))
  }
}

function handleDocumentVisibilityChange() {
  if (document.hidden) {
    clearCustomSpawnTimer()
    return
  }

  scheduleCustomSpawn()
}

onMounted(async () => {
  document.addEventListener('visibilitychange', handleDocumentVisibilityChange)
  await loadCurrentPractice()

  if (activeVideo.value) {
    await initializePlayer()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleDocumentVisibilityChange)
  stopVideoWatchTracking()
  player?.destroy()
  player = null
})
</script>

<template>
  <VideoPracticeLayout :active-mode="activeMode" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="activeVideo" :class="isCustomMode ? '' : 'space-y-6'">
      <div v-if="practiceError" class="alert alert-error">
        <span>{{ practiceError }}</span>
      </div>

      <template v-if="isCustomMode">
        <div class="space-y-4">
          <div v-if="playerError" class="alert alert-error">
            <span>{{ playerError }}</span>
          </div>

          <section class="relative overflow-hidden rounded-xl bg-black shadow-xl">
            <div class="aspect-video w-full" :id="playerHostId"></div>
            <CustomPracticeOverlay
              :rows="customQueue"
              @reveal="handleCustomReveal"
              @remember="handleCustomRemember"
              @correct="handleCustomRated($event, Rating.Good)"
              @incorrect="handleCustomRated($event, Rating.Again)"
            />
          </section>
        </div>
      </template>

      <template v-else-if="currentPrompt">
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
      </template>
    </div>
  </VideoPracticeLayout>
</template>
