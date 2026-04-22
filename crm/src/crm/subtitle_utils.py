from __future__ import annotations

import html
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError


TAG_RE = re.compile(r"<[^>]+>")
TIMECODE_RE = re.compile(
    r"^(?P<start>\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(?P<end>\d{2}:\d{2}:\d{2}\.\d{3})"
)


@dataclass(frozen=True)
class SubtitleTrack:
    language_code: str
    is_generated: bool


def _youtube_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def _ydl_options() -> dict:
    return {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "subtitlesformat": "vtt/best",
    }


def describe_subtitle_error(video_id: str, exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()

    if "requested format is not available" in lowered:
        return f"No downloadable subtitle track matched the requested language for video '{video_id}'."
    if "video unavailable" in lowered:
        return f"Video '{video_id}' is unavailable."
    if "sign in to confirm your age" in lowered:
        return f"Video '{video_id}' is age-restricted and yt-dlp could not access subtitles without authentication."
    if "private video" in lowered:
        return f"Video '{video_id}' is private."
    return f"Subtitle request failed for video '{video_id}': {message}"


def list_available_subtitle_tracks(video_id: str) -> list[SubtitleTrack]:
    try:
        with YoutubeDL(_ydl_options()) as ydl:
            info = ydl.extract_info(_youtube_url(video_id), download=False)
    except DownloadError as exc:
        raise RuntimeError(describe_subtitle_error(video_id, exc)) from exc

    tracks: list[SubtitleTrack] = []
    for language_code in sorted((info.get("subtitles") or {}).keys()):
        tracks.append(SubtitleTrack(language_code=language_code, is_generated=False))
    for language_code in sorted((info.get("automatic_captions") or {}).keys()):
        tracks.append(SubtitleTrack(language_code=language_code, is_generated=True))
    return tracks


def _language_matches(track_language: str, desired_language: str) -> bool:
    track_base = track_language.split("-")[0].lower()
    desired_base = desired_language.split("-")[0].lower()
    return track_language.lower() == desired_language.lower() or track_base == desired_base


def select_preferred_subtitle_track(video_id: str, language_code: str) -> SubtitleTrack:
    tracks = list_available_subtitle_tracks(video_id)

    for is_generated in (False, True):
        for track in tracks:
            if track.is_generated == is_generated and _language_matches(track.language_code, language_code):
                return track

    raise RuntimeError(f"No subtitle track available for language '{language_code}' in video '{video_id}'.")


def _download_track_text(video_id: str, track: SubtitleTrack) -> tuple[str, str]:
    with tempfile.TemporaryDirectory(prefix=f"yt-dlp-{video_id}-") as temp_dir:
        ydl_options = {
            **_ydl_options(),
            "writesubtitles": not track.is_generated,
            "writeautomaticsub": track.is_generated,
            "subtitleslangs": [track.language_code],
            "outtmpl": f"{temp_dir}/%(id)s",
        }

        try:
            with YoutubeDL(ydl_options) as ydl:
                ydl.download([_youtube_url(video_id)])
        except DownloadError as exc:
            raise RuntimeError(describe_subtitle_error(video_id, exc)) from exc

        candidates = sorted(Path(temp_dir).glob("*.vtt"))
        if not candidates:
            raise RuntimeError(
                f"yt-dlp did not produce a VTT subtitle file for video '{video_id}' and language '{track.language_code}'."
            )

        subtitle_file = candidates[0]
        return subtitle_file.read_text(encoding="utf-8"), subtitle_file.name


def _parse_timestamp(value: str) -> float:
    hours, minutes, seconds = value.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _clean_cue_text(lines: list[str]) -> str:
    text = " ".join(line.strip() for line in lines if line.strip())
    text = TAG_RE.sub("", text)
    return html.unescape(text).strip()


def parse_vtt_segments(vtt_text: str) -> list[dict[str, float | str]]:
    segments: list[dict[str, float | str]] = []
    cue_lines: list[str] = []
    start: float | None = None
    end: float | None = None

    def flush() -> None:
        nonlocal cue_lines, start, end
        if start is None or end is None:
            cue_lines = []
            return
        text = _clean_cue_text(cue_lines)
        if text:
            segments.append({
                "text": text,
                "start": start,
                "duration": max(0.0, end - start),
            })
        cue_lines = []
        start = None
        end = None

    for raw_line in vtt_text.splitlines():
        line = raw_line.strip("\ufeff").strip()
        if not line:
            flush()
            continue
        if line == "WEBVTT" or line.startswith(("NOTE", "STYLE", "REGION")):
            continue
        if "-->" in line:
            match = TIMECODE_RE.match(line)
            if not match:
                continue
            start = _parse_timestamp(match.group("start"))
            end = _parse_timestamp(match.group("end"))
            continue
        if start is None and line.isdigit():
            continue
        cue_lines.append(line)

    flush()
    return segments


def fetch_subtitle_segments(video_id: str, language_code: str) -> tuple[list[dict[str, float | str]], SubtitleTrack]:
    track = select_preferred_subtitle_track(video_id, language_code)
    subtitle_text, subtitle_file_name = _download_track_text(video_id, track)
    segments = parse_vtt_segments(subtitle_text)
    if not segments:
        raise RuntimeError(
            f"yt-dlp downloaded subtitle file '{subtitle_file_name}' for video '{video_id}', but it contained no parseable cues."
        )
    return segments, track


def download_subtitle_track(video_id: str, track: SubtitleTrack) -> tuple[str, str]:
    return _download_track_text(video_id, track)
