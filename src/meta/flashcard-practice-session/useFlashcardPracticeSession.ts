import { computed, ref } from 'vue'
import { type Rating } from 'ts-fsrs'

import { buildFlashcardId, type Flashcard } from '@/entities/flashcard/flashcard'
import {
  applyRating,
  createCardForWord,
  getSavedCardsForWords,
} from '@/entities/flashcard/flashcardStore'

import type { FlashcardPracticeEntry } from './flashcardPracticeEntries'

export function useFlashcardPracticeSession(languageCode: string) {
  const entries = ref<FlashcardPracticeEntry[]>([])
  const reviewFlashcards = ref<Flashcard[]>([])
  const currentIntroduction = ref<FlashcardPracticeEntry | null>(null)
  const currentPracticeFlashcard = ref<Flashcard | null>(null)
  const currentPromptVersion = ref(0)
  const isSavingIntroduction = ref(false)
  const progressUpdatedAt = ref(0)
  const lastSeenCardId = ref<string | null>(null)

  const currentPromptKey = computed(() => `${currentPromptVersion.value}`)

  function getDueFlashcards(excludedCardId: string | null): Flashcard[] {
    const now = new Date()

    return reviewFlashcards.value.filter(
      (flashcard) => flashcard.cardId !== excludedCardId && flashcard.due <= now,
    )
  }

  function getNextIntroduction(): FlashcardPracticeEntry | null {
    const savedCardIds = new Set(
      reviewFlashcards.value.map((flashcard) => flashcard.cardId),
    )

    return entries.value.find(
      (entry) =>
        !savedCardIds.has(buildFlashcardId(languageCode, entry.word.original)),
    ) ?? null
  }

  function getNextDueFlashcard(excludedCardId: string | null): Flashcard | null {
    const dueFlashcardsById = new Map(
      getDueFlashcards(excludedCardId).map((flashcard) => [flashcard.cardId, flashcard] as const),
    )

    for (const entry of entries.value) {
      const flashcard = dueFlashcardsById.get(
        buildFlashcardId(languageCode, entry.word.original),
      )

      if (flashcard) {
        return flashcard
      }
    }

    return null
  }

  function setCurrentPrompt() {
    const nextDueFlashcard = getNextDueFlashcard(lastSeenCardId.value)

    if (nextDueFlashcard) {
      currentPracticeFlashcard.value = nextDueFlashcard
      currentIntroduction.value = null
      currentPromptVersion.value += 1
      return
    }

    currentIntroduction.value = getNextIntroduction()
    currentPracticeFlashcard.value = null
    currentPromptVersion.value += 1
  }

  function upsertReviewFlashcard(nextFlashcard: Flashcard) {
    const existingIndex = reviewFlashcards.value.findIndex(
      (flashcard) => flashcard.cardId === nextFlashcard.cardId,
    )

    if (existingIndex === -1) {
      reviewFlashcards.value = [...reviewFlashcards.value, nextFlashcard]
      return
    }

    const nextReviewFlashcards = [...reviewFlashcards.value]
    nextReviewFlashcards[existingIndex] = nextFlashcard
    reviewFlashcards.value = nextReviewFlashcards
  }

  async function load(nextEntries: FlashcardPracticeEntry[]) {
    const savedCards = await getSavedCardsForWords(
      languageCode,
      nextEntries.map((entry) => entry.word),
    )

    entries.value = nextEntries
    reviewFlashcards.value = savedCards
    currentIntroduction.value = null
    currentPracticeFlashcard.value = null
    lastSeenCardId.value = null
    setCurrentPrompt()
  }

  async function rememberCurrentIntroduction() {
    const entry = currentIntroduction.value
    if (!entry || isSavingIntroduction.value) {
      return
    }

    isSavingIntroduction.value = true

    try {
      const createdCard = await createCardForWord(languageCode, entry.word)
      upsertReviewFlashcard(createdCard)
      lastSeenCardId.value = createdCard.cardId
      progressUpdatedAt.value = Date.now()
      setCurrentPrompt()
    } finally {
      isSavingIntroduction.value = false
    }
  }

  async function rateFlashcard(flashcard: Flashcard, rating: Rating) {
    const updatedCard = await applyRating(flashcard.cardId, rating, new Date())
    upsertReviewFlashcard(updatedCard)
    Object.assign(flashcard, updatedCard)
    lastSeenCardId.value = updatedCard.cardId
    progressUpdatedAt.value = Date.now()
    setCurrentPrompt()
  }

  return {
    currentIntroduction,
    currentPracticeFlashcard,
    currentPromptKey,
    isSavingIntroduction,
    load,
    progressUpdatedAt,
    rateFlashcard,
    rememberCurrentIntroduction,
  }
}
