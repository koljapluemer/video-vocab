<script setup lang="ts">
import { computed } from 'vue'

import type { IndexCardRow } from './indexCardTypes'

const props = defineProps<{
  rows: IndexCardRow[]
  flipped?: boolean
  swiped?: boolean
  fill?: boolean
}>()

const cardClasses = computed(() => [
  'index-card',
  'card',
  'w-full',
  'border',
  'border-base-300',
  'bg-white',
  'text-gray-700',
  'shadow-sm',
  props.fill && 'h-full',
  props.flipped && 'index-card--flipped',
  props.swiped && 'index-card--swiped',
])

const textClass = (row: IndexCardRow) => {
  if (row.type === 'divider') return ''

  if (row.size === 'small') return 'text-sm text-gray-400'
  if (row.size === 'normal') return 'text-xl'

  const length = row.text.length

  if (length < 3) return 'text-7xl font-bold'
  if (length < 20) return 'text-5xl font-bold'
  return 'text-3xl font-semibold'
}
</script>

<template>
  <div :class="cardClasses" data-testid="index-card">
    <div class="card-body grid min-h-[22rem] place-items-center gap-4 px-6 py-8 text-center sm:px-8">
      <template v-for="(row, index) in rows" :key="index">
        <div
          v-if="row.type === 'divider'"
          class="w-full border-b-2 border-dotted border-base-300"
          data-testid="index-card-divider"
        />
        <div v-else class="flex flex-col items-center gap-1">
          <p :class="textClass(row)" data-testid="index-card-text">
            {{ row.text }}
          </p>
          <p
            v-if="row.subtext"
            class="text-sm text-gray-400"
            data-testid="index-card-subtext"
          >
            {{ row.subtext }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.index-card {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

.index-card--flipped {
  animation: flipCard 0.4s ease;
}

@keyframes flipCard {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(90deg);
  }
  100% {
    transform: rotateY(0deg);
  }
}

.index-card--swiped {
  animation: swipeCard 0.35s ease forwards;
}

@keyframes swipeCard {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(60%);
    opacity: 0;
  }
}
</style>
