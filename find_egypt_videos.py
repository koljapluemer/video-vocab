import os
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from tqdm import tqdm
import googleapiclient.discovery
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
YOUTUBE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Output file for the results
OUTPUT_FILE = "public/data/egypt_videos.json"
# File to track processed videos
PROCESSED_VIDEOS_FILE = "public/data/processed_videos.json"
# File to track pagination token
PAGINATION_TOKEN_FILE = "public/data/pagination_token.json"

# Arabic Unicode range
ARABIC_UNICODE_RANGE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')


class EgyptVideoFinder:
    """
    This script searches for YouTube videos from Egypt that have both Arabic and English subtitles,
    and where the main language of the video is Arabic.
    """
    
    def __init__(self, api_key: str):
        """
        Initialize the finder with a YouTube API key
        
        Args:
            api_key: YouTube Data API key
        """
        self.youtube = googleapiclient.discovery.build(
            "youtube", "v3", developerKey=api_key
        )
        self.processed_videos = self.load_processed_videos()
        self.next_page_token = self.load_pagination_token()
    
    def load_processed_videos(self) -> Dict[str, bool]:
        """
        Load the list of videos that have already been processed
        
        Returns:
            Dictionary with video IDs as keys and boolean values indicating if they have both Arabic and English transcripts
        """
        if os.path.exists(PROCESSED_VIDEOS_FILE):
            try:
                with open(PROCESSED_VIDEOS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading processed videos: {e}")
        
        return {}
    
    def save_processed_videos(self) -> None:
        """
        Save the list of processed videos to a file
        """
        os.makedirs(os.path.dirname(PROCESSED_VIDEOS_FILE), exist_ok=True)
        with open(PROCESSED_VIDEOS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.processed_videos, f, ensure_ascii=False, indent=2)
    
    def load_pagination_token(self) -> Optional[str]:
        """
        Load the pagination token from a file
        
        Returns:
            The pagination token or None if not found
        """
        if os.path.exists(PAGINATION_TOKEN_FILE):
            try:
                with open(PAGINATION_TOKEN_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("nextPageToken")
            except Exception as e:
                print(f"Error loading pagination token: {e}")
        
        return None
    
    def save_pagination_token(self, token: Optional[str]) -> None:
        """
        Save the pagination token to a file
        
        Args:
            token: The pagination token to save
        """
        os.makedirs(os.path.dirname(PAGINATION_TOKEN_FILE), exist_ok=True)
        with open(PAGINATION_TOKEN_FILE, "w", encoding="utf-8") as f:
            json.dump({"nextPageToken": token}, f, ensure_ascii=False, indent=2)
    
    def search_videos(self, max_results: int = 50) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Search for videos with captions and in Arabic language
        
        Args:
            max_results: Maximum number of results to return
            
        Returns:
            Tuple containing:
            - List of video items from the YouTube API
            - Next page token for pagination
        """
        # Search for videos with captions and in Arabic language
        # No specific search query to get videos on any topic
        request = self.youtube.search().list(
            part="snippet",
            type="video",
            regionCode="EG",
            maxResults=max_results,
            relevanceLanguage="ar",  # Set relevance language to Arabic
            videoCaption="closedCaption",  # Only videos with closed captions
            pageToken=self.next_page_token  # Use the saved pagination token
        )
        
        response = request.execute()
        video_items = response.get("items", [])
        next_page_token = response.get("nextPageToken")
        
        # Get video IDs
        video_ids = [item["id"]["videoId"] for item in video_items]
        
        if not video_ids:
            return [], next_page_token
        
        # Get detailed video information including caption tracks and language
        videos_request = self.youtube.videos().list(
            part="contentDetails,snippet,statistics",
            id=",".join(video_ids)
        )
        
        videos_response = videos_request.execute()
        return videos_response.get("items", []), next_page_token
    
    def search_videos_with_fallback(self, max_results: int = 50) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Search for videos with a fallback strategy if the initial search doesn't yield results
        
        Args:
            max_results: Maximum number of results to return
            
        Returns:
            Tuple containing:
            - List of video items from the YouTube API
            - Next page token for pagination
        """
        # Try the standard search first
        videos, next_page_token = self.search_videos(max_results)
        
        # If we got results, return them
        if videos:
            return videos, next_page_token
        
        # If we didn't get results and we have a next_page_token, try again with that token
        if next_page_token:
            self.next_page_token = next_page_token
            return self.search_videos(max_results)
        
        # If we still don't have results, try a different approach
        # Reset the pagination token to start fresh
        self.next_page_token = None
        self.save_pagination_token(None)
        
        # Try a different region code (Egypt -> Saudi Arabia)
        print("No results found with EG region code. Trying SA region code...")
        request = self.youtube.search().list(
            part="snippet",
            type="video",
            regionCode="SA",  # Try Saudi Arabia instead of Egypt
            maxResults=max_results,
            relevanceLanguage="ar",  # Set relevance language to Arabic
            videoCaption="closedCaption",  # Only videos with closed captions
        )
        
        response = request.execute()
        video_items = response.get("items", [])
        next_page_token = response.get("nextPageToken")
        
        # Get video IDs
        video_ids = [item["id"]["videoId"] for item in video_items]
        
        if not video_ids:
            return [], next_page_token
        
        # Get detailed video information including caption tracks and language
        videos_request = self.youtube.videos().list(
            part="contentDetails,snippet,statistics",
            id=",".join(video_ids)
        )
        
        videos_response = videos_request.execute()
        return videos_response.get("items", []), next_page_token
    
    def is_arabic_video(self, video: Dict[str, Any]) -> bool:
        """
        Check if the video is primarily in Arabic
        
        Args:
            video: Video information from YouTube API
            
        Returns:
            True if the video is primarily in Arabic, False otherwise
        """
        # Check if the video has a language code set to Arabic
        if "snippet" in video and "defaultLanguage" in video["snippet"]:
            lang_code = video["snippet"]["defaultLanguage"]
            if lang_code and lang_code.startswith("ar"):
                return True
        
        # Check if the video has a default audio language set to Arabic
        if "contentDetails" in video and "defaultAudioLanguage" in video["contentDetails"]:
            lang_code = video["contentDetails"]["defaultAudioLanguage"]
            if lang_code and lang_code.startswith("ar"):
                return True
        
        # If we can't determine the language from metadata, we'll check the transcripts
        # This will be done in the process_videos method
        
        return False
    
    def has_arabic_in_title(self, title: str) -> bool:
        """
        Check if the title contains Arabic script
        
        Args:
            title: The video title
            
        Returns:
            True if the title contains Arabic script, False otherwise
        """
        return bool(ARABIC_UNICODE_RANGE.search(title))
    
    def check_transcripts(self, video_id: str) -> Dict[str, bool]:
        """
        Check if a video has Arabic and English transcripts
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary with language codes as keys and boolean values indicating if transcripts exist
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Check for manually created transcripts
            has_ar = False
            has_en = False
            
            # First check manually created transcripts
            for transcript in transcript_list:
                lang_code = transcript.language_code.split("-")[0].lower()
                if lang_code == "ar":
                    has_ar = True
                elif lang_code == "en":
                    has_en = True
                
                # If we found both, we can stop checking
                if has_ar and has_en:
                    break
            
            # If we didn't find both manually, check for auto-translated ones
            if not (has_ar and has_en):
                # Get available translation languages
                translation_languages = []
                try:
                    # Try to get translation languages from the first transcript
                    if transcript_list and hasattr(transcript_list, 'translation_languages'):
                        translation_languages = [lang["language_code"].split("-")[0].lower() 
                                               for lang in transcript_list.translation_languages]
                except Exception:
                    # If that fails, try to get them from each transcript
                    for transcript in transcript_list:
                        try:
                            if hasattr(transcript, 'translation_languages'):
                                translation_languages.extend(
                                    [lang["language_code"].split("-")[0].lower() 
                                     for lang in transcript.translation_languages]
                                )
                        except Exception:
                            pass
                
                # Check if Arabic and English are available as translations
                if "ar" in translation_languages:
                    has_ar = True
                if "en" in translation_languages:
                    has_en = True
            
            return {"ar": has_ar, "en": has_en}
            
        except (TranscriptsDisabled, NoTranscriptFound):
            # These are expected exceptions for videos without transcripts
            return {"ar": False, "en": False}
        except Exception as e:
            print(f"Error checking transcripts for video '{video_id}': {e}")
            return {"ar": False, "en": False}
    
    def process_videos(self, max_results: int = 50) -> List[Dict[str, Any]]:
        """
        Process videos to find those with both Arabic and English transcripts
        and where the main language is Arabic
        
        Args:
            max_results: Maximum number of videos to search for
            
        Returns:
            List of videos with both Arabic and English transcripts
        """
        print(f"Searching for up to {max_results} videos with captions and in Arabic language...")
        videos, next_page_token = self.search_videos_with_fallback(max_results)
        
        # Save the next page token for future runs
        self.next_page_token = next_page_token
        self.save_pagination_token(next_page_token)
        
        results = []
        new_videos_processed = 0
        
        for video in tqdm(videos, desc="Checking transcripts"):
            video_id = video["id"]
            
            # Skip if we've already processed this video
            if video_id in self.processed_videos:
                print(f"Skipping already processed video: {video_id}")
                continue
            
            title = video["snippet"]["title"]
            channel_title = video["snippet"]["channelTitle"]
            published_at = video["snippet"]["publishedAt"]
            
            # Check if the title contains Arabic script
            if not self.has_arabic_in_title(title):
                print(f"Skipping video with no Arabic in title: {title}")
                self.processed_videos[video_id] = False
                new_videos_processed += 1
                continue
            
            # Check if the video is primarily in Arabic
            is_arabic = self.is_arabic_video(video)
            
            # If we can't determine the language from metadata, check the transcripts
            if not is_arabic:
                try:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    # Check if there's a manual Arabic transcript, which would indicate the video is in Arabic
                    for transcript in transcript_list:
                        if transcript.language_code.startswith("ar") and not transcript.is_generated:
                            is_arabic = True
                            break
                except Exception:
                    pass
            
            # Check if the video has both Arabic and English transcripts
            transcripts = self.check_transcripts(video_id)
            
            # Mark this video as processed
            self.processed_videos[video_id] = transcripts["ar"] and transcripts["en"] and is_arabic
            new_videos_processed += 1
            
            if transcripts["ar"] and transcripts["en"] and is_arabic:
                results.append({
                    "id": video_id,
                    "title": title,
                    "channel_title": channel_title,
                    "published_at": published_at,
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })
                print(f"Found Arabic video with both Arabic and English transcripts: {title}")
        
        # Save the updated list of processed videos
        if new_videos_processed > 0:
            self.save_processed_videos()
            print(f"Processed {new_videos_processed} new videos. Total processed: {len(self.processed_videos)}")
        
        return results
    
    def save_results(self, results: List[Dict[str, Any]]) -> None:
        """
        Save the results to a JSON file
        
        Args:
            results: List of videos with both Arabic and English transcripts
        """
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        
        # Load existing results if the file exists
        existing_results = []
        if os.path.exists(OUTPUT_FILE):
            try:
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    existing_results = data.get("videos", [])
            except Exception as e:
                print(f"Error loading existing results: {e}")
        
        # Combine existing and new results, avoiding duplicates
        video_ids = {video["id"] for video in existing_results}
        for video in results:
            if video["id"] not in video_ids:
                existing_results.append(video)
                video_ids.add(video["id"])
        
        # Save the combined results
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump({"videos": existing_results}, f, ensure_ascii=False, indent=2)
        
        print(f"Saved {len(existing_results)} videos to {OUTPUT_FILE}")
    
    def run_until_target_reached(self, target_count: int = 20, max_attempts: int = 10) -> None:
        """
        Run the video search and processing until we reach the target number of videos
        or hit the maximum number of attempts
        
        Args:
            target_count: The number of videos we want to find
            max_attempts: Maximum number of search attempts to make
        """
        # Load existing results to see how many we already have
        existing_count = 0
        if os.path.exists(OUTPUT_FILE):
            try:
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    existing_results = data.get("videos", [])
                    existing_count = len(existing_results)
            except Exception as e:
                print(f"Error loading existing results: {e}")
        
        print(f"Currently have {existing_count} videos. Target is {target_count}.")
        
        if existing_count >= target_count:
            print(f"Already have {existing_count} videos, which meets or exceeds the target of {target_count}.")
            return
        
        attempts = 0
        consecutive_empty_results = 0
        
        while existing_count < target_count and attempts < max_attempts:
            attempts += 1
            print(f"\nAttempt {attempts}/{max_attempts} to find more videos...")
            
            # Process a batch of videos
            results = self.process_videos(max_results=50)
            
            # Save the results
            self.save_results(results)
            
            # Update the count
            if os.path.exists(OUTPUT_FILE):
                try:
                    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        existing_results = data.get("videos", [])
                        existing_count = len(existing_results)
                except Exception as e:
                    print(f"Error loading updated results: {e}")
            
            print(f"Now have {existing_count} videos. Target is {target_count}.")
            
            # If we didn't find any new videos in this batch, increment the counter
            if not results:
                consecutive_empty_results += 1
                print(f"No new videos found in this batch. (Consecutive empty results: {consecutive_empty_results})")
                
                # If we've had 3 consecutive empty results, try resetting the pagination token
                if consecutive_empty_results >= 3:
                    print("Resetting pagination token to start fresh...")
                    self.next_page_token = None
                    self.save_pagination_token(None)
                    consecutive_empty_results = 0
            else:
                consecutive_empty_results = 0
        
        if existing_count >= target_count:
            print(f"✅ Successfully reached target of {target_count} videos!")
        else:
            print(f"⚠️ Could only find {existing_count} videos after {attempts} attempts.")


def main():
    """Entry point for the script"""
    if not YOUTUBE_API_KEY:
        print("Error: YOUTUBE_API_KEY environment variable not set.")
        print("Please set it in your .env file or environment.")
        return
    
    finder = EgyptVideoFinder(YOUTUBE_API_KEY)
    
    # Run until we have 20 videos that meet our criteria
    finder.run_until_target_reached(target_count=20, max_attempts=10)
    
    print("Script execution complete.")


if __name__ == "__main__":
    main() 