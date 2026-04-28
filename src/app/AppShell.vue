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
      <div class="text-sm">
      <p>
        Made by
        <a
          class="link"
          href="https://koljasam.com/"
          target="_blank"
        >Kolja Sam</a>.
      </p>

      <p>
        All data stays on your device. <a
          href="https://github.com/koljapluemer/video-vocab"
          class="link"
        >Open Source</a>, no ads, no sign-up, no BS. I track page views with the privacy-friendly <a
          href="https://www.goatcounter.com/"
          class="underline"
          target="_blank"
        >goatcounter</a>, and nothing else.
      </p>

      <p>
        If you want to enable me to build more tool like this in the future, you can <a
          href="https://ko-fi.com/S6S81CWUVD"
          target="_blank"
          rel="noopener"
          class="underline"
        >
          support me on ko-fi
        </a>.
      </p>
    </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAppInteractionTracking } from '@/features/device-stats/useAppInteractionTracking'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'

useAppInteractionTracking(getStoredTargetLanguage)
</script>
