<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import { useRouter } from 'vue-router';

import FlashCardsWrapper from '@/modules/viewFlashcard/FlashCardsWrapper.vue';
import { getSnippetsOfVideo } from '@/modules/spacedRepetitionLearning/api';
import { getCourse, type Course, type Video } from '@/modules/spacedRepetitionLearning/exposeVideoList';
import { getStoredTargetLanguage } from '@/modules/targetLanguage/targetLanguageStorage';
import type { Flashcard, Snippet, Word } from '@/shared/types/domainTypes';
import { loadYoutubeIframeApi } from '@/shared/utils/loadYoutubeIframeApi';

const router = useRouter();

const selectedLanguageCode = getStoredTargetLanguage();
const course = ref<Course | null>(null);
const activeVideo = ref<Video | null>(null);
const snippets = ref<Snippet[]>([]);
const currentSnippetIndex = ref(0);
const activeExerciseSnippetIndex = ref(0);
const isLoading = ref(true);
const loadError = ref('');
const playerError = ref('');
const currentFlashcards = ref<Flashcard[]>([]);
const flashcardDeckVersion = ref(0);
const playerHostId = `flow-player-${Math.random().toString(36).slice(2)}`;

let player: YT.Player | null = null;
let snippetTimer: number | null = null;

const currentSnippet = computed(() => snippets.value[currentSnippetIndex.value] ?? null);
const hasSnippets = computed(() => snippets.value.length > 0);
const flashcardDeckKey = computed(() => `${flashcardDeckVersion.value}`);

function buildFlashcards(words: Word[]): Flashcard[] {
  const uniqueWords = new Map<string, Word>();

  for (const word of words) {
    const key = `${word.original}::${word.meanings.join('|')}`;
    if (!uniqueWords.has(key)) {
      uniqueWords.set(key, word);
    }
  }

  return Array.from(uniqueWords.values()).map((word) => ({
    ...createEmptyCard(),
    original: word.original,
    meanings: word.meanings,
  }));
}

function buildExerciseWords(snippetIndex: number): Word[] {
  const words = [
    ...(snippets.value[snippetIndex]?.words ?? []),
    ...(snippets.value[snippetIndex + 1]?.words ?? []),
  ];

  return words;
}

function setExerciseDeck(snippetIndex: number) {
  activeExerciseSnippetIndex.value = snippetIndex;
  currentFlashcards.value = buildFlashcards(buildExerciseWords(snippetIndex));
  flashcardDeckVersion.value += 1;
}

function clearSnippetTimer() {
  if (snippetTimer !== null) {
    window.clearInterval(snippetTimer);
    snippetTimer = null;
  }
}

function getSnippetIndexForTime(currentTimeSeconds: number): number {
  if (snippets.value.length === 0) {
    return 0;
  }

  for (let index = snippets.value.length - 1; index >= 0; index -= 1) {
    if (currentTimeSeconds >= snippets.value[index].start) {
      return index;
    }
  }

  return 0;
}

function startTrackingPlayback() {
  clearSnippetTimer();

  snippetTimer = window.setInterval(() => {
    if (!player) {
      return;
    }

    const nextIndex = getSnippetIndexForTime(player.getCurrentTime());
    if (nextIndex !== currentSnippetIndex.value) {
      currentSnippetIndex.value = nextIndex;
    }
  }, 250);
}

async function loadRandomVideo(options?: { excludeVideoId?: string }) {
  if (!course.value) {
    return;
  }

  const availableVideos = course.value.videos.filter((video) => video.youtubeId !== options?.excludeVideoId);
  const source = availableVideos.length > 0 ? availableVideos : course.value.videos;
  const randomVideo = source[Math.floor(Math.random() * source.length)];

  activeVideo.value = randomVideo;
  snippets.value = await getSnippetsOfVideo(randomVideo.languageCode, randomVideo.youtubeId);
  currentSnippetIndex.value = 0;

  if (currentFlashcards.value.length === 0) {
    setExerciseDeck(0);
  }
}

function playActiveVideo() {
  if (!player || !activeVideo.value) {
    return;
  }

  player.loadVideoById({
    videoId: activeVideo.value.youtubeId,
    startSeconds: 0,
  });
  startTrackingPlayback();
}

async function queueRandomVideo() {
  await loadRandomVideo({ excludeVideoId: activeVideo.value?.youtubeId });
  playActiveVideo();
}

async function loadInitialFlow() {
  if (!selectedLanguageCode) {
    await router.push({ name: 'target-language' });
    return;
  }

  try {
    isLoading.value = true;
    loadError.value = '';
    course.value = await getCourse(selectedLanguageCode);

    if (course.value.videos.length === 0) {
      loadError.value = 'This language does not have any videos yet.';
      return;
    }

    await loadRandomVideo();
  } catch (error) {
    console.error('Failed to initialize flow mode:', error);
    loadError.value = 'Unable to load flow mode right now.';
  } finally {
    isLoading.value = false;
  }
}

async function initializePlayer() {
  try {
    await loadYoutubeIframeApi();
    player = new window.YT!.Player(playerHostId, {
      videoId: activeVideo.value?.youtubeId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          playActiveVideo();
        },
        onStateChange: (event) => {
          if (event.data === window.YT!.PlayerState.ENDED) {
            void queueRandomVideo();
          }
        },
        onError: () => {
          playerError.value = 'The selected YouTube video could not be played in flow mode.';
        },
      },
    });
  } catch (error) {
    console.error('Failed to initialize YouTube player:', error);
    playerError.value = 'Unable to initialize the embedded YouTube player.';
  }
}

function handleAllFlashcardsCompleted() {
  if (snippets.value.length === 0) {
    return;
  }

  const nextExerciseSnippetIndex = Math.min(
    snippets.value.length - 1,
    Math.max(currentSnippetIndex.value, activeExerciseSnippetIndex.value + 1),
  );

  setExerciseDeck(nextExerciseSnippetIndex);
}

onMounted(async () => {
  await loadInitialFlow();

  if (hasSnippets.value) {
    await initializePlayer();
  }
});

onBeforeUnmount(() => {
  clearSnippetTimer();
  player?.destroy();
  player = null;
});
</script>

<template>
  <div class="mx-auto w-full p-4">
    <div v-if="loadError" class="alert alert-error">
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="isLoading" class="flex h-96 items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="activeVideo && currentSnippet" class="flow-layout">
      <section class="flow-practice">
        <FlashCardsWrapper
          :key="flashcardDeckKey"
          :flashcards="currentFlashcards"
          @all-flashcards-completed="handleAllFlashcardsCompleted"
        />
      </section>

      <section class="flow-video">
        <div v-if="playerError" class="alert alert-error">
          <span>{{ playerError }}</span>
        </div>

        <div class="overflow-hidden rounded-xl bg-black">
          <div class="aspect-video w-full" :id="playerHostId"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.flow-layout {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1.5rem;
}

.flow-practice,
.flow-video {
  min-width: 0;
  flex: 1 1 0;
}

@media (max-width: 767px) {
  .flow-layout {
    flex-direction: column;
  }
}
</style>
