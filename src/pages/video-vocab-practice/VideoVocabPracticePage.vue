<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course } from '@/entities/course/course'
import { getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import { buildVideoVocabEntries } from '@/entities/video/videoVocab'
import { recordFlashcardFlip } from '@/features/device-stats/deviceStatsStorage'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'
import VideoVocabProgressBar from '@/features/video-vocab-progress/VideoVocabProgressBar.vue'
import FlashcardPracticeSession from '@/meta/flashcard-practice-session/FlashcardPracticeSession.vue'
import type { FlashcardPracticeEntry } from '@/meta/flashcard-practice-session/flashcardPracticeEntries'

const route = useRoute()
const router = useRouter()

const languageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const practiceEntries = ref<FlashcardPracticeEntry[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const snippets = ref<Snippet[]>([])
const progressUpdatedAt = ref(0)
const videoId = computed(() => route.params.videoId as string)

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
    practiceEntries.value = buildVideoVocabEntries(nextSnippets)
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

    <div v-else class="flex flex-1 flex-col gap-6">
      <div class="flex flex-1 items-center">
        <FlashcardPracticeSession
          :entries="practiceEntries"
          :language-code="languageCode"
          :session-key="videoId"
          @flashcard-revealed="handleFlashcardRevealed"
          @progress-updated="progressUpdatedAt = $event"
        >
          <template #empty>
            <div class="mx-auto w-full max-w-2xl">
              <IndexCard
                :rows="[
                  { type: 'text', text: 'Done for now', size: 'auto' },
                  { type: 'divider' },
                  { type: 'text', text: 'No more flashcards to review.', size: 'normal' },
                ]"
              />
            </div>
          </template>
        </FlashcardPracticeSession>
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
