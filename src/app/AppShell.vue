<template>
  <div class="flex min-h-screen flex-col">
    <header class="py-4">
      <nav class="m-auto flex flex-row justify-center gap-2">
        <router-link class="btn" to="/">Videos</router-link>
        <router-link class="btn" :to="{ name: 'stats' }">Stats</router-link>
      </nav>
    </header>
    <main class="flex-1">
      <router-view :key="$route.fullPath" />
    </main>
    <footer class="border-t border-base-300 px-4 py-4">
      <div class="container mx-auto flex justify-center">
        <router-link class="btn btn-ghost btn-sm" :to="{ name: 'target-language' }">
          Change Language
        </router-link>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAppInteractionTracking } from '@/features/device-stats/useAppInteractionTracking'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'

useAppInteractionTracking(getStoredTargetLanguage)
</script>
