# Practicing the Vocabulary of a Snippet

## User-Facing

1. The learner will practice all the vocabulary related to a snippet
  - imagine receiving a stack of flashcards, one for each word
  - *not implemented:* This should only be due flashcards, as determined by `ts-fsrs`
2. A word never seen before will first show up with the front and back shown immediately, and then at least once more
3. A word rated `Wrong` will be added again to the flashcard stack, at a random position
4. A word rated `Hard` will be added again to the back of the flashcard stack

## Tech

- all the core stuff is in the `viewFlashcard` module
- the `api.ts` may be used for some hard SR stuff
- `FlashCardsWrapper` is a component that handles the stack in itself
- `flashCardStackHandler` does the per-stack calculation
- `FlashCard` visually represents a single given flashcard

- *to be implemented:* talk to supabase 