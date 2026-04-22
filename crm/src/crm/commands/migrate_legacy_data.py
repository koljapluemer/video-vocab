from __future__ import annotations

import json
import shutil

from crm.course_index import sync_course_index
from crm.paths import PUBLIC_DATA_ROOT, course_dir


COURSE_METADATA = {
    "arz": {
        "languageCode": "arz",
        "label": "Egyptian Arabic",
        "subtitleLanguage": "ar",
        "direction": "rtl",
    },
    "deu": {
        "languageCode": "deu",
        "label": "German",
        "subtitleLanguage": "de",
        "direction": "ltr",
    },
}

LEGACY_TO_ISO3 = {"arz": "arz", "de": "deu"}


def run() -> None:
    legacy_videos_path = PUBLIC_DATA_ROOT / "videos.json"
    legacy_out_dir = PUBLIC_DATA_ROOT / "out"

    if not legacy_videos_path.exists():
        raise FileNotFoundError(f"Legacy input not found: {legacy_videos_path}")

    with legacy_videos_path.open("r", encoding="utf-8") as handle:
        videos_data = json.load(handle)

    migrated_course_codes = []
    for legacy_code, course_data in videos_data.items():
        language_code = LEGACY_TO_ISO3.get(legacy_code, legacy_code)
        migrated_course_codes.append(language_code)
        target_dir = course_dir(language_code)
        videos_dir = target_dir / "videos"
        subtitles_dir = target_dir / "subtitles"
        target_dir.mkdir(parents=True, exist_ok=True)
        videos_dir.mkdir(parents=True, exist_ok=True)
        subtitles_dir.mkdir(parents=True, exist_ok=True)

        course_json = {
            **COURSE_METADATA[language_code],
            "videos": course_data.get("videos", []),
        }
        with (target_dir / "course.json").open("w", encoding="utf-8") as handle:
            json.dump(course_json, handle, ensure_ascii=False, indent=2)

        for video in course_data.get("videos", []):
            video_id = video["id"]
            legacy_video_path = legacy_out_dir / f"{video_id}.json"
            target_video_path = videos_dir / f"{video_id}.json"
            if legacy_video_path.exists() and not target_video_path.exists():
                shutil.move(str(legacy_video_path), str(target_video_path))

    if legacy_out_dir.exists() and not any(legacy_out_dir.iterdir()):
        legacy_out_dir.rmdir()

    ita_dir = course_dir("ita")
    ita_dir.mkdir(parents=True, exist_ok=True)
    (ita_dir / "videos").mkdir(parents=True, exist_ok=True)
    (ita_dir / "subtitles").mkdir(parents=True, exist_ok=True)
    ita_course = {
        "languageCode": "ita",
        "label": "Italian",
        "subtitleLanguage": "it",
        "direction": "ltr",
        "videos": [],
    }
    with (ita_dir / "course.json").open("w", encoding="utf-8") as handle:
        json.dump(ita_course, handle, ensure_ascii=False, indent=2)

    sync_course_index(*migrated_course_codes, "ita")

    legacy_videos_path.unlink()
    print("Legacy public/data layout migrated.")
