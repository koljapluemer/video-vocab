<script setup lang="ts">
import { Check, CheckCheck, Eye, Minus, RotateCcw } from 'lucide-vue-next'
import { computed } from 'vue'

export interface FlashcardAction {
  id: string
  label: string
  icon: 'reveal' | 'again' | 'hard' | 'good' | 'easy'
  tone?: 'neutral' | 'warning' | 'info' | 'success' | 'accent'
}

const props = defineProps<{
  actions: FlashcardAction[]
}>()

const emit = defineEmits<{
  (e: 'select', actionId: string): void
}>()

const iconComponents = {
  reveal: Eye,
  again: RotateCcw,
  hard: Minus,
  good: Check,
  easy: CheckCheck,
} as const

function toneClass(tone: FlashcardAction['tone']) {
  if (tone === 'warning') return 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
  if (tone === 'info') return 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
  if (tone === 'success') return 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
  if (tone === 'accent') return 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
  return 'border-base-300 bg-white text-gray-700 hover:bg-base-200'
}

const actionsWithIcons = computed(() => props.actions.map((action) => ({
  ...action,
  iconComponent: iconComponents[action.icon],
})))
</script>

<template>
  <div class="flex flex-wrap justify-center gap-3" data-testid="action-button-row">
    <button
      v-for="action in actionsWithIcons"
      :key="action.id"
      type="button"
      class="inline-flex min-w-28 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium shadow-sm transition"
      :class="toneClass(action.tone)"
      :data-testid="`action-${action.id}`"
      @click="emit('select', action.id)"
    >
      <span class="flex h-5 w-5 items-center justify-center">
        <component :is="action.iconComponent" class="h-5 w-5" aria-hidden="true" />
      </span>
      <span>{{ action.label }}</span>
    </button>
  </div>
</template>
