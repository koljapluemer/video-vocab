from __future__ import annotations

import json
import os
import re
from pathlib import Path

import deepl
from dotenv import load_dotenv
from pydantic import BaseModel
from tqdm import tqdm
from youtube_transcript_api import YouTubeTranscriptApi

from crm.course_index import load_course
from crm.paths import course_video_dir, ensure_directories


load_dotenv()
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")
translator = deepl.Translator(DEEPL_API_KEY) if DEEPL_API_KEY else None


class WordEntry(BaseModel):
    word: str
    meaning: str


def extract_words(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text, re.UNICODE)


def get_word_with_translation(word: str, context: str, lang_code: str) -> WordEntry:
    if translator is None:
        raise RuntimeError("DEEPL_API_KEY environment variable not set.")

    try:
        translation_result = translator.translate_text(
            word,
            target_lang="EN-US",
            source_lang=lang_code.upper(),
            context=context,
        )
        translation = translation_result.text
    except Exception as exc:
        print(f"Error translating word '{word}': {exc}")
        translation = ""
    return WordEntry(word=word, meaning=translation)


def select_transcript(video_id: str, lang_code: str):
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

    desired_lang = lang_code.lower()
    manual_transcript = None
    auto_transcript = None

    for transcript in transcript_list:
        transcript_lang = transcript.language_code.split("-")[0].lower()
        if transcript_lang == desired_lang:
            if not transcript.is_generated:
                manual_transcript = transcript
                break
            auto_transcript = transcript

    if manual_transcript is not None:
        return manual_transcript.fetch()
    if auto_transcript is not None:
        return auto_transcript.fetch()
    raise RuntimeError(f"No transcript available for language '{lang_code}' in video '{video_id}'")


def process_video(video_id: str, subtitle_language: str, output_dir: Path) -> None:
    output_file = output_dir / f"{video_id}.json"
    if output_file.exists():
        print(f"Skipping video {video_id} - already processed")
        return

    print(f"Processing video: {video_id}")
    try:
        transcript = select_transcript(video_id, subtitle_language)
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
        for word in extract_words(text):
            word_entry = get_word_with_translation(word, context_text, subtitle_language)
            snippet_data["words"].append({
                "native": word_entry.word,
                "translation": word_entry.meaning,
            })

        snippets.append(snippet_data)

    with output_file.open("w", encoding="utf-8") as handle:
        json.dump({"snippets": snippets}, handle, ensure_ascii=False, indent=4)
    print(f"JSON file generated for video {video_id}: {output_file}")


def run(language_code: str) -> None:
    course = load_course(language_code)
    ensure_directories(language_code)
    output_dir = course_video_dir(language_code)

    print(f"Processing videos for language: {language_code}")
    for video in tqdm(course.videos, desc=f"Processing videos for {language_code}"):
        process_video(video.id, course.subtitle_language, output_dir)

    print("JSON generation complete.")
