<template>
  <div class="container mx-auto p-4 space-y-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Video Overview</h1>
    </div>

    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <section v-else-if="course" class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-2xl font-semibold">{{ course.label }}</h2>
        <div class="flex items-center gap-2">
          <router-link class="btn btn-primary btn-sm" :to="{ name: 'flow' }">
            Open Flow
          </router-link>
          <router-link class="btn btn-outline btn-sm" :to="{ name: 'target-language' }">
            Change Language
          </router-link>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <router-link
          v-for="video in course.videos"
          :key="`${course.languageCode}-${video.youtubeId}`"
          :to="{ name: 'video', params: { languageCode: course.languageCode, videoId: video.youtubeId } }"
          class="group relative overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
        >
          <img
            :src="`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`"
            :alt="`Thumbnail for a ${course.label} video`"
            class="h-48 w-full object-cover"
          />
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getCourse, type Course } from '@/entities/course/course'
import { getStoredTargetLanguage } from '@/features/target-language-select/targetLanguageStorage'

const course = ref<Course | null>(null)
const errorMessage = ref('')

onMounted(async () => {
  const languageCode = getStoredTargetLanguage()
  if (!languageCode) {
    errorMessage.value = 'Choose a target language to see videos.'
    return
  }

  try {
    course.value = await getCourse(languageCode)
  } catch (error) {
    console.error('Error loading course:', error)
    errorMessage.value = 'Unable to load videos for the selected language.'
  }
})
</script>
