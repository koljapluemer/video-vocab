<script setup lang="ts">
import { ChartColumn, Info, Languages } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import type { Course } from '@/entities/course/course'
import { getAllCourses } from '@/entities/course/course'
import { useAppInteractionTracking } from '@/features/context-stats/useAppInteractionTracking'
import {
  bootstrapLegacyTargetLanguage,
  getStoredTargetLanguage,
  setStoredTargetLanguage,
} from '@/features/target-language-select/targetLanguageStore'
import ContextPracticePage from '@/pages/context-practice/ContextPracticePage.vue'
import ContextStatsPanel from '@/pages/context-practice/ContextStatsPanel.vue'

import AppAuxModal from './AppAuxModal.vue'

type AuxModal = 'info' | 'language' | 'stats'

const courses = ref<Course[]>([])
const currentLanguageCode = ref<string | null>(null)
const activeModal = ref<AuxModal | null>(null)
const loadError = ref('')
const isLoading = ref(true)
const statsRefreshToken = ref(0)

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

useAppInteractionTracking(() => currentLanguageCode.value)

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
  <div class="min-h-screen bg-base-100">
    <header class="border-b border-base-300">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-lg font-semibold">Video Vocab</p>
          <p class="truncate text-sm text-base-content/70">{{ languageLabel }}</p>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-ghost gap-2" @click="openModal('language')">
            <Languages class="size-5" />
            <span class="hidden md:inline">Language</span>
          </button>
          <button type="button" class="btn btn-ghost gap-2" @click="openModal('stats')">
            <ChartColumn class="size-5" />
            <span class="hidden md:inline">Stats</span>
          </button>
          <button type="button" class="btn btn-ghost gap-2" @click="openModal('info')">
            <Info class="size-5" />
            <span class="hidden md:inline">Info</span>
          </button>
        </div>
      </div>
    </header>

    <main>
      <div
        v-if="isLoading"
        class="flex min-h-[calc(100vh-65px)] items-center justify-center px-4"
      >
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <ContextPracticePage
        v-else
        :language-code="currentLanguageCode"
        :refresh-token="statsRefreshToken"
        @open-language-picker="openModal('language')"
        @round-completed="handleContextRoundCompleted"
      />
    </main>

    <AppAuxModal :is-open="activeModal !== null" :title="modalTitle" @close="closeModal">
      <div v-if="activeModal === 'language'" class="space-y-3">
        <div v-if="loadError" class="alert alert-error">
          <span>{{ loadError }}</span>
        </div>

        <div v-else class="grid gap-2">
          <button
            v-for="course in courses"
            :key="course.languageCode"
            type="button"
            class="btn justify-between"
            :class="course.languageCode === currentLanguageCode ? 'btn-primary' : 'btn-ghost border border-base-300'"
            @click="selectLanguage(course.languageCode)"
          >
            <span>{{ course.label }}</span>
            <span class="text-xs opacity-70">{{ course.languageCode.toUpperCase() }}</span>
          </button>
        </div>
      </div>

      <ContextStatsPanel
        v-else-if="activeModal === 'stats'"
        :language-code="currentLanguageCode"
        :language-label="languageLabel"
        :refresh-token="statsRefreshToken"
      />

      <div v-else-if="activeModal === 'info'" class="space-y-4 text-sm leading-6">
        <p>
          Made by
          <a
            class="link"
            href="https://koljasam.com/"
            rel="noopener"
            target="_blank"
          >Kolja Sam</a>.
        </p>
        <p>
          This app is 
          <a
            class="link"
            href="https://github.com/koljapluemer/video-vocab"
            rel="noopener"
            target="_blank"
          >Open source</a>.
        </p>
        <p>
          I track nothing but pseudonymous learning data and page views via the privacy-friendly
          <a
            class="link"
            href="https://www.goatcounter.com/"
            rel="noopener"
            target="_blank"
          >GoatCounter</a>.
        </p>
        <p>If you want to enable me to keep building apps like this, support me on 
          <a
            class="link"
            href="https://ko-fi.com/S6S81CWUVD"
            rel="noopener"
            target="_blank"
          >Ko-fi</a>.
        </p>
      </div>
    </AppAuxModal>
  </div>
</template>
