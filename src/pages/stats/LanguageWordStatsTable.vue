<script setup lang="ts">
import type { LanguageWordStats } from '@/entities/flashcard/flashcardStore'

defineProps<{
  languageLabels: Record<string, string>
  stats: LanguageWordStats[]
}>()
</script>

<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body gap-3">
      <h2 class="card-title text-lg">Words by language</h2>

      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Language</th>
              <th class="text-right">Words</th>
              <th class="text-right">New</th>
              <th class="text-right">Learning</th>
              <th class="text-right">Review</th>
              <th class="text-right">Relearning</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="languageStat in stats" :key="languageStat.languageCode">
              <td>{{ languageLabels[languageStat.languageCode] ?? languageStat.languageCode }}</td>
              <td class="text-right font-semibold">{{ languageStat.total }}</td>
              <td class="text-right">{{ languageStat.stateCounts[0] }}</td>
              <td class="text-right">{{ languageStat.stateCounts[1] }}</td>
              <td class="text-right">{{ languageStat.stateCounts[2] }}</td>
              <td class="text-right">{{ languageStat.stateCounts[3] }}</td>
            </tr>
            <tr v-if="stats.length === 0">
              <td colspan="6" class="text-center text-base-content/70">No words yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
