<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import type { Snippet } from '@/entities/snippet/snippet'
import { getSavedCardsForWords } from '@/entities/flashcard/flashcardStore'

import {
  getUniqueVideoFlashcardWords,
  getVideoVocabProgressCounts,
  type VideoVocabProgressCounts,
} from './videoVocabProgress'

const props = defineProps<{
  languageCode: string
  snippets: Snippet[]
  updatedAt?: number
}>()

const isLoading = ref(true)
const counts = ref<VideoVocabProgressCounts>({
  seenNotDue: 0,
  seenDue: 0,
  notPracticedYet: 0,
  total: 0,
})

const progressSegments = computed(() => {
  if (counts.value.total === 0) {
    return []
  }

  return [
    {
      label: 'Seen, not due',
      count: counts.value.seenNotDue,
      className: 'bg-success',
    },
    {
      label: 'Seen, due',
      count: counts.value.seenDue,
      className: 'bg-warning',
    },
    {
      label: 'Not practiced',
      count: counts.value.notPracticedYet,
      className: 'bg-base-300',
    },
  ].map((segment) => ({
    ...segment,
    width: `${(segment.count / counts.value.total) * 100}%`,
  }))
})

async function loadProgress() {
  isLoading.value = true

  try {
    const videoWords = getUniqueVideoFlashcardWords(props.snippets)
    const savedCards = await getSavedCardsForWords(props.languageCode, videoWords)
    counts.value = getVideoVocabProgressCounts(videoWords, savedCards, new Date())
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadProgress()
})

watch(
  () => [props.languageCode, props.snippets, props.updatedAt] as const,
  () => {
    void loadProgress()
  },
)
</script>

<template>
  <section class="space-y-2">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="text-sm font-medium">Video vocab</h2>
      <span class="text-xs text-base-content/70">{{ counts.total }} unique</span>
    </div>

    <div v-if="isLoading" class="flex h-3 items-center">
      <span class="loading loading-spinner loading-xs"></span>
    </div>

    <div v-else class="space-y-2">
      <div class="flex h-3 overflow-hidden rounded-full bg-base-200">
        <div
          v-for="segment in progressSegments"
          :key="segment.label"
          :class="segment.className"
          :style="{ width: segment.width }"
        ></div>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span
          v-for="segment in progressSegments"
          :key="`${segment.label}-legend`"
          class="inline-flex items-center gap-2"
        >
          <span class="h-2.5 w-2.5 rounded-full" :class="segment.className"></span>
          <span>{{ segment.label }}: {{ segment.count }}</span>
        </span>
      </div>
    </div>
  </section>
</template>
