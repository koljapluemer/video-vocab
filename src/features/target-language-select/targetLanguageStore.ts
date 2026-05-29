import { contextPracticeDb } from '@/db/contextPracticeDb'

const TARGET_LANGUAGE_KEY = 'targetLanguageCode'
const LEGACY_TARGET_LANGUAGE_STORAGE_KEY = 'target-language-code'

export async function bootstrapLegacyTargetLanguage() {
  const existingLanguageCode = await getStoredTargetLanguage()
  const legacyLanguageCode = window.localStorage.getItem(LEGACY_TARGET_LANGUAGE_STORAGE_KEY)?.trim() ?? ''

  if (!existingLanguageCode && legacyLanguageCode) {
    await setStoredTargetLanguage(legacyLanguageCode)
  }

  window.localStorage.removeItem(LEGACY_TARGET_LANGUAGE_STORAGE_KEY)
}

export async function getStoredTargetLanguage(): Promise<string | null> {
  const setting = await contextPracticeDb.settings.get(TARGET_LANGUAGE_KEY)

  return setting?.value?.trim() ? setting.value : null
}

export async function setStoredTargetLanguage(languageCode: string) {
  await contextPracticeDb.settings.put({
    key: TARGET_LANGUAGE_KEY,
    value: languageCode.trim(),
  })
}
