from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import googleapiclient.discovery
from tqdm import tqdm
from youtube_transcript_api import NoTranscriptFound, TranscriptsDisabled, YouTubeTranscriptApi

from crm.course_index import ensure_course_registered, load_course
from crm.env import get_required_env_var
from crm.paths import course_work_dir, ensure_directories
ARABIC_UNICODE_RANGE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")


class EgyptVideoFinder:
    def __init__(self, api_key: str, work_dir: Path):
        self.youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=api_key)
        self.output_file = work_dir / "egypt_videos.json"
        self.processed_videos_file = work_dir / "processed_videos.json"
        self.pagination_token_file = work_dir / "pagination_token.json"
        self.processed_videos = self.load_processed_videos()
        self.next_page_token = self.load_pagination_token()

    def load_processed_videos(self) -> dict[str, bool]:
        if self.processed_videos_file.exists():
            try:
                with self.processed_videos_file.open("r", encoding="utf-8") as handle:
                    return json.load(handle)
            except Exception as exc:
                print(f"Error loading processed videos: {exc}")
        return {}

    def save_processed_videos(self) -> None:
        with self.processed_videos_file.open("w", encoding="utf-8") as handle:
            json.dump(self.processed_videos, handle, ensure_ascii=False, indent=2)

    def load_pagination_token(self) -> str | None:
        if self.pagination_token_file.exists():
            try:
                with self.pagination_token_file.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                    return data.get("nextPageToken")
            except Exception as exc:
                print(f"Error loading pagination token: {exc}")
        return None

    def save_pagination_token(self, token: str | None) -> None:
        with self.pagination_token_file.open("w", encoding="utf-8") as handle:
            json.dump({"nextPageToken": token}, handle, ensure_ascii=False, indent=2)

    def search_videos(self, max_results: int = 50) -> tuple[list[dict[str, Any]], str | None]:
        request = self.youtube.search().list(
            part="snippet",
            type="video",
            regionCode="EG",
            maxResults=max_results,
            relevanceLanguage="ar",
            videoCaption="closedCaption",
            pageToken=self.next_page_token,
        )
        response = request.execute()
        video_items = response.get("items", [])
        next_page_token = response.get("nextPageToken")

        video_ids = [item["id"]["videoId"] for item in video_items]
        if not video_ids:
            return [], next_page_token

        videos_request = self.youtube.videos().list(
            part="contentDetails,snippet,statistics",
            id=",".join(video_ids),
        )
        videos_response = videos_request.execute()
        return videos_response.get("items", []), next_page_token

    def search_videos_with_fallback(self, max_results: int = 50) -> tuple[list[dict[str, Any]], str | None]:
        videos, next_page_token = self.search_videos(max_results)
        if videos:
            return videos, next_page_token

        if next_page_token:
            self.next_page_token = next_page_token
            return self.search_videos(max_results)

        self.next_page_token = None
        self.save_pagination_token(None)

        print("No results found with EG region code. Trying SA region code...")
        request = self.youtube.search().list(
            part="snippet",
            type="video",
            regionCode="SA",
            maxResults=max_results,
            relevanceLanguage="ar",
            videoCaption="closedCaption",
        )

        response = request.execute()
        video_items = response.get("items", [])
        next_page_token = response.get("nextPageToken")
        video_ids = [item["id"]["videoId"] for item in video_items]
        if not video_ids:
            return [], next_page_token

        videos_request = self.youtube.videos().list(
            part="contentDetails,snippet,statistics",
            id=",".join(video_ids),
        )
        videos_response = videos_request.execute()
        return videos_response.get("items", []), next_page_token

    def is_arabic_video(self, video: dict[str, Any]) -> bool:
        if "snippet" in video and "defaultLanguage" in video["snippet"]:
            lang_code = video["snippet"]["defaultLanguage"]
            if lang_code and lang_code.startswith("ar"):
                return True

        if "contentDetails" in video and "defaultAudioLanguage" in video["contentDetails"]:
            lang_code = video["contentDetails"]["defaultAudioLanguage"]
            if lang_code and lang_code.startswith("ar"):
                return True

        return False

    def has_arabic_in_title(self, title: str) -> bool:
        return bool(ARABIC_UNICODE_RANGE.search(title))

    def check_transcripts(self, video_id: str) -> dict[str, bool]:
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            has_ar = False
            has_en = False

            for transcript in transcript_list:
                lang_code = transcript.language_code.split("-")[0].lower()
                if lang_code == "ar":
                    has_ar = True
                elif lang_code == "en":
                    has_en = True
                if has_ar and has_en:
                    break

            if not (has_ar and has_en):
                translation_languages = []
                try:
                    if transcript_list and hasattr(transcript_list, "translation_languages"):
                        translation_languages = [
                            lang["language_code"].split("-")[0].lower()
                            for lang in transcript_list.translation_languages
                        ]
                except Exception:
                    for transcript in transcript_list:
                        try:
                            if hasattr(transcript, "translation_languages"):
                                translation_languages.extend(
                                    [
                                        lang["language_code"].split("-")[0].lower()
                                        for lang in transcript.translation_languages
                                    ]
                                )
                        except Exception:
                            pass

                if "ar" in translation_languages:
                    has_ar = True
                if "en" in translation_languages:
                    has_en = True

            return {"ar": has_ar, "en": has_en}
        except (TranscriptsDisabled, NoTranscriptFound):
            return {"ar": False, "en": False}
        except Exception as exc:
            print(f"Error checking transcripts for video '{video_id}': {exc}")
            return {"ar": False, "en": False}

    def process_videos(self, max_results: int = 50) -> list[dict[str, Any]]:
        print(f"Searching for up to {max_results} videos with captions and in Arabic language...")
        videos, next_page_token = self.search_videos_with_fallback(max_results)
        self.next_page_token = next_page_token
        self.save_pagination_token(next_page_token)

        results = []
        new_videos_processed = 0

        for video in tqdm(videos, desc="Checking transcripts"):
            video_id = video["id"]
            if video_id in self.processed_videos:
                print(f"Skipping already processed video: {video_id}")
                continue

            title = video["snippet"]["title"]
            channel_title = video["snippet"]["channelTitle"]
            published_at = video["snippet"]["publishedAt"]

            if not self.has_arabic_in_title(title):
                print(f"Skipping video with no Arabic in title: {title}")
                self.processed_videos[video_id] = False
                new_videos_processed += 1
                continue

            is_arabic = self.is_arabic_video(video)
            if not is_arabic:
                try:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    for transcript in transcript_list:
                        if transcript.language_code.startswith("ar") and not transcript.is_generated:
                            is_arabic = True
                            break
                except Exception:
                    pass

            transcripts = self.check_transcripts(video_id)
            self.processed_videos[video_id] = transcripts["ar"] and transcripts["en"] and is_arabic
            new_videos_processed += 1

            if transcripts["ar"] and transcripts["en"] and is_arabic:
                results.append({
                    "id": video_id,
                    "title": title,
                    "channel_title": channel_title,
                    "published_at": published_at,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                })
                print(f"Found Arabic video with both Arabic and English transcripts: {title}")

        if new_videos_processed > 0:
            self.save_processed_videos()
            print(f"Processed {new_videos_processed} new videos. Total processed: {len(self.processed_videos)}")

        return results

    def save_results(self, results: list[dict[str, Any]]) -> None:
        existing_results = []
        if self.output_file.exists():
            try:
                with self.output_file.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                    existing_results = data.get("videos", [])
            except Exception as exc:
                print(f"Error loading existing results: {exc}")

        video_ids = {video["id"] for video in existing_results}
        for video in results:
            if video["id"] not in video_ids:
                existing_results.append(video)
                video_ids.add(video["id"])

        with self.output_file.open("w", encoding="utf-8") as handle:
            json.dump({"videos": existing_results}, handle, ensure_ascii=False, indent=2)

        print(f"Saved {len(existing_results)} videos to {self.output_file}")

    def run_until_target_reached(self, target_count: int = 20, max_attempts: int = 10) -> None:
        existing_count = 0
        if self.output_file.exists():
            try:
                with self.output_file.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                    existing_results = data.get("videos", [])
                    existing_count = len(existing_results)
            except Exception as exc:
                print(f"Error loading existing results: {exc}")

        print(f"Currently have {existing_count} videos. Target is {target_count}.")
        if existing_count >= target_count:
            print(f"Already have {existing_count} videos, which meets or exceeds the target of {target_count}.")
            return

        attempts = 0
        consecutive_empty_results = 0
        while existing_count < target_count and attempts < max_attempts:
            attempts += 1
            print(f"\nAttempt {attempts}/{max_attempts} to find more videos...")
            results = self.process_videos(max_results=50)
            self.save_results(results)

            if self.output_file.exists():
                try:
                    with self.output_file.open("r", encoding="utf-8") as handle:
                        data = json.load(handle)
                        existing_results = data.get("videos", [])
                        existing_count = len(existing_results)
                except Exception as exc:
                    print(f"Error loading updated results: {exc}")

            print(f"Now have {existing_count} videos. Target is {target_count}.")

            if not results:
                consecutive_empty_results += 1
                print(f"No new videos found in this batch. (Consecutive empty results: {consecutive_empty_results})")
                if consecutive_empty_results >= 3:
                    print("Resetting pagination token to start fresh...")
                    self.next_page_token = None
                    self.save_pagination_token(None)
                    consecutive_empty_results = 0
            else:
                consecutive_empty_results = 0

        if existing_count >= target_count:
            print(f"Successfully reached target of {target_count} videos!")
        else:
            print(f"Could only find {existing_count} videos after {attempts} attempts.")


def run(language_code: str, target_count: int = 20, max_attempts: int = 10) -> None:
    ensure_course_registered(language_code)
    load_course(language_code)
    if language_code != "arz":
        raise ValueError("find-videos currently only supports the 'arz' course.")

    ensure_directories(language_code)
    finder = EgyptVideoFinder(get_required_env_var("GOOGLE_API_KEY"), course_work_dir(language_code))
    finder.run_until_target_reached(target_count=target_count, max_attempts=max_attempts)
