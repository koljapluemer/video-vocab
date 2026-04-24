<template>
  <div class="container mx-auto p-4 space-y-8">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Target Language</h1>
      <p class="text-base-content/80">
        Choose the language you want to study. The overview page will only show videos for this language.
      </p>
    </div>

    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        v-for="course in courses"
        :key="course.languageCode"
        type="button"
        class="card border border-base-300 bg-base-100 text-left shadow-sm transition hover:border-primary hover:shadow-md"
        :class="{ 'border-primary shadow-md': course.languageCode === selectedLanguageCode }"
        @click="selectLanguage(course.languageCode)"
      >
        <div class="card-body">
          <div class="flex items-center justify-between gap-4">
            <h2 class="card-title">{{ course.label }}</h2>
            <span v-if="course.languageCode === selectedLanguageCode" class="badge badge-primary">Selected</span>
          </div>
          <p class="text-sm text-base-content/80">
            {{ course.videos.length }} video{{ course.videos.length === 1 ? '' : 's' }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAllCourses, type Course } from '@/entities/course/course'
import {
  getStoredTargetLanguage,
  setStoredTargetLanguage,
} from '@/features/target-language-select/targetLanguageStorage'

const router = useRouter()

const courses = ref<Course[]>([])
const errorMessage = ref('')
const selectedLanguageCode = ref<string | null>(getStoredTargetLanguage())

function selectLanguage(languageCode: string) {
  setStoredTargetLanguage(languageCode)
  selectedLanguageCode.value = languageCode
  void router.push({ name: 'video-list' })
}

onMounted(async () => {
  try {
    courses.value = await getAllCourses()
  } catch (error) {
    console.error('Error loading courses:', error)
    errorMessage.value = 'Unable to load available languages.'
  }
})
</script>
