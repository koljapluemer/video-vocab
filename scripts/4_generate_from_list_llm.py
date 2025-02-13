import os
import json
import re
from openai import OpenAI
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")   # ensure this is set in your environment
client = OpenAI(api_key=OPENAI_API_KEY)

VIDEO_IDS_FILE = "data/new_ids.txt"           # file with one YouTube video id per line
TRANSCRIPTS_DIR = "data/transcripts"      # folder where transcripts will be saved
WORDS_JSON_FILE = "data/words.json"       # file where the words array is stored

def get_transliteration_translation(word, context):
    """
    Uses the ChatGPT API (gpt-3.5-turbo) to get the franco transliteration and English translation(s)
    for the provided Egyptian Arabic word, given the context (the transcript segment text).

    The prompt instructs the LLM to provide a context-independent English translation for learning,
    and to return an array of meanings in JSON with each element an object having 'transliteration' and 'translation'.
    
    Expected output JSON structure:
    {
        "meanings": [
            {
                "transliteration": "the franco transliteration",
                "translation": "the English translation"
            },
            ...
        ]
    }
    
    Returns:
        A list of tuples [(transliteration, translation), ...]
    """
    prompt = (
        "You are an expert in Egyptian Arabic from Cairo. "
        "For the following Egyptian Arabic word, given the context (the entire transcript segment text), "
        "provide its transliteration in franco using this mapping:\n\n"
        "• Hamza/Alef (ء/أ): use '2' when appropriate for Egytian Arabic\n"
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
        "Also, provide its English translation without relying on context, so that it makes sense on its own. "
        "Use the provided context to translate the word in the correct sense, but ONLY translate the word, not the surrounding text."
        "The transliteration should ONLY be of the word, NOT of the surrounding context.\n\n"
        "Return your answer as a JSON object with exactly one key: 'meanings'. "
        "Each element in 'meanings' should be an object with keys 'transliteration' and 'translation'.\n\n"
        f"Word: {word}\n"
        f"Context: {context}\n\nOutput JSON:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
        )
        content = response.choices[0].message.content
        result = json.loads(content)
        meanings = result.get("meanings", [])
        return [(m["transliteration"], m["translation"]) for m in meanings]
    except Exception as e:
        print(f"Error processing word '{word}' with context: {e}")
        return []

def process_video(video_id, words_dict):
    """
    For the given video id, fetch the transcript using youtube_transcript_api.
    Save the transcript JSON to a file in the transcripts directory.
    Then, tokenize the transcript segments into words and update words_dict.

    For each occurrence of a word, pass the full transcript segment text as context to the LLM.
    The LLM returns an array of meanings (each a tuple of transliteration and translation).
    For each meaning, a separate learning item is created using a composite key (e.g., "تعرفي__0").
    Each learning item has the structure:
    
    {
        "word": <arabic word>,
        "transliteration": <transliteration from the meaning>,
        "relevantForVideoSegments": [{
            "videoId": <video id>,
            "start": <segment start>,
            "duration": <segment duration>,
            "translation": <translation from the meaning>
        }]
    }
    """
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ar'])
    except Exception as e:
        print(f"Error fetching transcript for video '{video_id}': {e}")
        return

    transcript_path = os.path.join(TRANSCRIPTS_DIR, f"{video_id}.json")
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(transcript, f, ensure_ascii=False, indent=2)

    for segment in transcript:
        text = segment.get("text", "")
        start = segment.get("start", 0)
        duration = segment.get("duration", 0)
        context = text  # use the entire segment as context
        words_in_segment = re.findall(r"[\u0600-\u06FF]+", text)
        for w in words_in_segment:
            if not w.strip():
                continue
            # Get meanings for the word with the segment context.
            meanings = get_transliteration_translation(w, context)
            if not meanings:
                continue
            for idx, (transliteration, translation) in enumerate(meanings):
                composite_key = f"{w}__{idx}"
                occurrence = {
                    "videoId": video_id,
                    "start": start,
                    "duration": duration,
                    "translation": translation
                }
                if composite_key in words_dict:
                    words_dict[composite_key]["relevantForVideoSegments"].append(occurrence)
                else:
                    words_dict[composite_key] = {
                        "word": w,
                        "transliteration": transliteration,
                        "relevantForVideoSegments": [occurrence]
                    }

def main():
    if not os.path.exists(TRANSCRIPTS_DIR):
        os.makedirs(TRANSCRIPTS_DIR)

    if os.path.exists(WORDS_JSON_FILE):
        with open(WORDS_JSON_FILE, "r", encoding="utf-8") as f:
            existing_words = json.load(f)
        # Reconstruct a dict with composite keys.
        words_dict = {}
        for entry in existing_words:
            base_word = entry["word"]
            # Assume that if there are multiple items for the same base word, they were saved with composite keys.
            key = entry.get("compositeKey") or base_word
            words_dict[key] = entry
    else:
        words_dict = {}

    with open(VIDEO_IDS_FILE, "r", encoding="utf-8") as f:
        video_ids = [line.strip() for line in f if line.strip()]

    for video_id in video_ids:
        print(f"Processing video: {video_id}")
        process_video(video_id, words_dict)

    words_list = list(words_dict.values())
    with open(WORDS_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(words_list, f, ensure_ascii=False, indent=2)
    print("Processing complete. Words JSON updated.")

if __name__ == "__main__":
    main()
