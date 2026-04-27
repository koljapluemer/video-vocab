from __future__ import annotations

from functools import lru_cache

from langcodes import Language

ENGLISH_ARGO_CODE = "en"


@lru_cache(maxsize=1)
def _get_installed_pairs() -> set[tuple[str, str]]:
    try:
        from argostranslate import package
    except ImportError:
        return set()

    return {
        (installed.from_code, installed.to_code)
        for installed in package.get_installed_packages()
        if installed.from_code and installed.to_code
    }


def _to_argos_language_code(language_code: str) -> str | None:
    try:
        normalized = Language.get(language_code)
    except Exception:
        return None

    base_language = normalized.language
    if not base_language or base_language == "und":
        return None
    return base_language


def _ensure_installed_pair(source_code: str, target_code: str) -> bool:
    direct_pair = (source_code, target_code)
    installed_pairs = _get_installed_pairs()
    if direct_pair in installed_pairs:
        return True

    try:
        from argostranslate import package
    except ImportError:
        return False

    print(f"Installing Argos translation package {source_code}->{target_code}...")
    try:
        package.update_package_index()
        if not package.install_package_for_language_pair(source_code, target_code):
            return False
    except Exception as exc:
        print(f"Failed to install Argos translation package {source_code}->{target_code}: {exc}")
        return False

    _get_installed_pairs.cache_clear()
    return direct_pair in _get_installed_pairs()


def _resolve_language_pair(source_language: str) -> tuple[str, str] | None:
    source_code = _to_argos_language_code(source_language)
    if source_code is None:
        return None

    direct_pair = (source_code, ENGLISH_ARGO_CODE)
    if _ensure_installed_pair(*direct_pair):
        return direct_pair

    return None


def supports_local_translation(source_language: str) -> bool:
    return _resolve_language_pair(source_language) is not None


def translate_word_to_english(word: str, source_language: str) -> str | None:
    pair = _resolve_language_pair(source_language)
    if pair is None:
        return None

    try:
        from argostranslate import translate
    except ImportError:
        return None

    source_code, target_code = pair[0], pair[1]
    translated = translate.translate(word, source_code, target_code).strip()
    return translated or None
