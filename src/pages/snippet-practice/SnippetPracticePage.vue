<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type Rating } from 'ts-fsrs'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import { getCourse, getVideoById } from '@/entities/course/course'
import { pickRandomVideo } from '@/entities/course/course'
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
import { recordFlashcardFlip } from '@/features/device-stats/deviceStatsStorage'
import FlashCard from '@/features/flashcard-review/FlashCard.vue'
import FlashcardIntroductionCard from '@/features/flashcard-review/FlashcardIntroductionCard.vue'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'

import WatchSnippet from './WatchSnippet.vue'

const route = useRoute()
const router = useRouter()

const snippet = ref<Snippet | null>(null)
const currentPrompt = ref<
  | { kind: 'introduction'; entry: FlashcardPromptEntry }
  | { kind: 'flashcard'; flashcard: Flashcard }
  | null
>(null)
const isLoading = ref(true)
const isResolvingPrompt = ref(false)
const loadError = ref<string | null>(null)
const snippetCount = ref(0)
const snippets = shallowRef<Snippet[]>([])
const progressUpdatedAt = ref(0)
const lastShownCardId = ref<string | null>(null)
let latestLoadRequestId = 0

const languageCode = getStoredTargetLanguage() ?? ''
const videoId = computed(() => route.params.videoId as string)
const snippetIndex = computed(() => {
  const value = Number(route.query.snippet ?? 0)

  if (!Number.isInteger(value) || value < 0) {
    return 0
  }

  return value
})
const hasNextSnippet = computed(() => snippetIndex.value < snippetCount.value - 1)
const nextSnippetQuery = computed(() => ({ snippet: String(snippetIndex.value + 1) }))

function pickRandomPrompt(
  prompts: Array<
    | { kind: 'introduction'; entry: FlashcardPromptEntry }
    | { kind: 'flashcard'; flashcard: Flashcard }
  >,
) {
  return prompts[Math.floor(Math.random() * prompts.length)]!
}

async function resolveCurrentPrompt(
  activeSnippet: Snippet | null = snippet.value,
  excludedCardId: string | null = lastShownCardId.value,
  loadRequestId?: number,
) {
  if (!activeSnippet) {
    currentPrompt.value = null
    return
  }

  isResolvingPrompt.value = true

  try {
    const candidateEntries = buildFlashcardPromptEntries(activeSnippet.words)
    const savedCards = await getSavedCardsForWords(
      languageCode,
      candidateEntries.map((entry) => entry.word),
    )
    const savedCardsById = new Map(
      savedCards.map((flashcard) => [flashcard.cardId, flashcard] as const),
    )
    const now = new Date()
    const eligiblePrompts: Array<
      | { kind: 'introduction'; entry: FlashcardPromptEntry }
      | { kind: 'flashcard'; flashcard: Flashcard }
    > = []

    for (const entry of candidateEntries) {
      const cardId = buildFlashcardId(languageCode, entry.word.original)
      if (cardId === excludedCardId) {
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

    if (loadRequestId !== undefined && loadRequestId !== latestLoadRequestId) {
      return
    }

    currentPrompt.value = eligiblePrompts.length > 0 ? pickRandomPrompt(eligiblePrompts) : null
  } finally {
    isResolvingPrompt.value = false
  }
}

async function loadSnippetPractice() {
  const loadRequestId = ++latestLoadRequestId

  if (!languageCode) {
    loadError.value = 'Choose a target language first.'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    loadError.value = null
    snippet.value = null
    currentPrompt.value = null
    snippetCount.value = 0

    const video = await getVideoById(languageCode, videoId.value)
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    if (!video) {
      loadError.value = 'This video could not be found.'
      return
    }

    const nextSnippets = await getSnippetsOfVideo(languageCode, videoId.value)
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    snippets.value = nextSnippets
    snippetCount.value = nextSnippets.length
    if (snippetIndex.value >= nextSnippets.length) {
      loadError.value = 'This snippet could not be found.'
      return
    }

    const activeSnippet = nextSnippets[snippetIndex.value] ?? null
    snippet.value = activeSnippet
    lastShownCardId.value = null
    await resolveCurrentPrompt(activeSnippet, null, loadRequestId)
  } catch (error) {
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    console.error('Failed to load snippet:', error)
    loadError.value = 'Unable to load this snippet right now.'
  } finally {
    if (loadRequestId === latestLoadRequestId) {
      isLoading.value = false
    }
  }
}

async function handleRememberIntroduction() {
  if (currentPrompt.value?.kind !== 'introduction') {
    return
  }

  const createdCard = await createCardForWord(languageCode, currentPrompt.value.entry.word)
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
  recordFlashcardFlip(languageCode, new Date())
}

function handleStudyAgain() {
  lastShownCardId.value = null
  void resolveCurrentPrompt()
}

async function openRandomNextVideo() {
  const course = await getCourse(languageCode)
  const nextVideo = pickRandomVideo(course, videoId.value)

  await router.push({
    name: 'video-snippet-practice' as const,
    params: { videoId: nextVideo.youtubeId },
  })
}

watch(
  () => [videoId.value, snippetIndex.value] as const,
  () => {
    void loadSnippetPractice()
  },
  { immediate: true },
)
</script>

<template>
  <VideoPracticeLayout active-mode="snippet" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error mb-4">
      <span>{{ loadError }}</span>
    </div>

    <div v-if="snippet" class="space-y-4">
      <div v-if="currentPrompt || isResolvingPrompt" class="flex min-h-[32rem] items-center">
        <div class="flex w-full flex-col items-center justify-center gap-6">
          <span v-if="isResolvingPrompt" class="loading loading-spinner loading-lg"></span>

          <FlashcardIntroductionCard
            v-else-if="currentPrompt?.kind === 'introduction'"
            :word="currentPrompt.entry.word"
            @remember="handleRememberIntroduction"
          />

          <FlashCard
            v-else-if="currentPrompt?.kind === 'flashcard'"
            :flashcard="currentPrompt.flashcard"
            @flashcard-revealed="handleFlashcardRevealed"
            @single-flashcard-rated="handleFlashcardRated"
          />
        </div>
      </div>
      <WatchSnippet
        v-else-if="!isLoading"
        :video-id="videoId"
        :start="snippet.start"
        :duration="snippet.duration"
        :has-next-snippet="hasNextSnippet"
        :next-snippet-query="nextSnippetQuery"
        @study-again="handleStudyAgain"
      />

      <VideoVocabProgressBar
        :language-code="languageCode"
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
    <div v-else-if="isLoading" class="flex h-64 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </VideoPracticeLayout>
</template>
