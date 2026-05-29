<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

import type { DailyStatPoint } from '@/features/context-stats/contextStatsStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{
  color: string
  points: DailyStatPoint[]
  title: string
  valueLabel: string
}>()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.points.map((point) => point.date.slice(5)),
  datasets: [
    {
      data: props.points.map((point) => point.value),
      backgroundColor: props.color,
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label(context) {
          const value = typeof context.raw === 'number' ? context.raw : 0
          const formattedValue = Number.isInteger(value) ? `${value}` : value.toFixed(2)
          return `${formattedValue} ${props.valueLabel}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
    },
  },
}))
</script>

<template>
  <section class="space-y-3">
    <h3 class="text-sm font-medium">{{ title }}</h3>
    <div class="h-52 rounded-box border border-base-300 p-3">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </section>
</template>
