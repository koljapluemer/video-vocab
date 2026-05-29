<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
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

import AppAuxDrawer from './AppAuxDrawer.vue'

type DrawerSection = 'info' | 'language' | 'stats'

const courses = ref<Course[]>([])
const currentLanguageCode = ref<string | null>(null)
const isDrawerOpen = ref(false)
const activeSection = ref<DrawerSection>('language')
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

function openDrawer(section: DrawerSection) {
  activeSection.value = section
  isDrawerOpen.value = true
}

function closeDrawer() {
  isDrawerOpen.value = false
}

async function selectLanguage(languageCode: string) {
  await setStoredTargetLanguage(languageCode)
  currentLanguageCode.value = languageCode
  statsRefreshToken.value += 1
  closeDrawer()
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
      openDrawer('language')
    }
  } catch (error) {
    console.error('Failed to load app shell:', error)
    loadError.value = 'Unable to load languages.'
    openDrawer('language')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="drawer drawer-end" :class="{ 'drawer-open': isDrawerOpen }">
    <input class="drawer-toggle" type="checkbox" :checked="isDrawerOpen">

    <div class="drawer-content min-h-screen bg-base-100">
      <header class="border-b border-base-300">
        <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold">Video Vocab</p>
            <p class="truncate text-sm text-base-content/70">{{ languageLabel }}</p>
          </div>

          <button type="button" class="btn btn-ghost gap-2" @click="openDrawer('language')">
            <Menu class="size-5" />
            <span class="hidden md:inline">Menu</span>
          </button>
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
          @open-language-picker="openDrawer('language')"
          @round-completed="handleContextRoundCompleted"
        />
      </main>
    </div>

    <AppAuxDrawer
      :active-section="activeSection"
      :courses="courses"
      :language-code="currentLanguageCode"
      :language-label="languageLabel"
      :load-error="loadError"
      :stats-refresh-token="statsRefreshToken"
      @close="closeDrawer"
      @open-section="openDrawer"
      @select-language="selectLanguage"
    />
  </div>
</template>
