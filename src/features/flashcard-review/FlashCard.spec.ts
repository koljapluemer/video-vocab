import { cleanup, render, fireEvent } from '@testing-library/vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { Flashcard } from '@/entities/flashcard/flashcard'
import { createFlashcard as createEntityFlashcard } from '@/entities/flashcard/flashcard'
import IndexCard from '@/dumb/index-card/IndexCard.vue'

import FlashCard from './FlashCard.vue'

function createFlashcard(overrides?: Partial<Flashcard>): Flashcard {
  return {
    ...createEntityFlashcard('hola', ['hello', 'hi']),
    original: 'hola',
    meanings: ['hello', 'hi'],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('IndexCard', () => {
  it('renders text rows, subtext, and dividers', () => {
    const { getByText, getByTestId, getAllByTestId } = render(IndexCard, {
      props: {
        rows: [
          { type: 'text', text: 'hola', size: 'auto', subtext: 'oh-la' },
          { type: 'divider' },
          { type: 'text', text: 'hello', size: 'normal' },
        ],
      },
    })

    expect(getByTestId('index-card')).toBeTruthy()
    expect(getByText('hola')).toBeTruthy()
    expect(getByText('oh-la')).toBeTruthy()
    expect(getAllByTestId('index-card-divider')).toHaveLength(1)
  })

  it('applies auto sizing and animation classes', () => {
    const { getByTestId, getByText } = render(IndexCard, {
      props: {
        rows: [{ type: 'text', text: 'hi', size: 'auto' }],
        flipped: true,
        swiped: true,
      },
    })

    expect(getByTestId('index-card').className).toContain('index-card--flipped')
    expect(getByTestId('index-card').className).toContain('index-card--swiped')
    expect(getByText('hi').className).toContain('text-7xl')
  })
})

describe('FlashCard', () => {
  it('shows only the target word before reveal, then all meanings after reveal', async () => {
    const { getByText, queryByText, getByTestId } = render(FlashCard, {
      props: {
        flashcard: createFlashcard(),
      },
    })

    expect(getByText('hola')).toBeTruthy()
    expect(queryByText('hello')).toBeNull()

    await fireEvent.click(getByTestId('action-reveal'))

    expect(getByText('hello')).toBeTruthy()
    expect(getByText('hi')).toBeTruthy()
  })

  it('resets reveal state when flashcard changes', async () => {
    const { getByTestId, queryByText, rerender } = render(FlashCard, {
      props: {
        flashcard: createFlashcard(),
      },
    })

    await fireEvent.click(getByTestId('action-reveal'))
    expect(queryByText('hello')).not.toBeNull()

    await rerender({
      flashcard: createFlashcard({ original: 'adios', meanings: ['bye'] }),
    })

    expect(queryByText('bye')).toBeNull()
  })
})
