import os
import json
import re
from openai import OpenAI

from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv

# Load environment variables from the .env file

# ====== CONFIGURATION CONSTANTS ======
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")   # ensure this is set in your environment
client = OpenAI(api_key=OPENAI_API_KEY)


VIDEO_IDS_FILE = "data/ids.txt"           # file with one YouTube video id per line
TRANSCRIPTS_DIR = "data/transcripts"              # folder where transcripts will be saved
WORDS_JSON_FILE = "data/words.json"               # file where the words array is stored


# ====== FUNCTIONS ======

def get_transliteration_translation(word):
    """
    Uses the ChatGPT API (gpt-3.5-turbo) to get the franco transliteration and the English translation
    for the provided Egyptian Arabic word.
    
    If the word is a verb, the API should return both the conjugated form (as provided) and the base form.
    
    Returns a tuple: (transliteration, translation)
    """
    prompt = (
        "You are an expert in Egyptian Arabic from Cairo. "
        "For the following Egyptian Arabic word, provide its transliteration in franco using this mapping:\n\n"
        "• Hamza/Alef (ء/أ): use '2' when appropriate\n"
        "• Beh (ب): B\n"
        "• Teh/Tah (ت/ط): T\n"
        "• Seh/Seen/Saad (ث/س/ص): S\n"
        "• Geem (ج): G\n"
        "• 7ah/Haa2 (ح/ه): H or 7\n"
        "• Khah (خ): 5 or Kh\n"
        "• Daal (د): D\n"
        "• Zaal/Zeen/Zah (ذ/ز/ظ): Z\n"
        "• Reh (ر): R\n"
        "• Sheen (ش): Sh\n"
        "• 3een (ع): 3\n"
        "• Gheen (غ): Gh\n"
        "• Feh (ف): F\n"
        "• Qaf (ق): Q if pronounced as Q, otherwise 2 if skipped\n"
        "• Kaf (ك): K\n"
        "• Lam (ل): L\n"
        "• Meem (م): M\n"
        "• Noon (ن): N\n"
        "• Wow/damma (و): W or O (depending on the word)\n"
        "• Yeh (ي): Y or I or EE (depending on the word)\n"
        "• Taamrabota (ة): A\n\n"
        "Also, provide its English translation without relying on context. "
        "If the word is a verb, include both the conjugated form as given and the base form. "
        "Return your answer as a JSON object with exactly two keys: 'transliteration' and 'translation'.\n\n"
        f"Word: {word}\n\nOutput JSON:"
    )
    try:
        response = client.chat.completions.create(model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0)
        content = response.choices[0].message.content
        # Parse the JSON from the assistant's reply
        result = json.loads(content)
        print("got result", result)
        return result["transliteration"], result["translation"]
    except Exception as e:
        print(f"Error processing word '{word}': {e}")
        return "", ""

def process_video(video_id, words_dict):
    """
    For the given video id, fetch the transcript using youtube_transcript_api.
    Save the transcript JSON to a file in the transcripts directory.
    Then, tokenize the transcript segments into words and update words_dict.
    """
    try:
        # Try to fetch the transcript in Arabic
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ar'])
    except Exception as e:
        print(f"Error fetching transcript for video '{video_id}': {e}")
        return

    # Save the transcript in the designated directory
    transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{video_id}.json")
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(transcript, f, ensure_ascii=False, indent=2)

    # Process each transcript segment
    for segment in transcript:
        text = segment.get("text", "")
        start = segment.get("start", 0)
        duration = segment.get("duration", 0)
        # Extract only sequences of Arabic letters using a Unicode range.
        # This regex matches one or more Arabic letters.
        words_in_segment = re.findall(r"[\u0600-\u06FF]+", text)
        for w in words_in_segment:
            if not w.strip():
                continue
            # If the word already exists, append the new occurrence.
            if w in words_dict:
                words_dict[w]["relevantForVideoSegments"].append({
                    "videoId": video_id,
                    "start": start,
                    "duration": duration
                })
            else:
                # New word: call the ChatGPT API to get transliteration and translation.
                transliteration, translation = get_transliteration_translation(w)
                words_dict[w] = {
                    "word": w,
                    "transliteration": transliteration,
                    "translation": translation,
                    "relevantForVideoSegments": [{
                        "videoId": video_id,
                        "start": start,
                        "duration": duration
                    }]
                }

def main():
    # Ensure the transcripts directory exists.
    if not os.path.exists(TRANSCRIPTS_DIR):
        os.makedirs(TRANSCRIPTS_DIR)

    # Load existing words JSON if it exists (to extend, not overwrite)
    if os.path.exists(WORDS_JSON_FILE):
        with open(WORDS_JSON_FILE, "r", encoding="utf-8") as f:
            existing_words = json.load(f)
        # Convert the list to a dict for quick lookup (key = word)
        words_dict = {entry["word"]: entry for entry in existing_words}
    else:
        words_dict = {}

    # Read the list of video IDs.
    with open(VIDEO_IDS_FILE, "r", encoding="utf-8") as f:
        video_ids = [line.strip() for line in f if line.strip()]

    # Process each video.
    for video_id in video_ids:
        print(f"Processing video: {video_id}")
        process_video(video_id, words_dict)

    # Save the updated words dictionary as a list to the JSON file.
    words_list = list(words_dict.values())
    with open(WORDS_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(words_list, f, ensure_ascii=False, indent=2)
    print("Processing complete. Words JSON updated.")

if __name__ == "__main__":
    main()
