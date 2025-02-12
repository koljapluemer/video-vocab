import os
import json
from youtube_transcript_api import YouTubeTranscriptApi

# ====== CONFIGURATION CONSTANTS ======
VIDEO_IDS_FILE = "data/ids.txt"         # file containing one YouTube video id per line
OUTPUT_JSON_FILE = "data/video_transcripts.json"  # output JSON file

def main():
    # Read video ids from the file
    with open(VIDEO_IDS_FILE, "r", encoding="utf-8") as f:
        video_ids = [line.strip() for line in f if line.strip()]

    output_data = []

    for video_id in video_ids:
        print(f"Processing video: {video_id}")
        try:
            # Fetch the transcript in Arabic (adjust languages if needed)
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ar'])
        except Exception as e:
            print(f"Error fetching transcript for video '{video_id}': {e}")
            transcript = []  # or you might want to skip this video

        # Each transcript is a list of segments, where each segment has "text", "start", and "duration"
        video_entry = {
            "videoId": video_id,
            "segments": transcript
        }
        output_data.append(video_entry)

    # Save the collected transcript data as JSON
    with open(OUTPUT_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"Transcript data saved to {OUTPUT_JSON_FILE}")

if __name__ == "__main__":
    main()
