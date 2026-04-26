<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course } from '@/entities/course/course'
import { recordFlashcardFlip } from '@/features/device-stats/deviceStatsStorage'
import FlashCardsWrapper from '@/features/flashcard-review/FlashCardsWrapper.vue'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'

import { useVideoVocabPractice } from './useVideoVocabPractice'
import VocabIntroductionCard from './VocabIntroductionCard.vue'

const route = useRoute()
const router = useRouter()

const languageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const videoId = computed(() => route.params.videoId as string)
const {
  currentIntroduction,
  dueReviewFlashcards,
  isSavingIntroduction,
  load,
  progressUpdatedAt,
  rateFlashcard,
  rememberCurrentIntroduction,
  reviewDeckKey,
  snippets,
} = useVideoVocabPractice(languageCode)

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

    await load(videoId.value)
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

    <div v-else class="space-y-6">
      <VocabIntroductionCard
        v-if="currentIntroduction"
        :word="currentIntroduction.word"
        :occurrences="currentIntroduction.occurrences"
        @remember="rememberCurrentIntroduction"
      />

      <div v-else>
        <FlashCardsWrapper
          :key="reviewDeckKey"
          :flashcards="dueReviewFlashcards"
          @flashcard-revealed="handleFlashcardRevealed"
          @single-flashcard-rated="rateFlashcard"
        />
      </div>

      <div v-if="isSavingIntroduction" class="flex justify-center">
        <span class="loading loading-spinner loading-md"></span>
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
