<script setup lang="ts">
import { ChartColumn, Info, Languages, Video } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref } from 'vue'

import type { Course } from '@/entities/course/course'
import { getAllCourses } from '@/entities/course/course'
import {
  bootstrapLegacyTargetLanguage,
  getStoredTargetLanguage,
  setStoredTargetLanguage,
} from '@/features/target-language-select/targetLanguageStore'
import ContextPracticePage from '@/pages/context-practice/ContextPracticePage.vue'
import ContextStatsPanel from '@/pages/context-practice/ContextStatsPanel.vue'
import VideosPage from '@/pages/videos/VideosPage.vue'

import AppAuxModal from './AppAuxModal.vue'

type AuxModal = 'info' | 'language' | 'stats'

type ActivePage = 'practice' | 'videos'

const courses = ref<Course[]>([])
const currentLanguageCode = ref<string | null>(null)
const activeModal = ref<AuxModal | null>(null)
const loadError = ref('')
const isLoading = ref(true)
const statsRefreshToken = ref(0)
const currentVideoId = ref<string | null>(null)
const activePage = ref<ActivePage>('practice')
const pendingLazyVideoId = ref<string | null>(null)

const languageLabel = computed(() => {
  if (!currentLanguageCode.value) {
    return 'Pick language'
  }

  return (
    courses.value.find((course) => course.languageCode === currentLanguageCode.value)?.label ??
    currentLanguageCode.value.toUpperCase()
  )
})

const modalTitle = computed(() => {
  if (activeModal.value === 'language') {
    return 'Language'
  }

  if (activeModal.value === 'stats') {
    return 'Stats'
  }

  if (activeModal.value === 'info') {
    return 'Info'
  }

  return ''
})

function openModal(modal: AuxModal) {
  activeModal.value = modal
}

function closeModal() {
  activeModal.value = null
}

async function selectLanguage(languageCode: string) {
  await setStoredTargetLanguage(languageCode)
  currentLanguageCode.value = languageCode
  statsRefreshToken.value += 1
  closeModal()
}

function handleContextRoundCompleted() {
  statsRefreshToken.value += 1
}

function handleVideoChanged(videoId: string | null) {
  currentVideoId.value = videoId
}

async function handleLazyWatch(videoId: string) {
  pendingLazyVideoId.value = videoId
  activePage.value = 'practice'
  await nextTick()
  pendingLazyVideoId.value = null
}

onMounted(async () => {
  try {
    await bootstrapLegacyTargetLanguage()
    const [loadedCourses, storedLanguageCode] = await Promise.all([
      getAllCourses(),
      getStoredTargetLanguage(),
    ])

    courses.value = loadedCourses
    currentLanguageCode.value = storedLanguageCode

    if (!storedLanguageCode) {
      openModal('language')
    }
  } catch (error) {
    console.error('Failed to load app shell:', error)
    loadError.value = 'Unable to load languages.'
    openModal('language')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div class="fixed inset-0 -z-10 overflow-hidden bg-black">
      <img v-if="currentVideoId" :key="currentVideoId"
        :src="`https://img.youtube.com/vi/${currentVideoId}/maxresdefault.jpg`"
        class="h-full w-full scale-110 object-cover blur-3xl brightness-50" alt="" aria-hidden="true" />
    </div>

    <header class="fixed top-0 left-0 right-0 z-50 flex w-full items-center justify-center gap-4 px-4 py-3">
      <button type="button" class="btn btn-ghost gap-2" @click="openModal('language')">
        <Languages class="size-5" />
        <span class="hidden md:inline">{{ languageLabel }}</span>
      </button>
      <button type="button" class="btn btn-ghost gap-2" @click="openModal('stats')">
        <ChartColumn class="size-5" />
        <span class="hidden md:inline">Stats</span>
      </button>
      <button
        type="button"
        class="btn btn-ghost gap-2"
        :class="activePage === 'videos' ? 'btn-active' : ''"
        @click="activePage = activePage === 'videos' ? 'practice' : 'videos'"
      >
        <Video class="size-5" />
        <span class="hidden md:inline">Videos</span>
      </button>
      <button type="button" class="btn btn-ghost gap-2" @click="openModal('info')">
        <Info class="size-5" />
        <span class="hidden md:inline">Info</span>
      </button>
    </header>

    <main>
      <div v-if="isLoading" class="flex min-h-screen items-center justify-center px-4">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <VideosPage
        v-else-if="activePage === 'videos'"
        :language-code="currentLanguageCode"
        @lazy-watch="handleLazyWatch"
      />
      <ContextPracticePage
        v-else
        :language-code="currentLanguageCode"
        :refresh-token="statsRefreshToken"
        :pending-lazy-video-id="pendingLazyVideoId"
        @open-language-picker="openModal('language')"
        @round-completed="handleContextRoundCompleted"
        @video-changed="handleVideoChanged"
      />
    </main>

    <AppAuxModal :is-open="activeModal !== null" :title="modalTitle" @close="closeModal">
      <div v-if="activeModal === 'language'" class="space-y-3">
        <div v-if="loadError" class="alert alert-error">
          <span>{{ loadError }}</span>
        </div>

        <div v-else class="grid gap-2">
          <button v-for="course in courses" :key="course.languageCode" type="button" class="btn justify-between"
            :class="course.languageCode === currentLanguageCode ? 'btn-primary' : 'btn-ghost border border-base-300'"
            @click="selectLanguage(course.languageCode)">
            <span>{{ course.label }}</span>
            <span class="text-xs opacity-70">{{ course.languageCode.toUpperCase() }}</span>
          </button>
        </div>
      </div>

      <ContextStatsPanel v-else-if="activeModal === 'stats'" :language-code="currentLanguageCode"
        :language-label="languageLabel" :refresh-token="statsRefreshToken" />

      <div v-else-if="activeModal === 'info'" class="space-y-4 text-sm leading-6">
        <p>
          Made by
          <a class="link" href="https://koljasam.com/" rel="noopener" target="_blank">Kolja Sam</a>.
        </p>
        <p>
          This app is
          <a class="link" href="https://github.com/koljapluemer/video-vocab" rel="noopener" target="_blank">Open
            source</a>.
        </p>
        <p>
          I track nothing but pseudonymous learning data and page views via the privacy-friendly
          <a class="link" href="https://www.goatcounter.com/" rel="noopener" target="_blank">GoatCounter</a>.
        </p>
        <p>If you want to enable me to keep building apps like this, support me on
          <a class="link" href="https://ko-fi.com/S6S81CWUVD" rel="noopener" target="_blank">Ko-fi</a>.
        </p>
      </div>
    </AppAuxModal>
  </div>
</template>
