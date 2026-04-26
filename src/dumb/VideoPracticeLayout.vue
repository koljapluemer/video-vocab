<script setup lang="ts">
import type { VideoPracticeMode } from '@/dumb/videoPracticeMode'
import { getVideoPracticeTabLabel, VIDEO_PRACTICE_MODES } from '@/dumb/videoPracticeMode'

const props = defineProps<{
  activeMode: VideoPracticeMode
  videoId: string
}>()

function getPracticeRoute(mode: VideoPracticeMode) {
  if (mode === 'snippet') {
    return {
      name: 'video-snippet-practice' as const,
      params: { videoId: props.videoId },
    }
  }

  if (mode === 'vocab') {
    return {
      name: 'video-vocab-practice' as const,
      params: { videoId: props.videoId },
    }
  }

  return {
    name: 'video-practice' as const,
    params: { videoId: props.videoId, practiceMode: mode },
  }
}
</script>

<template>
  <div class="container mx-auto flex min-h-full flex-col p-4">
    <section class="flex flex-1 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div
        role="tablist"
        aria-label="Video practice modes"
        class="tabs tabs-box rounded-none border-b border-base-300 bg-base-200 p-2"
      >
        <router-link
          v-for="mode in VIDEO_PRACTICE_MODES"
          :key="mode"
          role="tab"
          class="tab flex-1"
          :class="{ 'tab-active': mode === activeMode }"
          :to="getPracticeRoute(mode)"
        >
          {{ getVideoPracticeTabLabel(mode) }}
        </router-link>
      </div>

      <div class="flex flex-1 flex-col space-y-6 p-4 md:p-6">
        <slot />
      </div>
    </section>
  </div>
</template>
