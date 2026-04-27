<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type Rating } from 'ts-fsrs'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course } from '@/entities/course/course'
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

const route = useRoute()
const router = useRouter()

const languageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const promptEntries = shallowRef<FlashcardPromptEntry[]>([])
const savedCardsById = ref(new Map<string, Flashcard>())
const currentPrompt = ref<
  | { kind: 'introduction'; entry: FlashcardPromptEntry }
  | { kind: 'flashcard'; flashcard: Flashcard }
  | null
>(null)
const isLoading = ref(true)
const isResolvingPrompt = ref(false)
const loadError = ref<string | null>(null)
const snippets = shallowRef<Snippet[]>([])
const progressUpdatedAt = ref(0)
const lastShownCardId = ref<string | null>(null)
const videoId = computed(() => route.params.videoId as string)

async function resolveCurrentPrompt() {
  isResolvingPrompt.value = true

  try {
    const now = new Date()

    for (const entry of promptEntries.value) {
      const cardId = buildFlashcardId(languageCode, entry.word.original)
      if (cardId === lastShownCardId.value) {
        continue
      }

      const savedCard = savedCardsById.value.get(cardId)
      if (
        savedCard &&
        savedCard.due <= now
      ) {
        currentPrompt.value = { kind: 'flashcard', flashcard: savedCard }
        return
      }
    }

    for (const entry of promptEntries.value) {
      const cardId = buildFlashcardId(languageCode, entry.word.original)
      if (cardId === lastShownCardId.value) {
        continue
      }

      const savedCard = savedCardsById.value.get(cardId)
      if (!savedCard) {
        currentPrompt.value = { kind: 'introduction', entry }
        return
      }
    }

    currentPrompt.value = null
  } finally {
    isResolvingPrompt.value = false
  }
}

async function loadVideoVocabPractice() {
  if (!languageCode) {
    loadError.value = 'Choose a target language first.'
    isLoading.value = false
    return
  }

  try {
    course.value = await getCourse(languageCode)

    const video = await getVideoById(languageCode, videoId.value)
    if (!video) {
      loadError.value = 'This video could not be found.'
      return
    }

    const nextSnippets = await getSnippetsOfVideo(languageCode, videoId.value)
    snippets.value = nextSnippets
    promptEntries.value = buildFlashcardPromptEntries(
      nextSnippets.flatMap((snippet) => snippet.words),
    )
    const savedCards = await getSavedCardsForWords(
      languageCode,
      promptEntries.value.map((entry) => entry.word),
    )
    savedCardsById.value = new Map(
      savedCards.map((flashcard) => [flashcard.cardId, flashcard] as const),
    )
    lastShownCardId.value = null
    await resolveCurrentPrompt()
  } catch (error) {
    console.error('Failed to initialize vocab practice:', error)
    loadError.value = 'Unable to load vocab practice right now.'
  } finally {
    isLoading.value = false
  }
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(languageCode, new Date())
}

async function handleRememberIntroduction() {
  if (currentPrompt.value?.kind !== 'introduction') {
    return
  }

  const createdCard = await createCardForWord(languageCode, currentPrompt.value.entry.word)
  savedCardsById.value = new Map(savedCardsById.value).set(createdCard.cardId, createdCard)
  lastShownCardId.value = createdCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

async function handleFlashcardRated(rating: Rating) {
  if (currentPrompt.value?.kind !== 'flashcard') {
    return
  }

  const updatedCard = await applyRating(currentPrompt.value.flashcard.cardId, rating, new Date())
  savedCardsById.value = new Map(savedCardsById.value).set(updatedCard.cardId, updatedCard)
  lastShownCardId.value = updatedCard.cardId
  progressUpdatedAt.value = Date.now()
  await resolveCurrentPrompt()
}

async function openRandomNextVideo() {
  if (!course.value) {
    return
  }

  const nextVideo = pickRandomVideo(course.value, videoId.value)
  await router.push({
    name: 'video-vocab-practice',
    params: { videoId: nextVideo.youtubeId },
  })
}

onMounted(() => {
  void loadVideoVocabPractice()
})
</script>

<template>
  <VideoPracticeLayout active-mode="vocab" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else class="flex flex-1 flex-col gap-6">
      <div class="flex flex-1 items-center">
        <div class="flex min-h-[32rem] w-full flex-col items-center justify-center gap-6">
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

          <div v-else class="mx-auto w-full max-w-2xl">
            <IndexCard
              :rows="[
                { type: 'text', text: 'Done for now', size: 'auto' },
                { type: 'divider' },
                { type: 'text', text: 'No more eligible flashcards to review.', size: 'normal' },
              ]"
            />
          </div>
        </div>
      </div>

      <VideoVocabProgressBar
        :language-code="languageCode"
        :snippets="snippets"
        :updated-at="progressUpdatedAt"
      />

      <div class="flex flex-wrap justify-center gap-2">
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
