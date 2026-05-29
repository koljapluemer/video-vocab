<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'

import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'

import ContextSegmentPlayer from './ContextSegmentPlayer.vue'
import {
  loadRandomContextRound,
  type ContextRound,
} from './loadRandomContextRound'

type PracticeState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'prompt'; round: ContextRound }
  | { kind: 'watch'; round: ContextRound }
  | { kind: 'reflect'; notes: string; round: ContextRound; understoodPercent: number }

const DEFAULT_UNDERSTOOD_PERCENT = 50

const state = shallowRef<PracticeState>({ kind: 'loading' })

async function loadNextRound() {
  const languageCode = getStoredTargetLanguage()
  if (!languageCode) {
    state.value = {
      kind: 'error',
      message: 'Choose a target language first.',
    }
    return
  }

  state.value = { kind: 'loading' }

  try {
    const round = await loadRandomContextRound(languageCode)
    state.value = { kind: 'prompt', round }
  } catch (error) {
    console.error('Failed to load context practice round:', error)
    state.value = {
      kind: 'error',
      message: 'Unable to load a practice round right now.',
    }
  }
}

function goToWatch() {
  if (state.value.kind !== 'prompt') {
    return
  }

  state.value = {
    kind: 'watch',
    round: state.value.round,
  }
}

function goToReflect() {
  if (state.value.kind !== 'watch') {
    return
  }

  state.value = {
    kind: 'reflect',
    notes: '',
    round: state.value.round,
    understoodPercent: DEFAULT_UNDERSTOOD_PERCENT,
  }
}

function updateUnderstoodPercent(nextValue: number) {
  if (state.value.kind !== 'reflect') {
    return
  }

  state.value = {
    ...state.value,
    understoodPercent: nextValue,
  }
}

function updateNotes(nextValue: string) {
  if (state.value.kind !== 'reflect') {
    return
  }

  state.value = {
    ...state.value,
    notes: nextValue,
  }
}

function handleUnderstoodPercentInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  updateUnderstoodPercent(Number(target.value))
}

function handleNotesInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  updateNotes(target.value)
}

onMounted(() => {
  void loadNextRound()
})
</script>

<template>
  <div
    v-if="state.kind === 'loading'"
    class="flex min-h-[70vh] items-center justify-center px-4"
  >
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div
    v-else-if="state.kind === 'error'"
    class="mx-auto flex min-h-[70vh] max-w-xl items-center px-4"
  >
    <div class="w-full space-y-4">
      <div class="alert alert-error">
        <span>{{ state.message }}</span>
      </div>
      <button type="button" class="btn" @click="loadNextRound">
        Retry
      </button>
    </div>
  </div>

  <div
    v-else-if="state.kind === 'prompt'"
    class="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-10 px-6 text-center"
  >
    <p class="max-w-2xl text-2xl font-medium leading-tight md:text-4xl">
      Try to find how the following words are used
    </p>

    <ul class="grid w-full max-w-3xl gap-3 md:grid-cols-3">
      <li
        v-for="entry in state.round.words"
        :key="entry.word"
        class="rounded-box border border-base-300 px-5 py-4 text-left"
      >
        <p class="text-xl md:text-2xl">{{ entry.word }}</p>
        <p class="mt-1 text-sm text-base-content/70 md:text-base">{{ entry.translation }}</p>
      </li>
    </ul>

    <button type="button" class="btn btn-primary btn-lg min-w-40" @click="goToWatch">
      Go
    </button>
  </div>

  <div
    v-else-if="state.kind === 'watch'"
    class="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-4"
  >
    <ContextSegmentPlayer
      :key="`${state.round.videoId}-${state.round.segmentIndex}`"
      :duration-seconds="state.round.durationSeconds"
      :start-seconds="state.round.startSeconds"
      :video-id="state.round.videoId"
      @finished="goToReflect"
    />
  </div>

  <div
    v-else
    class="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-6 px-4"
  >
    <div class="w-full space-y-3">
      <div class="flex items-end justify-between gap-4">
        <span class="block text-lg font-medium">How much did you understand?</span>
        <span class="text-sm text-base-content/70">{{ state.understoodPercent }}%</span>
      </div>
      <div class="w-full">
        <input
          class="range range-primary range-lg w-full"
          type="range"
          min="0"
          max="100"
          step="5"
          :value="state.understoodPercent"
          @input="handleUnderstoodPercentInput"
        >
        <div class="mt-2 flex justify-between px-2.5 text-xs text-base-content/50">
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
        </div>
        <div class="mt-1 flex justify-between px-1 text-sm text-base-content/70">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
    </div>

    <label class="block space-y-3">
      <span class="block text-lg font-medium">What did you understand?</span>
      <textarea
        class="textarea textarea-bordered min-h-48 w-full"
        placeholder="Write anything you caught."
        :value="state.notes"
        @input="handleNotesInput"
      ></textarea>
    </label>

    <div class="flex justify-end">
      <button type="button" class="btn btn-primary btn-lg" @click="loadNextRound">
        Next
      </button>
    </div>
  </div>
</template>
