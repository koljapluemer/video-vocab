from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from crm.paths import PUBLIC_DATA_ROOT, course_file


@dataclass(frozen=True)
class CourseVideo:
    id: str


@dataclass(frozen=True)
class CourseDefinition:
    language_code: str
    label: str
    subtitle_language: str
    direction: str
    videos: list[CourseVideo]


def _read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def available_course_codes() -> list[str]:
    index_path = PUBLIC_DATA_ROOT / "index.json"
    data = _read_json(index_path)
    return data.get("courses", [])


def load_course(language_code: str) -> CourseDefinition:
    path = course_file(language_code)
    if not path.exists():
        raise FileNotFoundError(f"Course file not found: {path}")

    data = _read_json(path)
    videos = [
        CourseVideo(id=video["id"])
        for video in data.get("videos", [])
    ]
    return CourseDefinition(
        language_code=data["languageCode"],
        label=data["label"],
        subtitle_language=data["subtitleLanguage"],
        direction=data["direction"],
        videos=videos,
    )
