<script setup lang="ts">
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

function toneClass(tone: FlashcardAction['tone']) {
  if (tone === 'warning') return 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
  if (tone === 'info') return 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
  if (tone === 'success') return 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
  if (tone === 'accent') return 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
  return 'border-base-300 bg-white text-gray-700 hover:bg-base-200'
}
</script>

<template>
  <div class="flex flex-wrap justify-center gap-3" data-testid="action-button-row">
    <button
      v-for="action in props.actions"
      :key="action.id"
      type="button"
      class="inline-flex min-w-28 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium shadow-sm transition"
      :class="toneClass(action.tone)"
      :data-testid="`action-${action.id}`"
      @click="emit('select', action.id)"
    >
      <span class="flex h-5 w-5 items-center justify-center">
        <svg
          v-if="action.icon === 'reveal'"
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else-if="action.icon === 'again'"
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10V4h6" />
          <path d="M21 14v6h-6" />
          <path d="M20 10a8 8 0 0 0-14-4L3 10" />
          <path d="M4 14a8 8 0 0 0 14 4l3-4" />
        </svg>
        <svg
          v-else-if="action.icon === 'hard'"
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 15h8" />
          <path d="M12 3v8" />
          <path d="M5.6 20h12.8" />
        </svg>
        <svg
          v-else-if="action.icon === 'good'"
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 5 5L20 7" />
          <path d="m12 7 3-3" />
        </svg>
      </span>
      <span>{{ action.label }}</span>
    </button>
  </div>
</template>
