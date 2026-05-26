import {
  buildFlashcardPromptEntries,
  type FlashcardPromptEntry,
} from '@/entities/flashcard/flashcardPromptEntry'
import {
  buildFlashcardId,
  flashcardWasNeverSeenBefore,
  type Flashcard,
} from '@/entities/flashcard/flashcard'
import { getSavedCardsForWords } from '@/entities/flashcard/flashcardStore'
import type { Snippet } from '@/entities/snippet/snippet'

export type FlowPracticePrompt =
  | { kind: 'introduction'; entry: FlashcardPromptEntry }
  | { kind: 'flashcard'; flashcard: Flashcard }
  | { kind: 'waiting' }

export type EligibleFlowPracticePrompt = Exclude<FlowPracticePrompt, { kind: 'waiting' }>

interface SnippetWindowPromptOptions {
  excludedCardIds?: string[]
  languageCode: string
  now?: Date
  snippetIndex: number
  snippets: Snippet[]
}

interface WholeVideoPromptOptions {
  excludedCardIds?: string[]
  languageCode: string
  now?: Date
  snippets: Snippet[]
}

function buildCandidateEntries(snippets: Snippet[], snippetIndex: number): FlashcardPromptEntry[] {
  return buildFlashcardPromptEntries([
    ...(snippets[snippetIndex]?.words ?? []),
    ...(snippets[snippetIndex + 1]?.words ?? []),
  ])
}

export function buildPromptCardId(
  languageCode: string,
  prompt: EligibleFlowPracticePrompt,
): string {
  if (prompt.kind === 'flashcard') {
    return prompt.flashcard.cardId
  }

  return buildFlashcardId(languageCode, prompt.entry.word.original)
}

export function pickRandomPrompt<T>(prompts: T[]): T {
  return prompts[Math.floor(Math.random() * prompts.length)]!
}

export async function getSnippetWindowEligiblePrompts(
  options: SnippetWindowPromptOptions,
): Promise<EligibleFlowPracticePrompt[]> {
  const excludedCardIds = new Set(options.excludedCardIds ?? [])
  const candidateEntries = buildCandidateEntries(options.snippets, options.snippetIndex)
  const savedCards = await getSavedCardsForWords(
    options.languageCode,
    candidateEntries.map((entry) => entry.word),
  )
  const savedCardsById = new Map(savedCards.map((flashcard) => [flashcard.cardId, flashcard] as const))
  const eligiblePrompts: EligibleFlowPracticePrompt[] = []
  const now = options.now ?? new Date()

  for (const entry of candidateEntries) {
    const cardId = buildFlashcardId(options.languageCode, entry.word.original)
    if (excludedCardIds.has(cardId)) {
      continue
    }

    const savedCard = savedCardsById.get(cardId)
    if (!savedCard) {
      eligiblePrompts.push({ kind: 'introduction', entry })
      continue
    }

    if (savedCard.due <= now) {
      eligiblePrompts.push({ kind: 'flashcard', flashcard: savedCard })
    }
  }

  return eligiblePrompts
}

export async function pickWholeVideoDueSeenPrompt(
  options: WholeVideoPromptOptions,
): Promise<EligibleFlowPracticePrompt | null> {
  const excludedCardIds = new Set(options.excludedCardIds ?? [])
  const videoPromptEntries = buildFlashcardPromptEntries(
    options.snippets.flatMap((snippet) => snippet.words),
  )
  const savedCards = await getSavedCardsForWords(
    options.languageCode,
    videoPromptEntries.map((entry) => entry.word),
  )
  const now = options.now ?? new Date()
  const eligiblePrompts = savedCards
    .filter(
      (flashcard) =>
        !excludedCardIds.has(flashcard.cardId) &&
        !flashcardWasNeverSeenBefore(flashcard) &&
        flashcard.due <= now,
    )
    .map((flashcard) => ({ kind: 'flashcard', flashcard }) satisfies EligibleFlowPracticePrompt)

  return eligiblePrompts.length > 0 ? pickRandomPrompt(eligiblePrompts) : null
}
