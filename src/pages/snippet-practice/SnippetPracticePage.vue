<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Rating } from 'ts-fsrs'
import { useRoute } from 'vue-router'

import { applyRating, getOrCreateCardsForWords } from '@/entities/flashcard/flashcardStore'
import { getVideoById } from '@/entities/course/course'
import type { Flashcard } from '@/entities/flashcard/flashcard'
import { getSnippet, type Snippet } from '@/entities/snippet/snippet'
import { recordFlashcardFlip } from '@/features/device-stats/deviceStatsStorage'
import FlashCardsWrapper from '@/features/flashcard-review/FlashCardsWrapper.vue'
import { getFlashcardWordsForSnippet } from '@/features/snippet-flashcard-session/snippetFlashcardSession'

import WatchSnippet from './WatchSnippet.vue'

const route = useRoute()

const snippet = ref<Snippet | null>(null)
const flashcards = ref<Flashcard[]>([])
const isLearnMode = ref(true)
const isLoading = ref(true)
const languageCode = route.params.languageCode as string
const videoId = route.params.videoId as string
const snippetIndex = parseInt(route.params.index as string)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    const video = await getVideoById(languageCode, videoId)
    if (!video) {
      loadError.value = 'This video could not be found.'
      isLoading.value = false
      return
    }

    snippet.value = await getSnippet(languageCode, videoId, snippetIndex)
    flashcards.value = await getOrCreateCardsForWords(
      languageCode,
      await getFlashcardWordsForSnippet(languageCode, videoId, snippetIndex),
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
}

function handleFlashcardRevealed() {
  recordFlashcardFlip(languageCode, new Date())
}

</script>

<template>
  <div class="container mx-auto p-4">
    <div v-if="loadError" class="alert alert-error mb-4">
      <span>{{ loadError }}</span>
    </div>

    <div v-if="snippet" class="space-y-4">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Snippet Details</h2>
          <div class="space-y-2">
            <p><span class="font-semibold">Start Time:</span> {{ snippet.start }}s</p>
            <p><span class="font-semibold">Duration:</span> {{ snippet.duration }}s</p>
          </div>
          <div class="card-actions justify-end mt-4">
            <router-link
              :to="{ name: 'video', params: { languageCode, videoId } }"
              class="btn btn-primary"
            >
              Back to Video
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="isLearnMode && !isLoading">
        <FlashCardsWrapper
          :flashcards="flashcards"
          @all-flashcards-completed="handleAllFlashcardsCompleted"
          @flashcard-revealed="handleFlashcardRevealed"
          @single-flashcard-rated="handleSingleFlashcardRated"
        />
      </div>
      <WatchSnippet
        v-else-if="!isLoading"
        :language-code="languageCode"
        :video-id="videoId"
        :start="snippet.start"
        :duration="snippet.duration"
        :current-index="snippetIndex"
        @study-again="isLearnMode = true"
      />
    </div>
    <div v-else-if="isLoading" class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>
