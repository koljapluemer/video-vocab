<script setup lang="ts">
import { shallowRef, watch } from 'vue'

import { recordCompletedContextRound } from '@/features/context-stats/contextStatsStore'

import ContextRepeatRecorder from './ContextRepeatRecorder.vue'
import ContextSegmentPlayer from './ContextSegmentPlayer.vue'
import LazyVideoPlayer from './LazyVideoPlayer.vue'
import {
  pickContextExerciseTemplate,
  type ContextExerciseTemplate,
} from './contextExerciseTemplates'
import {
  loadRandomContextRound,
  type ContextRound,
} from './loadRandomContextRound'
import { loadRandomLazyVideo, type LazyVideo } from './loadRandomLazyVideo'

interface PracticeRoundState {
  exercise: ContextExerciseTemplate
  round: ContextRound
}

type PracticeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | ({ kind: 'prompt' } & PracticeRoundState)
  | ({ kind: 'watch' } & PracticeRoundState)
  | ({ kind: 'reflect'; isSaving: boolean; responseText: string } & PracticeRoundState)

type LazyState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'playing'; video: LazyVideo }

type PracticeMode = 'mix' | 'lazy'

const props = defineProps<{
  languageCode: string | null
  refreshToken: number
}>()

const emit = defineEmits<{
  (event: 'open-language-picker'): void
  (event: 'round-completed'): void
}>()

const mode = shallowRef<PracticeMode>('mix')
const state = shallowRef<PracticeState>({ kind: 'idle' })
const lazyState = shallowRef<LazyState>({ kind: 'idle' })
let loadRequestId = 0
let lazyLoadRequestId = 0

async function loadNextRound() {
  if (!props.languageCode) {
    state.value = { kind: 'idle' }
    return
  }

  const requestId = ++loadRequestId
  state.value = { kind: 'loading' }

  try {
    const round = await loadRandomContextRound(props.languageCode)
    if (requestId !== loadRequestId) {
      return
    }
    state.value = {
      kind: 'prompt',
      round,
      exercise: pickContextExerciseTemplate(round),
    }
  } catch (error) {
    console.error('Failed to load context practice round:', error)
    if (requestId !== loadRequestId) {
      return
    }
    state.value = {
      kind: 'error',
      message: 'Unable to load a clip.',
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
    exercise: state.value.exercise,
  }
}

function goToReflect() {
  if (state.value.kind !== 'watch') {
    return
  }

  state.value = {
    kind: 'reflect',
    isSaving: false,
    responseText: '',
    round: state.value.round,
    exercise: state.value.exercise,
  }
}

function updateResponseText(nextValue: string) {
  if (state.value.kind !== 'reflect') {
    return
  }

  state.value = {
    ...state.value,
    responseText: nextValue,
  }
}

function handleResponseTextInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  updateResponseText(target.value)
}

async function completeRound() {
  if (state.value.kind !== 'reflect') {
    return
  }

  const nextState = {
    ...state.value,
    isSaving: true,
  }
  state.value = nextState

  try {
    await recordCompletedContextRound({
      completedAt: new Date(),
      durationSeconds: nextState.round.durationSeconds,
      languageCode: nextState.round.languageCode,
      segmentIndex: nextState.round.segmentIndex,
      videoId: nextState.round.videoId,
    })
    emit('round-completed')
    await loadNextRound()
  } catch (error) {
    console.error('Failed to save context round:', error)
    state.value = {
      kind: 'error',
      message: 'Unable to save this round.',
    }
  }
}

async function loadNextLazyVideo() {
  if (!props.languageCode) {
    lazyState.value = { kind: 'idle' }
    return
  }

  const requestId = ++lazyLoadRequestId
  lazyState.value = { kind: 'loading' }

  try {
    const video = await loadRandomLazyVideo(props.languageCode)
    if (requestId !== lazyLoadRequestId) return
    lazyState.value = { kind: 'playing', video }
  } catch (error) {
    console.error('Failed to load lazy video:', error)
    if (requestId !== lazyLoadRequestId) return
    lazyState.value = { kind: 'error', message: 'Unable to load video.' }
  }
}

watch(
  () => [props.languageCode, props.refreshToken] as const,
  () => {
    if (mode.value === 'mix') void loadNextRound()
    else void loadNextLazyVideo()
  },
  { immediate: true },
)

watch(mode, (newMode) => {
  if (newMode === 'mix') {
    lazyState.value = { kind: 'idle' }
    void loadNextRound()
  } else {
    loadRequestId++
    state.value = { kind: 'idle' }
    void loadNextLazyVideo()
  }
})
</script>

<template>
  <div class="border-b border-base-300">
    <div class="tabs tabs-border mx-auto max-w-4xl px-4">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': mode === 'mix' }"
        @click="mode = 'mix'"
      >Mix</button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab-active': mode === 'lazy' }"
        @click="mode = 'lazy'"
      >Lazy</button>
    </div>
  </div>

  <template v-if="mode === 'mix'">

  <div
    v-if="state.kind === 'idle'"
    class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4"
  >
    <button type="button" class="btn" @click="emit('open-language-picker')">
      Pick language
    </button>
  </div>

  <div
    v-else-if="state.kind === 'loading'"
    class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4"
  >
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div
    v-else-if="state.kind === 'error'"
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-xl items-center px-4"
  >
    <div class="w-full space-y-4">
      <div class="alert alert-error">
        <span>{{ state.message }}</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn" @click="loadNextRound">
          Retry
        </button>
        <button type="button" class="btn btn-ghost" @click="emit('open-language-picker')">
          Language
        </button>
      </div>
    </div>
  </div>

  <div
    v-else-if="state.kind === 'prompt'"
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-4xl flex-col items-center justify-center gap-8 px-4 py-10 text-center"
  >
    <p class="max-w-2xl text-lg leading-relaxed md:text-xl">
      {{ state.exercise.preInstruction }}
    </p>

    <ul
      v-if="state.exercise.kind === 'look-for-vocabulary'"
      class="grid w-full max-w-3xl gap-3 md:grid-cols-3"
    >
      <li
        v-for="entry in state.round.words"
        :key="entry.word"
        class="rounded-box border border-base-300 px-4 py-5 text-left"
      >
        <p class="text-xl font-medium md:text-2xl">{{ entry.word }}</p>
        <p class="mt-1 text-sm text-base-content/70 md:text-base">{{ entry.translation }}</p>
      </li>
    </ul>

    <button type="button" class="btn btn-primary btn-lg min-w-40" @click="goToWatch">
      Start
    </button>
  </div>

  <div
    v-else-if="state.kind === 'watch'"
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-5xl flex-col justify-center px-4 py-10"
  >
    <ContextSegmentPlayer
      :key="`${state.round.videoId}-${state.round.segmentIndex}`"
      :duration-seconds="state.round.durationSeconds"
      :language-code="state.round.languageCode"
      :start-seconds="state.round.startSeconds"
      :video-id="state.round.videoId"
      @finished="goToReflect"
    />
  </div>

  <div
    v-else
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-3xl flex-col justify-center gap-6 px-4 py-10"
  >
    <label
      v-if="state.exercise.responseMode === 'text'"
      class="space-y-3"
    >
      <span class="block text-lg font-medium">{{ state.exercise.postQuestion }}</span>
      <textarea
        class="textarea textarea-bordered min-h-48 w-full"
        :value="state.responseText"
        @input="handleResponseTextInput"
      ></textarea>
    </label>

    <ContextRepeatRecorder v-else />

    <div class="flex justify-end">
      <button
        type="button"
        class="btn btn-primary btn-lg min-w-32"
        :disabled="state.isSaving"
        @click="completeRound"
      >
        Next
      </button>
    </div>
  </div>

  </template>

  <template v-else>

  <div
    v-if="lazyState.kind === 'idle'"
    class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4"
  >
    <button type="button" class="btn" @click="emit('open-language-picker')">
      Pick language
    </button>
  </div>

  <div
    v-else-if="lazyState.kind === 'loading'"
    class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4"
  >
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div
    v-else-if="lazyState.kind === 'error'"
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-xl items-center px-4"
  >
    <div class="w-full space-y-4">
      <div class="alert alert-error">
        <span>{{ lazyState.message }}</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn" @click="loadNextLazyVideo">
          Retry
        </button>
        <button type="button" class="btn btn-ghost" @click="emit('open-language-picker')">
          Language
        </button>
      </div>
    </div>
  </div>

  <div
    v-else-if="lazyState.kind === 'playing'"
    class="mx-auto flex min-h-[calc(100vh-65px)] max-w-5xl flex-col justify-center px-4 py-10"
  >
    <LazyVideoPlayer
      :key="lazyState.video.videoId"
      :video="lazyState.video"
      :language-code="lazyState.video.languageCode"
      @finished="() => { emit('round-completed'); void loadNextLazyVideo() }"
    />
  </div>

  </template>
</template>
