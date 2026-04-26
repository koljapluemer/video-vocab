<script setup lang="ts">
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import type { FlashcardWord } from '@/entities/flashcard/flashcard'

defineProps<{
  word: FlashcardWord
  occurrences: number
}>()

defineEmits<{
  (e: 'remember'): void
}>()
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

    <button type="button" class="btn btn-primary min-w-48" @click="$emit('remember')">
      I will remember
    </button>
  </div>
</template>
