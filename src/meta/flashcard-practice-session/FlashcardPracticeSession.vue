<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type Rating } from 'ts-fsrs'

import FlashCard from '@/features/flashcard-review/FlashCard.vue'

import type { FlashcardPracticeEntry } from './flashcardPracticeEntries'
import FlashcardIntroductionCard from './FlashcardIntroductionCard.vue'
import { useFlashcardPracticeSession } from './useFlashcardPracticeSession'

const props = defineProps<{
  entries: FlashcardPracticeEntry[]
  languageCode: string
  sessionKey: string | number
}>()

const emit = defineEmits<{
  (e: 'all-flashcards-completed'): void
  (e: 'flashcard-revealed'): void
  (e: 'progress-updated', updatedAt: number): void
}>()

const isLoading = ref(true)
const hasEmittedCompletion = ref(false)
const practiceSession = useFlashcardPracticeSession(props.languageCode)
const currentIntroduction = computed(
  () => practiceSession.currentIntroduction.value,
)
const currentPracticeFlashcard = computed(
  () => practiceSession.currentPracticeFlashcard.value,
)
const currentPromptKey = computed(() => practiceSession.currentPromptKey.value)
const isSavingIntroduction = computed(
  () => practiceSession.isSavingIntroduction.value,
)

const isExhausted = computed(
  () =>
    !isLoading.value &&
    !currentIntroduction.value &&
    !currentPracticeFlashcard.value,
)

async function loadSession() {
  isLoading.value = true
  hasEmittedCompletion.value = false

  try {
    await practiceSession.load(props.entries)
  } finally {
    isLoading.value = false
  }
}

async function handleFlashcardRated(rating: Rating) {
  const flashcard = practiceSession.currentPracticeFlashcard.value
  if (!flashcard) {
    return
  }

  await practiceSession.rateFlashcard(flashcard, rating)
  emit('progress-updated', practiceSession.progressUpdatedAt.value)
}

async function handleRememberIntroduction() {
  await practiceSession.rememberCurrentIntroduction()

  if (practiceSession.progressUpdatedAt.value > 0) {
    emit('progress-updated', practiceSession.progressUpdatedAt.value)
  }
}

watch(
  () => props.sessionKey,
  () => {
    void loadSession()
  },
  { immediate: true },
)

watch(isExhausted, (nextIsExhausted) => {
  if (!nextIsExhausted || hasEmittedCompletion.value) {
    return
  }

  hasEmittedCompletion.value = true
  emit('all-flashcards-completed')
})
</script>

<template>
  <div class="flex min-h-[32rem] w-full flex-col items-center justify-center gap-6">
    <span v-if="isLoading" class="loading loading-spinner loading-lg"></span>

    <FlashcardIntroductionCard
      v-else-if="currentIntroduction"
      :word="currentIntroduction.word"
      :occurrences="currentIntroduction.occurrences"
      @remember="handleRememberIntroduction"
    />

    <FlashCard
      v-else-if="currentPracticeFlashcard"
      :key="currentPromptKey"
      :flashcard="currentPracticeFlashcard"
      @flashcard-revealed="$emit('flashcard-revealed')"
      @single-flashcard-rated="handleFlashcardRated"
    />

    <div v-else class="w-full">
      <slot name="empty" />
    </div>

    <span
      v-if="isSavingIntroduction"
      class="loading loading-spinner loading-md"
    ></span>
  </div>
</template>
