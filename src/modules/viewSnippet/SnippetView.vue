<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Snippet, Flashcard } from '@/shared/types/domainTypes'
import { getSnippet, getFlashcardsForSnippet } from '@/modules/spacedRepetitionLearning/api'
import { getVideoById } from '@/modules/spacedRepetitionLearning/exposeVideoList'
import FlashCardsWrapper from '@/modules/viewFlashcard/FlashCardsWrapper.vue'
import WatchSnippet from './WatchSnippet.vue'

const route = useRoute()

const snippet = ref<Snippet | null>(null)
const flashcards = ref<Flashcard[]>([])
const isLearnMode = ref(true)
const isLoading = ref(true)
const languageCode = route.params.languageCode as string
const videoId = route.params.videoId as string
const snippetIndex = parseInt(route.params.index as string)
const coverSubtitles = ref(false)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    console.info('Loading snippet and flashcards for:', { languageCode, videoId, snippetIndex })

    const video = await getVideoById(languageCode, videoId)
    if (!video) {
      loadError.value = `Video '${videoId}' was not found in course '${languageCode}'.`
      isLoading.value = false
      return
    }

    snippet.value = await getSnippet(languageCode, videoId, snippetIndex)
    flashcards.value = await getFlashcardsForSnippet(languageCode, videoId, snippetIndex)
    isLearnMode.value = true
    coverSubtitles.value = video.coverSubtitles
  } catch (error) {
    console.error('Failed to load snippet:', error)
    loadError.value = `Failed to load snippet ${snippetIndex} for '${languageCode}/${videoId}'.`
  } finally {
    isLoading.value = false
  }
})

const handleAllFlashcardsCompleted = () => {
  isLearnMode.value = false
}

const handleSingleFlashcardRated = (flashcard: Flashcard, rating: number) => {
  console.log('Flashcard rated:', flashcard, rating)
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
          @single-flashcard-rated="handleSingleFlashcardRated"
          @all-flashcards-completed="handleAllFlashcardsCompleted"
        />
      </div>
      <WatchSnippet
        v-else-if="!isLoading"
        :language-code="languageCode"
        :video-id="videoId"
        :start="snippet.start"
        :duration="snippet.duration"
        :current-index="snippetIndex"
        :cover-subtitles="coverSubtitles"
        @study-again="isLearnMode = true"
      />
    </div>
    <div v-else-if="isLoading" class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>
