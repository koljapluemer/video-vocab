const TARGET_LANGUAGE_STORAGE_KEY = 'target-language-code';

export function getStoredTargetLanguage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const languageCode = window.localStorage.getItem(TARGET_LANGUAGE_STORAGE_KEY);
  return languageCode && languageCode.trim().length > 0 ? languageCode : null;
}

export function setStoredTargetLanguage(languageCode: string): void {
  window.localStorage.setItem(TARGET_LANGUAGE_STORAGE_KEY, languageCode);
}
