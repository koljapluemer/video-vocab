from __future__ import annotations

from pathlib import Path

from tqdm import tqdm

from crm.course_index import ensure_course_registered, load_course
from crm.paths import course_subtitle_dir, ensure_directories
from crm.subtitle_utils import SubtitleTrack, download_subtitle_track, list_available_subtitle_tracks, parse_vtt_segments


def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def write_subtitle_text(
    video_id: str,
    track: SubtitleTrack,
    segments: list[dict[str, float | str]],
    output_dir: Path,
) -> None:
    metadata = []
    if track.is_generated:
        metadata.append("auto")

    metadata_str = "_" + "_".join(metadata) if metadata else ""
    output_file = output_dir / f"{video_id}_{track.language_code}{metadata_str}.txt"
    if output_file.exists():
        print(f"Skipping transcript {track.language_code} for video {video_id} - already processed")
        return

    with output_file.open("w", encoding="utf-8") as handle:
        for segment in segments:
            handle.write(f"[{format_timestamp(float(segment['start']))}] {segment['text']}\n")

    print(f"Text file generated for video {video_id}, language {track.language_code}: {output_file}")


def process_video(video_id: str, output_dir: Path) -> None:
    print(f"Processing video: {video_id}")
    try:
        tracks = list_available_subtitle_tracks(video_id)
    except Exception as exc:
        print(exc)
        return

    if not tracks:
        print(f"No subtitles available for video '{video_id}'")
        return

    for track in tracks:
        try:
            subtitle_text, _ = download_subtitle_track(video_id, track)
            segments = parse_vtt_segments(subtitle_text)
            if not segments:
                print(
                    f"Downloaded subtitle track '{track.language_code}' for video '{video_id}', "
                    "but it contained no parseable cues."
                )
                continue
            write_subtitle_text(video_id, track, segments, output_dir)
        except Exception as exc:
            print(f"Error fetching subtitle '{track.language_code}' for video '{video_id}': {exc}")


def run(language_code: str) -> None:
    ensure_course_registered(language_code)
    course = load_course(language_code)
    ensure_directories(language_code)
    output_dir = course_subtitle_dir(language_code)

    print(f"Processing videos for language: {language_code}")
    for video in tqdm(course.videos, desc=f"Processing videos for {language_code}"):
        process_video(video.id, output_dir)

    print("Subtitle extraction complete.")
