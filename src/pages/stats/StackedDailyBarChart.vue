<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

import type { DailyStatPoint } from '@/features/device-stats/deviceStatsStorage'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  title: string
  points: DailyStatPoint[]
  valueLabel: string
  languageLabels: Record<string, string>
}>()

const datasetColors = [
  '#2563eb',
  '#f97316',
  '#16a34a',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#db2777',
]

const languageCodes = computed(() => {
  const codes = new Set<string>()

  for (const point of props.points) {
    for (const languageCode of Object.keys(point.values)) {
      codes.add(languageCode)
    }
  }

  return Array.from(codes).sort((left, right) => left.localeCompare(right))
})

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.points.map((point) => point.date.slice(5)),
  datasets: languageCodes.value.map((languageCode, index) => ({
    label: props.languageLabels[languageCode] ?? languageCode,
    data: props.points.map((point) => point.values[languageCode] ?? 0),
    backgroundColor: datasetColors[index % datasetColors.length],
    borderRadius: 4,
    borderSkipped: false,
    stack: 'per-day',
  })),
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'rectRounded',
      },
    },
    tooltip: {
      callbacks: {
        label(context) {
          const value = typeof context.raw === 'number' ? context.raw : 0
          const formattedValue = Number.isInteger(value) ? `${value}` : value.toFixed(2)
          return `${context.dataset.label}: ${formattedValue} ${props.valueLabel}`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        callback(value) {
          return typeof value === 'number' && Number.isInteger(value) ? `${value}` : `${value}`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body gap-3">
      <h2 class="card-title text-lg">{{ title }}</h2>
      <div v-if="languageCodes.length > 0" class="h-80">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <p v-else class="text-sm text-base-content/70">No data yet.</p>
    </div>
  </div>
</template>
