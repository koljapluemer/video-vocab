<script setup lang="ts">
import { ChartColumn, Info, Languages, X } from 'lucide-vue-next'

import type { Course } from '@/entities/course/course'

import ContextStatsPanel from '@/pages/context-practice/ContextStatsPanel.vue'

type DrawerSection = 'info' | 'language' | 'stats'

defineProps<{
  activeSection: DrawerSection
  courses: Course[]
  languageCode: string | null
  languageLabel: string
  loadError: string
  statsRefreshToken: number
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'open-section', section: DrawerSection): void
  (event: 'select-language', languageCode: string): void
}>()

function closeDrawer() {
  emit('close')
}

function openSection(section: DrawerSection) {
  emit('open-section', section)
}

function selectLanguage(languageCode: string) {
  emit('select-language', languageCode)
}
</script>

<template>
  <div class="drawer-side z-40">
    <label class="drawer-overlay" aria-label="Close menu" @click="closeDrawer"></label>

    <aside class="flex min-h-full w-full max-w-sm flex-col border-l border-base-300 bg-base-100">
      <div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
        <div class="tabs tabs-box bg-base-200 p-1">
          <button
            type="button"
            class="tab gap-2"
            :class="{ 'tab-active': activeSection === 'language' }"
            @click="openSection('language')"
          >
            <Languages class="size-4" />
            <span>Language</span>
          </button>
          <button
            type="button"
            class="tab gap-2"
            :class="{ 'tab-active': activeSection === 'stats' }"
            @click="openSection('stats')"
          >
            <ChartColumn class="size-4" />
            <span>Stats</span>
          </button>
          <button
            type="button"
            class="tab gap-2"
            :class="{ 'tab-active': activeSection === 'info' }"
            @click="openSection('info')"
          >
            <Info class="size-4" />
            <span>Info</span>
          </button>
        </div>

        <button type="button" class="btn btn-ghost btn-square btn-sm" @click="closeDrawer">
          <X class="size-4" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <div v-if="activeSection === 'language'" class="space-y-3">
          <div v-if="loadError" class="alert alert-error">
            <span>{{ loadError }}</span>
          </div>

          <div v-else class="grid gap-2">
            <button
              v-for="course in courses"
              :key="course.languageCode"
              type="button"
              class="btn justify-between"
              :class="course.languageCode === languageCode ? 'btn-primary' : 'btn-ghost border border-base-300'"
              @click="selectLanguage(course.languageCode)"
            >
              <span>{{ course.label }}</span>
              <span class="text-xs opacity-70">{{ course.languageCode.toUpperCase() }}</span>
            </button>
          </div>
        </div>

        <ContextStatsPanel
          v-else-if="activeSection === 'stats'"
          :language-code="languageCode"
          :language-label="languageLabel"
          :refresh-token="statsRefreshToken"
        />

        <div v-else class="space-y-4 text-sm leading-6">
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
            All data stays on your device.
            <a
              class="link"
              href="https://github.com/koljapluemer/video-vocab"
              rel="noopener"
              target="_blank"
            >Open source</a>.
          </p>
          <p>
            Page views only via
            <a
              class="link"
              href="https://www.goatcounter.com/"
              rel="noopener"
              target="_blank"
            >GoatCounter</a>.
          </p>
          <p>
            <a
              class="link"
              href="https://ko-fi.com/S6S81CWUVD"
              rel="noopener"
              target="_blank"
            >Ko-fi</a>
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>
