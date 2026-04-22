from __future__ import annotations

from xml.etree.ElementTree import ParseError

from youtube_transcript_api import YouTubeTranscriptApi


def describe_transcript_error(video_id: str, exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()

    if isinstance(exc, ParseError) or "no element found" in lowered:
        return (
            f"Transcript API returned an empty or invalid response for video '{video_id}'. "
            "This usually means YouTube blocked the request, rate-limited it, or the video's transcript endpoint behaved unexpectedly."
        )

    if "subtitles are disabled" in lowered or "transcriptsdisabled" in lowered:
        return f"Transcripts are disabled for video '{video_id}'."

    if "no transcript found" in lowered or "notranscriptfound" in lowered:
        return f"No matching transcript is available for video '{video_id}'."

    return f"Transcript request failed for video '{video_id}': {message}"


def list_transcripts_or_raise(video_id: str):
    try:
        return YouTubeTranscriptApi.list_transcripts(video_id)
    except Exception as exc:
        raise RuntimeError(describe_transcript_error(video_id, exc)) from exc
