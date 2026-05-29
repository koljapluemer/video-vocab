<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  getContextStatsSnapshot,
  type ContextStatsSnapshot,
} from '@/features/context-stats/contextStatsStore'

import ContextDailyBarChart from './ContextDailyBarChart.vue'

const props = defineProps<{
  languageCode: string | null
  languageLabel: string
  refreshToken: number
}>()

const isLoading = ref(false)
const loadError = ref('')
const stats = ref<ContextStatsSnapshot>({
  averageUnderstoodPercent: 0,
  minutesAppInteracted: 0,
  minutesVideoWatched: 0,
  roundsCompleted: 0,
  roundsPerDay: [],
  minutesVideoWatchedPerDay: [],
  minutesAppInteractedPerDay: [],
})
let loadRequestId = 0

const summaryStats = computed(() => [
  { label: 'Rounds', value: formatValue(stats.value.roundsCompleted) },
  { label: 'Understood', value: `${formatValue(stats.value.averageUnderstoodPercent)}%` },
  { label: 'Watched', value: `${formatValue(stats.value.minutesVideoWatched)} min` },
  { label: 'Active', value: `${formatValue(stats.value.minutesAppInteracted)} min` },
])

function formatValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

async function loadStats() {
  if (!props.languageCode) {
    loadError.value = ''
    stats.value = {
      averageUnderstoodPercent: 0,
      minutesAppInteracted: 0,
      minutesVideoWatched: 0,
      roundsCompleted: 0,
      roundsPerDay: [],
      minutesVideoWatchedPerDay: [],
      minutesAppInteractedPerDay: [],
    }
    return
  }

  const requestId = ++loadRequestId
  isLoading.value = true
  loadError.value = ''

  try {
    const snapshot = await getContextStatsSnapshot(props.languageCode)
    if (requestId !== loadRequestId) {
      return
    }
    stats.value = snapshot
  } catch (error) {
    console.error('Failed to load context stats:', error)
    if (requestId !== loadRequestId) {
      return
    }
    loadError.value = 'Unable to load stats.'
  } finally {
    if (requestId === loadRequestId) {
      isLoading.value = false
    }
  }
}

watch(
  () => [props.languageCode, props.refreshToken] as const,
  () => {
    void loadStats()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="!languageCode" class="text-sm text-base-content/70">
    Pick a language first.
  </div>

  <div v-else class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold">{{ languageLabel }}</h2>
    </div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <span class="loading loading-spinner"></span>
    </div>

    <div v-else-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="stat in summaryStats"
          :key="stat.label"
          class="rounded-box border border-base-300 px-3 py-4"
        >
          <p class="text-xs uppercase tracking-wide text-base-content/60">{{ stat.label }}</p>
          <p class="mt-1 text-xl font-semibold">{{ stat.value }}</p>
        </div>
      </div>

      <ContextDailyBarChart
        color="#2563eb"
        :points="stats.roundsPerDay"
        title="Rounds / day"
        value-label="rounds"
      />
      <ContextDailyBarChart
        color="#ea580c"
        :points="stats.minutesVideoWatchedPerDay"
        title="Watched / day"
        value-label="min"
      />
      <ContextDailyBarChart
        color="#16a34a"
        :points="stats.minutesAppInteractedPerDay"
        title="Active / day"
        value-label="min"
      />
    </div>
  </div>
</template>
