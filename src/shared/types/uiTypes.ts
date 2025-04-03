export const FlashCardButtons = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
  seen: 'I Will Remember'
} as const

export type FlashCardButtonLabel = keyof typeof FlashCardButtons
