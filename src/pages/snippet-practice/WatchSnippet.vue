<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">Watch the Snippet</h2>
      <div class="max-w-full">
        <div class="mb-4 relative aspect-video">
          <iframe
            class="w-full h-full"
            :src="youtubeEmbedUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </div>
      <div class="flex flex-col items-center space-y-4">
        <button type="button" @click="replaySnippet" class="btn btn-primary">
          Replay Snippet
        </button>
        <div class="btn-group gap-2">
          <button type="button" @click="onStudyAgain" class="btn btn-warning">
            Study Again
          </button>
          <router-link
            v-if="hasNextSnippet"
            :to="{ name: 'video-snippet-practice', params: { videoId }, query: nextSnippetQuery }"
            class="btn btn-success"
          >
            Next Snippet
          </router-link>
          <button v-else type="button" class="btn btn-success" disabled>
            Next Snippet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  videoId: string
  start: number
  duration: number
  currentIndex: number
  hasNextSnippet: boolean
  nextSnippetQuery: Record<string, string>
}>()

const replayKey = ref(Date.now())

const youtubeEmbedUrl = computed(() => {
  const start = Math.floor(props.start)
  const end = Math.floor(props.start + props.duration + 0.6)
  return `https://www.youtube.com/embed/${props.videoId}?start=${start}&end=${end}&autoplay=1&replay=${replayKey.value}`
})

const replaySnippet = () => {
  replayKey.value = Date.now()
}

const onStudyAgain = () => {
  emit('study-again')
}

const emit = defineEmits<{
  (e: 'study-again'): void
}>()
</script>
