import os
import json
from tqdm import tqdm
from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Tuple, Dict, Any, Optional

# Input JSON file containing video IDs per language
INPUT_JSON = "public/data/videos.json"
# Output folder where text files will be written
OUTPUT_FOLDER = "public/data/subtitles"


class SubtitleExtractor:
    """
    This script processes each video ID by fetching all available transcripts
    and saving them as plain text files with timestamps and language codes.
    """
    
    def get_all_transcripts(self, video_id: str) -> List[Tuple[Any, str, bool, bool]]:
        """
        Gets all available transcripts for a video, including auto-translated ones.
        
        Args:
            video_id: The YouTube video ID
            
        Returns:
            A list of tuples (transcript_data, language_code, is_generated, is_translated)
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception as e:
            print(f"Error listing transcripts for video '{video_id}': {e}")
            return []
        
        transcripts = []
        
        # Get manually created transcripts
        for transcript in transcript_list:
            lang_code = transcript.language_code
            is_generated = transcript.is_generated
            is_translated = False
            
            try:
                transcript_data = transcript.fetch()
                transcripts.append((transcript_data, lang_code, is_generated, is_translated))
            except Exception as e:
                print(f"Error fetching transcript {lang_code} for video '{video_id}': {e}")
        
        # Get auto-translated transcripts
        try:
            for transcript in transcript_list:
                if transcript.is_translatable:
                    for lang_code in transcript_list.translation_languages:
                        try:
                            translated = transcript.translate(lang_code['language_code'])
                            transcript_data = translated.fetch()
                            transcripts.append((transcript_data, lang_code['language_code'], True, True))
                        except Exception as e:
                            print(f"Error fetching auto-translated transcript {lang_code['language_code']} for video '{video_id}': {e}")
        except Exception as e:
            print(f"Error getting auto-translations for video '{video_id}': {e}")
        
        return transcripts

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        """
        Convert seconds to HH:MM:SS format
        
        Args:
            seconds: Time in seconds
            
        Returns:
            Formatted timestamp string
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    def process_video(self, video_id: str) -> None:
        """
        Process a single video by fetching all available transcripts and saving them
        
        Args:
            video_id: The YouTube video ID
        """
        print(f"Processing video: {video_id}")
        
        # Get all available transcripts
        transcripts = self.get_all_transcripts(video_id)
        
        if not transcripts:
            print(f"No transcripts available for video '{video_id}'")
            return
        
        # Create output directory if it doesn't exist
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)
        
        # Process each transcript
        for transcript_data, lang_code, is_generated, is_translated in transcripts:
            # Create filename with language code and metadata
            metadata = []
            if is_generated:
                metadata.append("auto")
            if is_translated:
                metadata.append("translated")
            
            metadata_str = "_" + "_".join(metadata) if metadata else ""
            output_file = os.path.join(OUTPUT_FOLDER, f"{video_id}_{lang_code}{metadata_str}.txt")
            
            # Skip if already processed
            if os.path.exists(output_file):
                print(f"Skipping transcript {lang_code} for video {video_id} - already processed")
                continue
            
            # Write the transcript to a text file with timestamps
            with open(output_file, "w", encoding="utf-8") as f:
                for segment in transcript_data:
                    # Depending on the transcript format, segment can be a dict or an object
                    text = segment.get("text") if isinstance(segment, dict) else segment.text
                    start = segment.get("start") if isinstance(segment, dict) else segment.start
                    duration = segment.get("duration") if isinstance(segment, dict) else segment.duration
                    
                    # Format the timestamp
                    timestamp = self.format_timestamp(start)
                    
                    # Write the timestamp and text
                    f.write(f"[{timestamp}] {text}\n")
            
            print(f"Text file generated for video {video_id}, language {lang_code}: {output_file}")

    def handle(self) -> None:
        """
        Main entry point for the script
        """
        if not os.path.exists(INPUT_JSON):
            print(f"Input JSON file {INPUT_JSON} does not exist.")
            return

        # Read the videos.json file
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            videos_data = json.load(f)

        # Process each language and its videos
        for lang_code, lang_data in videos_data.items():
            videos = lang_data.get("videos", [])
            
            print(f"Processing videos for language: {lang_code}")
            for video in tqdm(videos, desc=f"Processing videos for {lang_code}"):
                video_id = video.get("id")
                if video_id:
                    self.process_video(video_id)

        print("✅ Subtitle extraction complete!")


def main():
    """Entry point for the script"""
    SubtitleExtractor().handle()


if __name__ == "__main__":
    main() 