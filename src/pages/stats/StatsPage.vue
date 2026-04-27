<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAllCourses } from '@/entities/course/course'
import {
  getWordStatsByLanguage,
  type LanguageWordStats,
} from '@/entities/flashcard/flashcardStore'
import {
  getStatsSnapshot,
  type DeviceStatsSnapshot,
} from '@/features/device-stats/deviceStatsStorage'

import LanguageWordStatsTable from './LanguageWordStatsTable.vue'
import StackedDailyBarChart from './StackedDailyBarChart.vue'

const stats = ref<DeviceStatsSnapshot>({
  languages: [],
  cardsFlippedByDay: [],
  minutesVideoWatchedByDay: [],
  minutesInteractedByDay: [],
})
const wordStats = ref<LanguageWordStats[]>([])
const languageLabels = ref<Record<string, string>>({})
const loadError = ref('')

const totalStats = computed(() => {
  const totalWords = wordStats.value.reduce((sum, languageStat) => sum + languageStat.total, 0)
  const totals = stats.value.languages.reduce(
    (sum, languageStat) => ({
      minutesVideoWatched: sum.minutesVideoWatched + languageStat.minutesVideoWatched,
      minutesAppInteracted: sum.minutesAppInteracted + languageStat.minutesAppInteracted,
      flashcardsFlipped: sum.flashcardsFlipped + languageStat.flashcardsFlipped,
    }),
    {
      minutesVideoWatched: 0,
      minutesAppInteracted: 0,
      flashcardsFlipped: 0,
    },
  )

  return [
    { label: 'Words saved', value: totalWords },
    { label: 'Minutes video watched', value: totals.minutesVideoWatched },
    { label: 'Minutes interacted', value: totals.minutesAppInteracted },
    { label: 'Flashcards flipped', value: totals.flashcardsFlipped },
  ]
})

function formatValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

onMounted(async () => {
  try {
    stats.value = getStatsSnapshot()

    const [nextWordStats, courses] = await Promise.all([
      getWordStatsByLanguage(),
      getAllCourses(),
    ])

    wordStats.value = nextWordStats
    languageLabels.value = Object.fromEntries(
      courses.map((course) => [course.languageCode, course.label]),
    )
  } catch (error) {
    console.error('Failed to load stats page:', error)
    loadError.value = 'Unable to load stats right now.'
  }
})
</script>

<template>
  <div class="container mx-auto space-y-6 p-4">
    <section class="space-y-2">
      <h1 class="text-3xl font-bold">Stats</h1>
      <p class="text-sm text-base-content/70">
        Device-local progress only. These numbers are stored on this device and are not synced.
      </p>
    </section>

    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in totalStats"
        :key="stat.label"
        class="card bg-base-100 shadow-sm"
      >
        <div class="card-body gap-1">
          <p class="text-sm text-base-content/70">{{ stat.label }}</p>
          <p class="text-3xl font-semibold">{{ formatValue(stat.value) }}</p>
        </div>
      </div>
    </section>

    <section>
      <LanguageWordStatsTable :stats="wordStats" :language-labels="languageLabels" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <StackedDailyBarChart
        title="Cards flipped per day"
        :points="stats.cardsFlippedByDay"
        value-label="cards"
        :language-labels="languageLabels"
      />
      <StackedDailyBarChart
        title="Minutes watched per day"
        :points="stats.minutesVideoWatchedByDay"
        value-label="min"
        :language-labels="languageLabels"
      />
    </section>
  </div>
</template>
