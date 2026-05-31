import type { ContextRound } from './loadRandomContextRound'

export type ContextExerciseKind =
  | 'look-for-vocabulary'
  | 'meaning'
  | 'repeat'
  | 'vibe'

export type ContextExerciseResponseMode = 'text' | 'audio'

export interface ContextExerciseTemplate {
  kind: ContextExerciseKind
  weight: number
  responseMode: ContextExerciseResponseMode
  isEligible: (round: ContextRound) => boolean
  preInstruction: string
  postQuestion?: string
}

const contextExerciseTemplates: ContextExerciseTemplate[] = [
  {
    kind: 'look-for-vocabulary',
    weight: 5,
    responseMode: 'text',
    isEligible: (round) => round.words.length === 3,
    preInstruction: 'See how these words are used in the clip.',
    postQuestion: 'How was the vocabulary that you just saw used?',
  },
  {
    kind: 'meaning',
    weight: 2,
    responseMode: 'text',
    isEligible: () => true,
    preInstruction: 'Try to understand the gist of what was said.',
    postQuestion: 'What did you understand?',
  },
  {
    kind: 'repeat',
    weight: 2,
    responseMode: 'audio',
    isEligible: () => true,
    preInstruction: 'Try to memorize the words and sound of part of this clip, then repeat it.',
  },
  {
    kind: 'vibe',
    weight: 1,
    responseMode: 'text',
    isEligible: () => true,
    preInstruction: 'Listen and watch for gestures, tone, mood, and other non-verbal cues.',
    postQuestion: 'What did you notice?',
  },
]

export function pickContextExerciseTemplate(round: ContextRound): ContextExerciseTemplate {
  const eligibleTemplates = contextExerciseTemplates.filter((template) => template.isEligible(round))

  if (eligibleTemplates.length === 0) {
    throw new Error('No exercise template available.')
  }

  const totalWeight = eligibleTemplates.reduce(
    (sum, template) => sum + Math.max(0, template.weight),
    0,
  )

  if (totalWeight <= 0) {
    return eligibleTemplates[0]
  }

  let remainingWeight = Math.random() * totalWeight

  for (const template of eligibleTemplates) {
    remainingWeight -= Math.max(0, template.weight)
    if (remainingWeight < 0) {
      return template
    }
  }

  return eligibleTemplates[eligibleTemplates.length - 1]
}
