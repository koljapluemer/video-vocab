from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from openai import OpenAI
from pydantic import BaseModel
from tqdm import tqdm

from crm.env import get_required_env_var
from crm.course_index import ensure_course_registered, load_course
from crm.local_translation import supports_local_translation, translate_word_to_english
from crm.paths import course_video_dir, ensure_directories
from crm.subtitle_utils import fetch_subtitle_segments

TRANSLATION_MODEL = "gpt-5.4-mini"
TRANSLATION_ATTEMPTS = 2


class WordEntry(BaseModel):
    word: str
    meaning: str


class TranslatedWord(BaseModel):
    word: str
    meaning: str


class TranslationBatch(BaseModel):
    translations: list[TranslatedWord]


def extract_words(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text, re.UNICODE)


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=get_required_env_var("OPENAI_API_KEY"))


def request_translation_batch(words: list[str], context: str, lang_code: str) -> list[WordEntry]:
    client = get_openai_client()
    response = client.responses.parse(
        model=TRANSLATION_MODEL,
        input=[
            {
                "role": "developer",
                "content": (
                    "You translate subtitle tokens into concise American English glossary meanings. "
                    "Return one item per input word in the same order. "
                    "Preserve duplicate input words as duplicate output items. "
                    "Use the surrounding subtitle context to disambiguate meaning. "
                    "Keep meanings short, plain, and dictionary-like. "
                    "Do not omit items, merge items, add explanations, or transliterate unless that is the only useful gloss."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Source language code: {lang_code}\n"
                    f"Context subtitle text: {context}\n"
                    f"Words to translate in order: {json.dumps(words, ensure_ascii=False)}"
                ),
            },
        ],
        text_format=TranslationBatch,
    )

    parsed = response.output_parsed
    if parsed is None:
        raise RuntimeError("OpenAI returned no parsed translation output.")
    if len(parsed.translations) != len(words):
        raise RuntimeError(
            f"OpenAI returned {len(parsed.translations)} translations for {len(words)} input words."
        )

    translated_words: list[WordEntry] = []
    for source_word, item in zip(words, parsed.translations):
        meaning = item.meaning.strip()
        if not meaning:
            raise RuntimeError(f"OpenAI returned a blank translation for '{source_word}'.")
        translated_words.append(WordEntry(word=source_word, meaning=meaning))

    return translated_words


def translate_words(words: list[str], context: str, lang_code: str) -> list[WordEntry]:
    if not words:
        return []

    last_error: Exception | None = None
    for attempt in range(1, TRANSLATION_ATTEMPTS + 1):
        try:
            return request_translation_batch(words, context, lang_code)
        except Exception as exc:
            last_error = exc
            if attempt < TRANSLATION_ATTEMPTS:
                print(
                    f"Retrying translation batch of {len(words)} words after attempt {attempt} failed: {exc}"
                )

    if len(words) == 1:
        print(f"Skipping untranslated word '{words[0]}' after repeated translation failures: {last_error}")
        return []

    midpoint = len(words) // 2
    print(
        f"Splitting translation batch of {len(words)} words after repeated failures: {last_error}"
    )
    return (
        translate_words(words[:midpoint], context, lang_code)
        + translate_words(words[midpoint:], context, lang_code)
    )


def translate_words_locally(words: list[str], lang_code: str) -> list[WordEntry]:
    translated_words: list[WordEntry] = []
    for word in words:
        meaning = translate_word_to_english(word, lang_code)
        if not meaning:
            raise RuntimeError(f"Local translation returned a blank result for '{word}'.")
        translated_words.append(WordEntry(word=word, meaning=meaning))
    return translated_words


def process_video(
    video_id: str,
    subtitle_language: str,
    output_dir: Path,
    use_local_translation: bool,
) -> bool:
    output_file = output_dir / f"{video_id}.json"
    if output_file.exists():
        print(f"Skipping video {video_id} - already processed")
        return False

    print(f"Processing video: {video_id}")
    try:
        transcript, selected_track = fetch_subtitle_segments(video_id, subtitle_language)
        track_kind = "auto" if selected_track.is_generated else "manual"
        print(f"Using {track_kind} subtitle track '{selected_track.language_code}' for video {video_id}")
    except Exception as exc:
        print(f"Error fetching transcript for video '{video_id}': {exc}")
        return False

    snippets = []
    for index, segment in enumerate(tqdm(transcript, desc=f"Processing snippets for video {video_id}", leave=False)):
        text = segment.get("text") if isinstance(segment, dict) else segment.text
        start = segment.get("start") if isinstance(segment, dict) else segment.start
        duration = segment.get("duration") if isinstance(segment, dict) else segment.duration

        prev_text = (
            transcript[index - 1].get("text")
            if index > 0 and isinstance(transcript[index - 1], dict)
            else (transcript[index - 1].text if index > 0 else "")
        )
        next_text = (
            transcript[index + 1].get("text")
            if index < len(transcript) - 1 and isinstance(transcript[index + 1], dict)
            else (transcript[index + 1].text if index < len(transcript) - 1 else "")
        )
        context_text = " ".join(filter(None, [prev_text, text, next_text]))

        snippet_data = {"start": start, "duration": duration, "words": []}
        words = extract_words(text)
        try:
            if use_local_translation:
                try:
                    translated_words = translate_words_locally(words, subtitle_language)
                except Exception as exc:
                    print(
                        f"Local translation failed for snippet {index} in video '{video_id}': {exc}. "
                        "Falling back to the frontier model for this snippet."
                    )
                    translated_words = translate_words(words, context_text, subtitle_language)
            else:
                translated_words = translate_words(words, context_text, subtitle_language)
        except Exception as exc:
            print(f"Error translating snippet {index} for video '{video_id}': {exc}")
            translated_words = []

        for word_entry in translated_words:
            snippet_data["words"].append({
                "native": word_entry.word,
                "translation": word_entry.meaning,
            })

        snippets.append(snippet_data)

    with output_file.open("w", encoding="utf-8") as handle:
        json.dump({"snippets": snippets}, handle, ensure_ascii=False, indent=4)
    print(f"JSON file generated for video {video_id}: {output_file}")
    return True


def run(
    language_code: str,
    use_local_translation: bool = False,
    stop_after_one_new: bool = False,
) -> None:
    ensure_course_registered(language_code)
    course = load_course(language_code)
    ensure_directories(language_code)
    output_dir = course_video_dir(language_code)

    local_translation_enabled = use_local_translation and supports_local_translation(course.subtitle_language)
    if use_local_translation and not local_translation_enabled:
        print(
            f"Local translation is not available for subtitle language '{course.subtitle_language}'. "
            "Falling back to the frontier model."
        )
    if local_translation_enabled:
        print(
            f"Using local translation for subtitle language '{course.subtitle_language}' with English output."
        )

    print(f"Processing videos for language: {language_code}")
    for video in tqdm(course.videos, desc=f"Processing videos for {language_code}"):
        processed_new_video = process_video(
            video.id,
            course.subtitle_language,
            output_dir,
            use_local_translation=local_translation_enabled,
        )
        if stop_after_one_new and processed_new_video:
            print("Stopped after processing one new video.")
            break

    print("JSON generation complete.")
