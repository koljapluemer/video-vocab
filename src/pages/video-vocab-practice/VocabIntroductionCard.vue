<script setup lang="ts">
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import type { FlashcardWord } from '@/entities/flashcard/flashcard'
import ActionButtonRow, { type FlashcardAction } from '@/features/flashcard-review/ActionButtonRow.vue'

defineProps<{
  word: FlashcardWord
  occurrences: number
}>()

defineEmits<{
  (e: 'remember'): void
}>()

const rememberAction: FlashcardAction[] = [
  { id: 'remember', label: 'I will remember', icon: 'good', tone: 'success' },
]
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
    <IndexCard
      :rows="[
        { type: 'text', text: word.original, size: 'auto' },
        { type: 'divider' },
        ...word.meanings.map((meaning) => ({ type: 'text' as const, text: meaning, size: 'normal' as const })),
      ]"
      :flipped="true"
      fill
    />

    <ActionButtonRow
      :actions="rememberAction"
      @select="$emit('remember')"
    />
  </div>
</template>
