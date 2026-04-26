import { computed, ref } from 'vue'
import { type Rating } from 'ts-fsrs'

import { buildFlashcardId, flashcardWasNeverSeenBefore, type Flashcard } from '@/entities/flashcard/flashcard'
import { applyRating, createCardForWord, getSavedCardsForWords } from '@/entities/flashcard/flashcardStore'
import { getSnippetsOfVideo, type Snippet } from '@/entities/snippet/snippet'
import {
  buildVideoVocabEntries,
  type VideoVocabEntry,
} from '@/entities/video/videoVocab'

export function useVideoVocabPractice(languageCode: string) {
  const snippets = ref<Snippet[]>([])
  const reviewFlashcards = ref<Flashcard[]>([])
  const pendingIntroductions = ref<VideoVocabEntry[]>([])
  const introducedCardIds = ref<string[]>([])
  const isSavingIntroduction = ref(false)
  const progressUpdatedAt = ref(0)
  const reviewDeckVersion = ref(0)

  const dueReviewFlashcards = computed(() => {
    const now = new Date()
    const introducedIds = new Set(introducedCardIds.value)

    return reviewFlashcards.value.filter((flashcard) => {
      const isSeenCard = !flashcardWasNeverSeenBefore(flashcard) || introducedIds.has(flashcard.cardId)
      return isSeenCard && flashcard.due <= now
    })
  })

  const currentIntroduction = computed(() =>
    dueReviewFlashcards.value.length === 0 ? (pendingIntroductions.value[0] ?? null) : null,
  )

  const reviewDeckKey = computed(() => `${reviewDeckVersion.value}`)

  async function load(videoId: string) {
    const nextSnippets = await getSnippetsOfVideo(languageCode, videoId)
    const videoVocabEntries = buildVideoVocabEntries(nextSnippets)
    const savedCards = await getSavedCardsForWords(
      languageCode,
      videoVocabEntries.map((entry) => entry.word),
    )
    const savedCardIds = new Set(savedCards.map((card) => card.cardId))

    snippets.value = nextSnippets
    reviewFlashcards.value = savedCards
    pendingIntroductions.value = videoVocabEntries.filter(
      (entry) => !savedCardIds.has(buildFlashcardId(languageCode, entry.word.original)),
    )
    introducedCardIds.value = []
    reviewDeckVersion.value += 1
  }

  async function rememberCurrentIntroduction() {
    const currentEntry = currentIntroduction.value
    if (!currentEntry || isSavingIntroduction.value) {
      return
    }

    isSavingIntroduction.value = true

    try {
      const createdCard = await createCardForWord(languageCode, currentEntry.word)
      reviewFlashcards.value = [...reviewFlashcards.value, createdCard]
      pendingIntroductions.value = pendingIntroductions.value.slice(1)
      introducedCardIds.value = [...introducedCardIds.value, createdCard.cardId]
      reviewDeckVersion.value += 1
      progressUpdatedAt.value = Date.now()
    } finally {
      isSavingIntroduction.value = false
    }
  }

  async function rateFlashcard(flashcard: Flashcard, rating: Rating) {
    const updatedCard = await applyRating(flashcard.cardId, rating, new Date())
    Object.assign(flashcard, updatedCard)
    progressUpdatedAt.value = Date.now()
  }

  return {
    currentIntroduction,
    dueReviewFlashcards,
    isSavingIntroduction,
    load,
    progressUpdatedAt,
    rateFlashcard,
    rememberCurrentIntroduction,
    reviewDeckKey,
    snippets,
  }
}
