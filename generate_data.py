import os
import re
import json
from tqdm import tqdm
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List
import deepl

# Input JSON file containing video IDs per language
INPUT_JSON = "public/data/videos.json"
# Output folder where JSON files will be written
OUTPUT_FOLDER = "public/data/out"

# Load environment variables from the .env file
load_dotenv()
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY")  # ensure this is set in your environment
translator = deepl.Translator(DEEPL_API_KEY)

class WordEntry(BaseModel):
    word: str
    meaning: str

class Command:
    """
    This command processes each video ID by fetching its transcript,
    splitting each snippet into words, translating each word with context,
    and then outputting one JSON file per video with the following structure:

    {
        "snippets": [
            {
                "start": <float>,
                "duration": <float>,
                "words": [
                    {"native": <word>, "translation": <translation>},
                    ...
                ]
            },
            ...
        ]
    }
    """
    def extract_words(self, text: str) -> List[str]:
        # Adjust regex if necessary
        return re.findall(r'\b\w+\b', text, re.UNICODE)

    def get_word_with_translation(self, word: str, context: str, lang_code: str) -> WordEntry:
        try:
            source_lang = lang_code.upper()  # Use the language code provided
            target_lang = "EN-US"  # Target language set to American English
            translation_result = translator.translate_text(
                word,
                target_lang=target_lang,
                source_lang=source_lang,
                context=context
            )
            translation = translation_result.text
        except Exception as e:
            print(f"Error translating word '{word}': {e}")
            translation = ""
        return WordEntry(word=word, meaning=translation)

    def select_transcript(self, video_id: str, lang_code: str):
        """
        Selects the best transcript:
          1. Prefer a manual transcript (if available) matching the language.
          2. Otherwise, use an auto-generated transcript.
          3. Raise an error if no transcript is found.
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception as e:
            raise Exception(f"Error listing transcripts for video '{video_id}': {e}")

        desired_lang = lang_code.lower()
        manual_transcript = None
        auto_transcript = None

        for transcript in transcript_list:
            transcript_lang = transcript.language_code.split("-")[0].lower()
            if transcript_lang == desired_lang:
                if not transcript.is_generated:
                    manual_transcript = transcript
                    break
                else:
                    auto_transcript = transcript

        if manual_transcript is not None:
            return manual_transcript.fetch()
        elif auto_transcript is not None:
            return auto_transcript.fetch()
        else:
            raise Exception(f"No transcript available for language '{lang_code}' in video '{video_id}'")

    def process_video(self, video_id: str, lang_code: str) -> None:
        # Check if video has already been processed
        output_file = os.path.join(OUTPUT_FOLDER, f"{video_id}.json")
        if os.path.exists(output_file):
            print(f"Skipping video {video_id} - already processed")
            return

        print("Processing video:", video_id)
        try:
            transcript = self.select_transcript(video_id, lang_code)
        except Exception as e:
            print(f"Error fetching transcript for video '{video_id}': {e}")
            return

        snippets = []
        for index, segment in enumerate(tqdm(transcript, desc=f"Processing snippets for video {video_id}", leave=False)):
            # Depending on the transcript format, segment can be a dict or an object.
            text = segment.get("text") if isinstance(segment, dict) else segment.text
            start = segment.get("start") if isinstance(segment, dict) else segment.start
            duration = segment.get("duration") if isinstance(segment, dict) else segment.duration

            # Build context: previous snippet (if exists), current, and next snippet (if exists)
            prev_text = (
                transcript[index - 1].get("text")
                if index > 0 and isinstance(transcript[index - 1], dict)
                else (transcript[index - 1].text if index > 0 else "")
            )
            next_text = (
                transcript[index + 1].get("text")
                if index < len(transcript) - 1 and isinstance(transcript[index + 1], dict)
                else (transcript[index + 1].text if index < len(transcript) - 1 else "")
            )
            context_text = " ".join(filter(None, [prev_text, text, next_text]))

            snippet_data = {
                "start": start,
                "duration": duration,
                "words": []
            }

            # Extract words from the snippet text.
            words = self.extract_words(text)
            for word in words:
                word_entry = self.get_word_with_translation(word, context_text, lang_code)
                snippet_data["words"].append({
                    "native": word_entry.word,
                    "translation": word_entry.meaning
                })

            snippets.append(snippet_data)

        # Write out the JSON file for this video.
        output_data = {"snippets": snippets}
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)
        output_file = os.path.join(OUTPUT_FOLDER, f"{video_id}.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)
        print(f"JSON file generated for video {video_id}: {output_file}")

    def handle(self):
        if not os.path.exists(INPUT_JSON):
            print(f"Input JSON file {INPUT_JSON} does not exist.")
            return

        # Read the videos.json file
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            videos_data = json.load(f)

        # Process each language and its videos
        for lang_code, lang_data in videos_data.items():
            subtitle_lang = lang_data.get("subtitle_language", lang_code)
            videos = lang_data.get("videos", [])
            
            print(f"Processing videos for language: {lang_code}")
            for video in tqdm(videos, desc=f"Processing videos for {lang_code}"):
                video_id = video.get("id")
                if video_id:
                    self.process_video(video_id, subtitle_lang)

        print("✅ JSON generation complete!")

# To run the command, instantiate and call handle():
if __name__ == "__main__":
    Command().handle()
