<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Snippet, Flashcard } from '@/shared/types/domainTypes'
import { getSnippet, getFlashcardsForSnippet } from '@/modules/spacedRepetitionLearning/api'
import FlashCardsWrapper from '@/modules/viewFlashcard/FlashCardsWrapper.vue'
import WatchSnippet from './WatchSnippet.vue'

const route = useRoute()
const router = useRouter()

const snippet = ref<Snippet | null>(null)
const flashcards = ref<Flashcard[]>([])
const isLearnMode = ref(true)
const videoId = route.params.videoId as string
const snippetIndex = parseInt(route.params.index as string)

onMounted(async () => {
  try {
    snippet.value = await getSnippet(videoId, snippetIndex)
    flashcards.value = await getFlashcardsForSnippet(videoId, snippetIndex)
  } catch (error) {
    console.error('Failed to load snippet:', error)
  }
})

const goBackToVideo = () => {
  router.push(`/video/${videoId}`)
}

const handleAllFlashcardsCompleted = () => {
  isLearnMode.value = false
}

const handleSingleFlashcardRated = (flashcard: Flashcard, rating: number) => {
  // TODO: Update flashcard state in database
  console.log('Flashcard rated:', flashcard, rating)
}
</script>

<template>
  <div class="container mx-auto p-4">
    <div v-if="snippet" class="space-y-4">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Snippet Details</h2>
          <div class="space-y-2">
            <p><span class="font-semibold">Start Time:</span> {{ snippet.start }}s</p>
            <p><span class="font-semibold">Duration:</span> {{ snippet.duration }}s</p>
          </div>
          <div class="card-actions justify-end mt-4">
            <button class="btn btn-primary" @click="goBackToVideo">
              Back to Video
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLearnMode">
        <FlashCardsWrapper
          :flashcards="flashcards"
          @single-flashcard-rated="handleSingleFlashcardRated"
          @all-flashcards-completed="handleAllFlashcardsCompleted"
        />
      </div>
      <WatchSnippet v-else />
    </div>
    <div v-else class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>
