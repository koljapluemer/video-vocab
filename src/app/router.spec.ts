import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getStoredTargetLanguage, setStoredTargetLanguage } = vi.hoisted(() => ({
  getStoredTargetLanguage: vi.fn(),
  setStoredTargetLanguage: vi.fn(),
}))

vi.mock('@/features/target-language-select/targetLanguageStorage', () => ({
  getStoredTargetLanguage,
  setStoredTargetLanguage,
}))

describe('router', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    getStoredTargetLanguage.mockReset()
    setStoredTargetLanguage.mockReset()
    getStoredTargetLanguage.mockReturnValue('deu')
  })

  afterEach(async () => {
    const { default: router } = await import('./router')
    await router.replace('/')
  })

  it('stores the language from the URL and redirects to the video list', async () => {
    const { default: router } = await import('./router')

    await router.push('/target-language/fra')
    await router.isReady()

    expect(setStoredTargetLanguage).toHaveBeenCalledWith('fra')
    expect(router.currentRoute.value.name).toBe('video-list')
  })

  it('redirects blank language codes back to language selection', async () => {
    const { default: router } = await import('./router')

    await router.push('/target-language/%20')
    await router.isReady()

    expect(setStoredTargetLanguage).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('target-language')
  })
})
