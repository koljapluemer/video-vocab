from __future__ import annotations

import json
import re
from pathlib import Path

from openai import OpenAI
from pydantic import BaseModel
from tqdm import tqdm

from crm.env import get_required_env_var
from crm.course_index import ensure_course_registered, load_course
from crm.paths import course_video_dir, ensure_directories
from crm.subtitle_utils import fetch_subtitle_segments
TRANSLATION_MODEL = "gpt-5.4-mini"


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


def translate_words(words: list[str], context: str, lang_code: str) -> list[WordEntry]:
    client = OpenAI(api_key=get_required_env_var("OPENAI_API_KEY"))
    if not words:
        return []

    response = client.responses.parse(
        model=TRANSLATION_MODEL,
        input=[
            {
                "role": "developer",
                "content": (
                    "You translate subtitle tokens into concise American English glossary meanings. "
                    "Return one item per input word in the same order. "
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

    return [WordEntry(word=item.word, meaning=item.meaning) for item in parsed.translations]


def process_video(video_id: str, subtitle_language: str, output_dir: Path) -> None:
    output_file = output_dir / f"{video_id}.json"
    if output_file.exists():
        print(f"Skipping video {video_id} - already processed")
        return

    print(f"Processing video: {video_id}")
    try:
        transcript, selected_track = fetch_subtitle_segments(video_id, subtitle_language)
        track_kind = "auto" if selected_track.is_generated else "manual"
        print(f"Using {track_kind} subtitle track '{selected_track.language_code}' for video {video_id}")
    except Exception as exc:
        print(f"Error fetching transcript for video '{video_id}': {exc}")
        return

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
        translated_words = translate_words(words, context_text, subtitle_language)
        for word_entry in translated_words:
            snippet_data["words"].append({
                "native": word_entry.word,
                "translation": word_entry.meaning,
            })

        snippets.append(snippet_data)

    with output_file.open("w", encoding="utf-8") as handle:
        json.dump({"snippets": snippets}, handle, ensure_ascii=False, indent=4)
    print(f"JSON file generated for video {video_id}: {output_file}")


def run(language_code: str) -> None:
    ensure_course_registered(language_code)
    course = load_course(language_code)
    ensure_directories(language_code)
    output_dir = course_video_dir(language_code)

    print(f"Processing videos for language: {language_code}")
    for video in tqdm(course.videos, desc=f"Processing videos for {language_code}"):
        process_video(video.id, course.subtitle_language, output_dir)

    print("JSON generation complete.")
