from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
CRM_ROOT = REPO_ROOT / "crm"
PUBLIC_DATA_ROOT = REPO_ROOT / "public" / "data"
CRM_DATA_ROOT = CRM_ROOT / "data"
CRM_WORK_ROOT = CRM_DATA_ROOT / "work"
CRM_CACHE_ROOT = CRM_DATA_ROOT / "cache"
CRM_EXPORTS_ROOT = CRM_DATA_ROOT / "exports"


def course_dir(language_code: str) -> Path:
    return PUBLIC_DATA_ROOT / language_code


def course_file(language_code: str) -> Path:
    return course_dir(language_code) / "course.json"


def course_video_dir(language_code: str) -> Path:
    return course_dir(language_code) / "videos"


def course_subtitle_dir(language_code: str) -> Path:
    return course_dir(language_code) / "subtitles"


def course_work_dir(language_code: str) -> Path:
    return CRM_WORK_ROOT / language_code


def ensure_directories(language_code: str) -> None:
    course_video_dir(language_code).mkdir(parents=True, exist_ok=True)
    course_subtitle_dir(language_code).mkdir(parents=True, exist_ok=True)
    course_work_dir(language_code).mkdir(parents=True, exist_ok=True)
    CRM_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    CRM_EXPORTS_ROOT.mkdir(parents=True, exist_ok=True)
