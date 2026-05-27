<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VideoPracticeLayout from '@/dumb/VideoPracticeLayout.vue'
import IndexCard from '@/dumb/index-card/IndexCard.vue'
import { getCourse, getVideoById, pickRandomVideo, type Course } from '@/entities/course/course'
import {
  getComprehensionAnswer,
  saveComprehensionAnswer,
} from '@/entities/comprehension-answer/comprehensionAnswerStore'
import { getMetaSegmentsOfVideo, type MetaSegment } from '@/entities/snippet/snippet'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'

import ComprehensionSegmentPlayer from './ComprehensionSegmentPlayer.vue'

interface ComprehensionSegmentPlayerExposed {
  replaySegment: () => void
}

const route = useRoute()
const router = useRouter()

const languageCode = getStoredTargetLanguage() ?? ''
const course = ref<Course | null>(null)
const metaSegments = shallowRef<MetaSegment[]>([])
const isLoading = ref(true)
const isSavingAnswer = ref(false)
const loadError = ref<string | null>(null)
const saveError = ref('')
const answerText = ref('')
const phase = ref<'watch' | 'answer' | 'done'>('watch')
const playerRef = ref<ComprehensionSegmentPlayerExposed | null>(null)

let latestLoadRequestId = 0
let latestSegmentRequestId = 0

const videoId = computed(() => route.params.videoId as string)
const segmentIndex = computed(() => {
  const rawValue = route.query.segment
  const segmentValue = Array.isArray(rawValue) ? rawValue[0] : rawValue
  const parsedValue = Number(segmentValue ?? 0)

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
})
const currentSegment = computed(() => metaSegments.value[segmentIndex.value] ?? null)
const isDone = computed(() => metaSegments.value.length > 0 && segmentIndex.value >= metaSegments.value.length)
const hasNextSegment = computed(() => segmentIndex.value < metaSegments.value.length - 1)
const nextButtonLabel = computed(() => (hasNextSegment.value ? 'Next segment' : 'Finish'))

function buildSegmentQuery(nextSegmentIndex: number) {
  if (nextSegmentIndex <= 0) {
    return {}
  }

  return { segment: String(nextSegmentIndex) }
}

async function loadComprehensionPractice() {
  const loadRequestId = ++latestLoadRequestId

  if (!languageCode) {
    loadError.value = 'Choose a target language first.'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    loadError.value = null
    saveError.value = ''
    answerText.value = ''
    phase.value = 'watch'
    metaSegments.value = []

    course.value = await getCourse(languageCode)
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    const video = await getVideoById(languageCode, videoId.value)
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    if (!video) {
      loadError.value = 'This video could not be found.'
      return
    }

    const nextMetaSegments = await getMetaSegmentsOfVideo(languageCode, videoId.value)
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    if (nextMetaSegments.length === 0) {
      loadError.value = 'This video has no segments to practice.'
      return
    }

    metaSegments.value = nextMetaSegments
    await syncSegmentState(loadRequestId)
  } catch (error) {
    if (loadRequestId !== latestLoadRequestId) {
      return
    }

    console.error('Failed to load comprehension practice:', error)
    loadError.value = 'Unable to load comprehension practice right now.'
  } finally {
    if (loadRequestId === latestLoadRequestId) {
      isLoading.value = false
    }
  }
}

async function syncSegmentState(loadRequestId = latestLoadRequestId) {
  const segmentRequestId = ++latestSegmentRequestId

  if (loadRequestId !== latestLoadRequestId) {
    return
  }

  saveError.value = ''

  if (metaSegments.value.length === 0) {
    answerText.value = ''
    phase.value = 'done'
    return
  }

  if (segmentIndex.value >= metaSegments.value.length) {
    answerText.value = ''
    phase.value = 'done'
    return
  }

  const segment = currentSegment.value
  if (!segment) {
    loadError.value = 'This segment could not be found.'
    return
  }

  const savedAnswer = await getComprehensionAnswer(languageCode, videoId.value, segment)
  if (
    loadRequestId !== latestLoadRequestId ||
    segmentRequestId !== latestSegmentRequestId
  ) {
    return
  }

  answerText.value = savedAnswer?.answerText ?? ''
  phase.value = 'watch'
}

async function persistCurrentAnswer() {
  const segment = currentSegment.value
  if (!segment) {
    return
  }

  isSavingAnswer.value = true
  saveError.value = ''

  try {
    await saveComprehensionAnswer(
      languageCode,
      videoId.value,
      segment,
      answerText.value,
      new Date(),
    )
  } catch (error) {
    console.error('Failed to save comprehension answer:', error)
    saveError.value = 'Unable to save your answer right now.'
    throw error
  } finally {
    isSavingAnswer.value = false
  }
}

function handleSegmentFinished() {
  if (phase.value !== 'watch') {
    return
  }

  phase.value = 'answer'
}

function handleReplaySegment() {
  if (!currentSegment.value) {
    return
  }

  phase.value = 'watch'
  playerRef.value?.replaySegment()
}

async function handleAnswerBlur() {
  try {
    await persistCurrentAnswer()
  } catch {
    return
  }
}

async function handleAdvance() {
  try {
    await persistCurrentAnswer()
  } catch {
    return
  }

  await router.push({
    name: 'video-comprehension-practice',
    params: { videoId: videoId.value },
    query: buildSegmentQuery(segmentIndex.value + 1),
  })
}

async function openRandomNextVideo() {
  if (!course.value) {
    return
  }

  const nextVideo = pickRandomVideo(course.value, videoId.value)
  await router.push({
    name: 'video-comprehension-practice',
    params: { videoId: nextVideo.youtubeId },
  })
}

watch(
  () => [videoId.value, segmentIndex.value] as const,
  ([nextVideoId], previousValue) => {
    const previousVideoId = previousValue?.[0]

    if (nextVideoId !== previousVideoId) {
      void loadComprehensionPractice()
      return
    }

    void syncSegmentState()
  },
  { immediate: true },
)
</script>

<template>
  <VideoPracticeLayout active-mode="comprehension" :video-id="videoId">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="isDone" class="flex flex-1 flex-col gap-6">
      <div class="mx-auto flex w-full max-w-2xl flex-1 items-center">
        <IndexCard
          :rows="[
            { type: 'text', text: 'Done for now', size: 'auto' },
            { type: 'divider' },
            { type: 'text', text: 'You finished this video.', size: 'normal' },
          ]"
          fill
        />
      </div>

      <div class="flex flex-wrap justify-center gap-2">
        <router-link :to="{ name: 'video-list' }" class="btn">
          Back to Video Overview
        </router-link>
        <button type="button" class="btn" @click="openRandomNextVideo">
          Switch Video
        </button>
      </div>
    </div>

    <div v-else-if="currentSegment" class="space-y-6">
      <div class="flex items-center justify-between gap-4 text-sm text-base-content/70">
        <span>Segment {{ segmentIndex + 1 }} of {{ metaSegments.length }}</span>
        <span>{{ currentSegment.wordCount }} words</span>
      </div>

      <ComprehensionSegmentPlayer
        ref="playerRef"
        :video-id="videoId"
        :start="currentSegment.start"
        :duration="currentSegment.duration"
        @finished="handleSegmentFinished"
      />

      <div v-if="saveError" class="alert alert-error">
        <span>{{ saveError }}</span>
      </div>

      <div
        v-if="phase === 'watch'"
        class="flex min-h-44 items-center justify-center rounded-box border border-base-300 bg-base-100 p-6"
      >
        <div class="text-center">
          <span class="loading loading-spinner loading-md"></span>
          <p class="mt-3 text-sm text-base-content/70">Listen first. The answer box appears after playback.</p>
        </div>
      </div>

      <div v-else class="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">

        <label class="form-control w-full">
          <span class="label">
            <span class="label-text">What did you understand?</span>
          </span>
          <textarea
            v-model="answerText"
            class="textarea textarea-bordered min-h-40 w-full"
            placeholder="Write what you understood."
            @blur="handleAnswerBlur"
          />
        </label>

        <div class="flex flex-wrap justify-center gap-2">
          <button type="button" class="btn" @click="handleReplaySegment">
            Replay segment
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="isSavingAnswer"
            @click="handleAdvance"
          >
            {{ nextButtonLabel }}
          </button>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-2">
        <router-link :to="{ name: 'video-list' }" class="btn">
          Back to Video Overview
        </router-link>
        <button type="button" class="btn" @click="openRandomNextVideo">
          Switch Video
        </button>
      </div>
    </div>
  </VideoPracticeLayout>
</template>
