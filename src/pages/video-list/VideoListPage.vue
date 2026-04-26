<template>
  <div class="container mx-auto p-4 space-y-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Video Overview</h1>
    </div>

    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <section v-else-if="course" class="space-y-4">

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="video in course.videos"
          :key="`${course.languageCode}-${video.youtubeId}`"
          class="card bg-base-100 shadow-md"
        >
          <figure>
            <img
              :src="`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`"
              :alt="`Thumbnail for a ${course.label} video`"
              class="h-48 w-full object-cover"
            />
          </figure>
          <div class="card-body gap-3">
            <div class="card-actions flex-col items-stretch">
              <router-link
                class="btn btn-outline flex-1"
                :to="{ name: 'video-snippet-practice', params: { videoId: video.youtubeId } }"
              >
                Snippet by Snippet
              </router-link>
              <router-link
                class="btn btn-outline flex-1"
                :to="{ name: 'video-practice', params: { videoId: video.youtubeId, practiceMode: 'parallel' } }"
              >
                Parallel
              </router-link>
              <router-link
                class="btn btn-outline flex-1"
                :to="{ name: 'video-vocab-practice', params: { videoId: video.youtubeId } }"
              >
                Practice Vocab
              </router-link>
            </div>
          </div>
        </article>
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
