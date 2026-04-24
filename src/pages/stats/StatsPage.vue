<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { State } from 'ts-fsrs'

import { getCardStateCounts } from '@/entities/flashcard/flashcardStore'
import {
  getStatsSnapshot,
  type DailyStatPoint,
  type DeviceStatsSnapshot,
} from '@/features/device-stats/deviceStatsStorage'

import DailyBarChart from './DailyBarChart.vue'

const stats = ref<DeviceStatsSnapshot | null>(null)
const cardStateCounts = ref<Record<State, number>>({
  [State.New]: 0,
  [State.Learning]: 0,
  [State.Review]: 0,
  [State.Relearning]: 0,
})

const totalStats = computed(() => [
  { label: 'Minutes video watched', value: stats.value?.minutesVideoWatched ?? 0 },
  { label: 'Minutes interacted', value: stats.value?.minutesAppInteracted ?? 0 },
  { label: 'Flashcards flipped', value: stats.value?.flashcardsFlipped ?? 0 },
])

const cardStateSummary = computed(() => [
  { label: 'New', value: cardStateCounts.value[State.New] },
  { label: 'Learning', value: cardStateCounts.value[State.Learning] },
  { label: 'Review', value: cardStateCounts.value[State.Review] },
  { label: 'Relearning', value: cardStateCounts.value[State.Relearning] },
])

function formatValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function normalizeBars(points: DailyStatPoint[] | undefined) {
  return points ?? []
}

onMounted(async () => {
  stats.value = getStatsSnapshot()
  cardStateCounts.value = await getCardStateCounts()
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

    <section class="grid gap-4 md:grid-cols-2">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title text-lg">Totals</h2>
          <div class="space-y-2">
            <div
              v-for="stat in totalStats"
              :key="stat.label"
              class="flex items-center justify-between gap-4 rounded-lg bg-base-200 px-3 py-2"
            >
              <span>{{ stat.label }}</span>
              <span class="font-semibold">{{ formatValue(stat.value) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title text-lg">Card states</h2>
          <div class="space-y-2">
            <div
              v-for="stateSummary in cardStateSummary"
              :key="stateSummary.label"
              class="flex items-center justify-between gap-4 rounded-lg bg-base-200 px-3 py-2"
            >
              <span>{{ stateSummary.label }}</span>
              <span class="font-semibold">{{ stateSummary.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <DailyBarChart
        title="Cards flipped per day"
        :bars="normalizeBars(stats?.cardsFlippedByDay)"
        value-label="cards"
      />
      <DailyBarChart
        title="Minutes interacted per day"
        :bars="normalizeBars(stats?.minutesInteractedByDay)"
        value-label="min"
      />
    </section>
  </div>
</template>
