<script setup lang="ts">
import { Check, CircleCheckBig, CircleX, Eye } from 'lucide-vue-next'

import type { EligibleFlowPracticePrompt } from './flowPracticePrompt'

export interface CustomPracticeQueueItem {
  isSubmitting: boolean
  prompt: EligibleFlowPracticePrompt
  queueId: string
  revealed: boolean
}

defineProps<{
  rows: CustomPracticeQueueItem[]
}>()

const emit = defineEmits<{
  (e: 'correct', queueId: string): void
  (e: 'incorrect', queueId: string): void
  (e: 'remember', queueId: string): void
  (e: 'reveal', queueId: string): void
}>()

function getMeanings(prompt: EligibleFlowPracticePrompt): string {
  if (prompt.kind === 'flashcard') {
    return prompt.flashcard.meanings.join(' · ')
  }

  return prompt.entry.word.meanings.join(' · ')
}

function getWord(prompt: EligibleFlowPracticePrompt): string {
  if (prompt.kind === 'flashcard') {
    return prompt.flashcard.original
  }

  return prompt.entry.word.original
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0 flex items-start p-3   sm:p-4">
    <TransitionGroup name="custom-queue" tag="div" class="custom-queue pt-20 flex flex-col gap-2">
      <div
        v-for="row in rows"
        :key="row.queueId"
        class="pointer-events-auto flex items-center gap-1.5"
      >
        <button
          type="button"
          class="min-w-0 flex-1 rounded-box border border-base-300 bg-base-100/92 px-3 py-2 text-left text-xs font-semibold text-base-content shadow-sm backdrop-blur transition hover:bg-base-100"
          :disabled="row.revealed || row.isSubmitting"
          @click="emit('reveal', row.queueId)"
        >
          <span class="block truncate">{{ getWord(row.prompt) }}</span>
        </button>

        <Transition name="custom-translation">
          <div
            v-if="row.revealed"
            class="min-w-0 flex-1 rounded-box border border-base-300/80 bg-base-200/88 px-3 py-2 text-xs text-base-content shadow-sm backdrop-blur"
          >
            <span class="block truncate">{{ getMeanings(row.prompt) }}</span>
          </div>
        </Transition>

        <div class="flex w-[2.5rem] shrink-0 justify-end">
          <button
            v-if="!row.revealed"
            type="button"
            class="btn btn-circle btn-sm border-base-300 bg-base-100/92 shadow-sm backdrop-blur transition-colors duration-100 hover:bg-base-100 active:scale-[0.98]"
            :disabled="row.isSubmitting"
            aria-label="Reveal translation"
            @click="emit('reveal', row.queueId)"
          >
            <Eye class="h-4 w-4" />
          </button>

          <template v-else>
            <button
              v-if="row.prompt.kind === 'introduction'"
              type="button"
              class="btn btn-circle btn-sm border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm transition hover:bg-emerald-100"
              :disabled="row.isSubmitting"
              aria-label="I will remember"
              @click="emit('remember', row.queueId)"
            >
              <Check class="h-4 w-4" />
            </button>

            <div v-else class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-circle btn-sm border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm transition-colors duration-100 hover:bg-emerald-100 active:scale-[0.98]"
                :disabled="row.isSubmitting"
                aria-label="Correct"
                @click="emit('correct', row.queueId)"
              >
                <CircleCheckBig class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="btn btn-circle btn-sm border-rose-300 bg-rose-50 text-rose-900 shadow-sm transition-colors duration-100 hover:bg-rose-100 active:scale-[0.98]"
                :disabled="row.isSubmitting"
                aria-label="Incorrect"
                @click="emit('incorrect', row.queueId)"
              >
                <CircleX class="h-4 w-4" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.custom-queue {
  max-width: min(33.333%, 22rem);
  width: 100%;
}

.custom-queue-enter-active,
.custom-queue-leave-active,
.custom-queue-move {
  transition:
    opacity 140ms ease-out,
    transform 140ms ease-out;
}

.custom-queue-enter-from,
.custom-queue-leave-to {
  opacity: 0;
  transform: translateY(1px);
}

.custom-queue-leave-active {
  position: absolute;
}

.custom-translation-enter-active,
.custom-translation-leave-active {
  transition:
    opacity 130ms ease-out,
    transform 130ms ease-out;
}

.custom-translation-enter-from,
.custom-translation-leave-to {
  opacity: 0;
  transform: translateX(1px);
}

@media (prefers-reduced-motion: reduce) {
  .custom-queue-enter-active,
  .custom-queue-leave-active,
  .custom-queue-move,
  .custom-translation-enter-active,
  .custom-translation-leave-active {
    transition-duration: 1ms !important;
  }

  .custom-queue-enter-from,
  .custom-queue-leave-to,
  .custom-translation-enter-from,
  .custom-translation-leave-to {
    transform: none;
  }
}
</style>
