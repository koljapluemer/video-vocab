<script setup lang="ts">
import { computed } from 'vue'

import type { DailyStatPoint } from '@/features/device-stats/deviceStatsStorage'

const props = defineProps<{
  title: string
  bars: DailyStatPoint[]
  valueLabel: string
}>()

const maxValue = computed(() => {
  return Math.max(1, ...props.bars.map((bar) => bar.value))
})

const chartBars = computed(() => {
  return props.bars.map((bar) => ({
    ...bar,
    heightPercent: Math.max(6, (bar.value / maxValue.value) * 100),
    shortLabel: bar.date.slice(5),
  }))
})

function formatValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h2 class="card-title text-lg">{{ title }}</h2>
      <div
        class="grid h-64 items-end gap-2"
        style="grid-template-columns: repeat(14, minmax(0, 1fr));"
      >
        <div
          v-for="bar in chartBars"
          :key="bar.date"
          class="flex min-w-0 flex-col items-center justify-end gap-2"
        >
          <span class="text-xs text-base-content/70">{{ formatValue(bar.value) }}</span>
          <div class="flex h-40 w-full items-end rounded bg-base-200 px-1">
            <div
              class="w-full rounded bg-primary"
              :style="{ height: `${bar.heightPercent}%` }"
              :aria-label="`${bar.date}: ${formatValue(bar.value)} ${valueLabel}`"
            ></div>
          </div>
          <span class="truncate text-[10px] text-base-content/70">{{ bar.shortLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
