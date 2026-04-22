<template>
    <div class="container mx-auto p-4 space-y-8">
        <div>
            <h1 class="text-3xl font-bold mb-2">Video Overview</h1>
        </div>

        <section v-for="course in courses" :key="course.languageCode" class="space-y-4">
            <div>
                <h2 class="text-2xl font-semibold">{{ course.label }}</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <router-link
                    v-for="video in course.videos"
                    :key="`${course.languageCode}-${video.youtubeId}`"
                    :to="{ name: 'video', params: { languageCode: course.languageCode, videoId: video.youtubeId } }"
                    class="group relative overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
                >
                    <img
                        :src="`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`"
                        :alt="`Thumbnail for video ${video.youtubeId}`"
                        class="w-full h-48 object-cover"
                    />
                </router-link>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

import { getAllCourses, type Course } from '@/modules/spacedRepetitionLearning/exposeVideoList';

const courses = ref<Course[]>([]);

onMounted(async () => {
    try {
        courses.value = await getAllCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
    }
});
</script>
