from __future__ import annotations

from pathlib import Path
from typing import Any

from tqdm import tqdm
from youtube_transcript_api import YouTubeTranscriptApi

from crm.course_index import load_course
from crm.paths import course_subtitle_dir, ensure_directories


def get_all_transcripts(video_id: str) -> list[tuple[Any, str, bool, bool]]:
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except Exception as exc:
        print(f"Error listing transcripts for video '{video_id}': {exc}")
        return []

    transcripts = []

    for transcript in transcript_list:
        lang_code = transcript.language_code
        is_generated = transcript.is_generated
        is_translated = False

        try:
            transcript_data = transcript.fetch()
            transcripts.append((transcript_data, lang_code, is_generated, is_translated))
        except Exception as exc:
            print(f"Error fetching transcript {lang_code} for video '{video_id}': {exc}")

    try:
        for transcript in transcript_list:
            if transcript.is_translatable:
                for lang_code in transcript_list.translation_languages:
                    try:
                        translated = transcript.translate(lang_code["language_code"])
                        transcript_data = translated.fetch()
                        transcripts.append((transcript_data, lang_code["language_code"], True, True))
                    except Exception as exc:
                        print(f"Error fetching auto-translated transcript {lang_code['language_code']} for video '{video_id}': {exc}")
    except Exception as exc:
        print(f"Error getting auto-translations for video '{video_id}': {exc}")

    return transcripts


def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def process_video(video_id: str, output_dir: Path) -> None:
    print(f"Processing video: {video_id}")
    transcripts = get_all_transcripts(video_id)

    if not transcripts:
        print(f"No transcripts available for video '{video_id}'")
        return

    for transcript_data, lang_code, is_generated, is_translated in transcripts:
        metadata = []
        if is_generated:
            metadata.append("auto")
        if is_translated:
            metadata.append("translated")

        metadata_str = "_" + "_".join(metadata) if metadata else ""
        output_file = output_dir / f"{video_id}_{lang_code}{metadata_str}.txt"
        if output_file.exists():
            print(f"Skipping transcript {lang_code} for video {video_id} - already processed")
            continue

        with output_file.open("w", encoding="utf-8") as handle:
            for segment in transcript_data:
                text = segment.get("text") if isinstance(segment, dict) else segment.text
                start = segment.get("start") if isinstance(segment, dict) else segment.start
                handle.write(f"[{format_timestamp(start)}] {text}\n")

        print(f"Text file generated for video {video_id}, language {lang_code}: {output_file}")


def run(language_code: str) -> None:
    course = load_course(language_code)
    ensure_directories(language_code)
    output_dir = course_subtitle_dir(language_code)

    print(f"Processing videos for language: {language_code}")
    for video in tqdm(course.videos, desc=f"Processing videos for {language_code}"):
        process_video(video.id, output_dir)

    print("Subtitle extraction complete.")
