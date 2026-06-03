<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  languageCode: string | null
}>()

const emit = defineEmits<{
  (event: 'lazy-watch', videoId: string): void
}>()

const videoIds = ref<string[]>([])
const isLoading = ref(false)
const loadError = ref('')

async function loadVideos(languageCode: string) {
  isLoading.value = true
  loadError.value = ''
  videoIds.value = []

  try {
    const res = await fetch(`/vv-data/2_export/${languageCode}/_index.txt`)
    if (!res.ok) throw new Error('Failed to load video list.')
    videoIds.value = (await res.text())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  } catch (error) {
    console.error('Failed to load videos:', error)
    loadError.value = 'Unable to load videos.'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.languageCode,
  (code) => {
    if (code) void loadVideos(code)
    else videoIds.value = []
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen pt-16 px-4 pb-8">
    <div v-if="!languageCode" class="flex min-h-[60vh] items-center justify-center">
      <p class="text-base-content/60">Pick a language first.</p>
    </div>

    <div v-else-if="isLoading" class="flex min-h-[60vh] items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="loadError" class="flex min-h-[60vh] items-center justify-center">
      <div class="alert alert-error max-w-sm">{{ loadError }}</div>
    </div>

    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <button
        v-for="videoId in videoIds"
        :key="videoId"
        type="button"
        class="overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        @click="emit('lazy-watch', videoId)"
      >
        <img
          :src="`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`"
          :alt="videoId"
          class="w-full aspect-video object-cover transition-opacity hover:opacity-80"
        />
      </button>
    </div>
  </div>
</template>
