<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Flashcard } from '@/shared/types/domainTypes'
import { Rating } from 'ts-fsrs'

import ActionButtonRow, { type FlashcardAction } from './ActionButtonRow.vue'
import IndexCard from './IndexCard.vue'
import type { IndexCardRow } from './indexCardTypes'

const props = defineProps<{
  flashcard: Flashcard
}>()

const emit = defineEmits<{
  (e: 'single-flashcard-rated', rating: Rating): void
}>()

const revealed = ref(false)
const flipped = ref(false)

// Reset revealed state when flashcard changes
watch(() => props.flashcard, () => {
  revealed.value = false
  flipped.value = false
})

const reveal = () => {
  revealed.value = true
  flipped.value = true
}

const rate = (rating: Rating) => {
  emit('single-flashcard-rated', rating)
}

const cardRows = computed<IndexCardRow[]>(() => {
  const wordRow: IndexCardRow = {
    type: 'text',
    text: props.flashcard.original,
    size: 'auto',
  }

  if (!revealed.value) {
    return [wordRow]
  }

  return [
    wordRow,
    { type: 'divider' },
    ...props.flashcard.meanings.map((meaning) => ({
      type: 'text' as const,
      text: meaning,
      size: 'normal' as const,
    })),
  ]
})

const revealAction: FlashcardAction[] = [
  { id: 'reveal', label: 'Reveal', icon: 'reveal', tone: 'neutral' },
]

const ratingActions: FlashcardAction[] = [
  { id: 'again', label: 'Again', icon: 'again', tone: 'warning' },
  { id: 'hard', label: 'Hard', icon: 'hard', tone: 'info' },
  { id: 'good', label: 'Good', icon: 'good', tone: 'success' },
  { id: 'easy', label: 'Easy', icon: 'easy', tone: 'accent' },
]

function handleAction(actionId: string) {
  if (actionId === 'reveal') {
    reveal()
    return
  }

  const ratingMap: Record<string, Rating> = {
    again: Rating.Again,
    hard: Rating.Hard,
    good: Rating.Good,
    easy: Rating.Easy,
  }

  const rating = ratingMap[actionId]
  if (rating !== undefined) {
    rate(rating)
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col items-center gap-6" data-testid="flashcard-stage">
    <IndexCard
      :rows="cardRows"
      :flipped="flipped"
      fill
    />

    <ActionButtonRow
      :actions="revealed ? ratingActions : revealAction"
      @select="handleAction"
    />
  </div>
</template>
