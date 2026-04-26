<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Rating } from 'ts-fsrs'
import { useRoute, useRouter } from 'vue-router'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import { getCourse, getVideoById } from '@/entities/course/course'
import { pickRandomVideo } from '@/entities/course/course'
import type { Flashcard } from '@/entities/flashcard/flashcard'
import { applyRating, getOrCreateCardsForWords } from '@/entities/flashcard/flashcardStore'
import { getSnippet, getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import { recordFlashcardFlip } from '@/features/device-stats/deviceStatsStorage'
import FlashCardsWrapper from '@/features/flashcard-review/FlashCardsWrapper.vue'
import { getFlashcardWordsForSnippet } from '@/features/snippet-flashcard-session/snippetFlashcardSession'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'

import WatchSnippet from './WatchSnippet.vue'

const route = useRoute()
const router = useRouter()

const snippet = ref<Snippet | null>(null)
const flashcards = ref<Flashcard[]>([])
const isLearnMode = ref(true)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const snippetCount = ref(0)
const snippets = ref<Snippet[]>([])
const progressUpdatedAt = ref(0)

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

onMounted(async () => {
  if (!languageCode) {
    loadError.value = 'Choose a target language first.'
    isLoading.value = false
    return
  }

  try {
    const video = await getVideoById(languageCode, videoId.value)
    if (!video) {
      loadError.value = 'This video could not be found.'
      return
    }

    snippets.value = await getSnippetsOfVideo(languageCode, videoId.value)
    snippetCount.value = snippets.value.length
    if (snippetIndex.value >= snippets.value.length) {
      loadError.value = 'This snippet could not be found.'
      return
    }

    snippet.value = await getSnippet(languageCode, videoId.value, snippetIndex.value)
    flashcards.value = await getOrCreateCardsForWords(
      languageCode,
      await getFlashcardWordsForSnippet(languageCode, videoId.value, snippetIndex.value),
    )
    isLearnMode.value = true
  } catch (error) {
    console.error('Failed to load snippet:', error)
    loadError.value = 'Unable to load this snippet right now.'
  } finally {
    isLoading.value = false
  }
})

const handleAllFlashcardsCompleted = () => {
  isLearnMode.value = false
}

async function handleSingleFlashcardRated(flashcard: Flashcard, rating: Rating) {
  const updatedFlashcard = await applyRating(flashcard.cardId, rating, new Date())
  Object.assign(flashcard, updatedFlashcard)
  progressUpdatedAt.value = Date.now()
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(languageCode, new Date())
}

async function openRandomNextVideo() {
  const course = await getCourse(languageCode)
  const nextVideo = pickRandomVideo(course, videoId.value)

  await router.push({
    name: 'video-snippet-practice' as const,
    params: { videoId: nextVideo.youtubeId },
  })
}
</script>

<template>
  <VideoPracticeLayout active-mode="snippet" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error mb-4">
      <span>{{ loadError }}</span>
    </div>

    <div v-if="snippet" class="space-y-4">
      <div v-if="isLearnMode && !isLoading">
        <FlashCardsWrapper :flashcards="flashcards" @all-flashcards-completed="handleAllFlashcardsCompleted"
          @flashcard-revealed="handleFlashcardRevealed" @single-flashcard-rated="handleSingleFlashcardRated" />
      </div>
      <WatchSnippet v-else-if="!isLoading" :video-id="videoId" :start="snippet.start" :duration="snippet.duration"
        :current-index="snippetIndex" :has-next-snippet="hasNextSnippet" :next-snippet-query="nextSnippetQuery"
        @study-again="isLearnMode = true" />

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
