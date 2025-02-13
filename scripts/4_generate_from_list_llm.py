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

VIDEO_IDS_FILE = "data/ids.txt"           # file with one YouTube video id per line
TRANSCRIPTS_DIR = "data/transcripts"      # folder where transcripts will be saved
WORDS_JSON_FILE = "data/words.json"       # file where the words array is stored

def get_transliteration_translation(word, context):
    """
    Uses the ChatGPT API (gpt-3.5-turbo) to get the franco transliteration and English translation(s)
    for the provided Egyptian Arabic word, given the context (the full transcript segment text).
    
    The prompt instructs the LLM to provide a context-independent English translation for learning,
    and, if the word is a verb (or has multiple forms), to include both the conjugated form (as given)
    and the base form in an array called "meanings". For non-verbs, the array should have one element.
    
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
        "Also, provide its English translation without relying on context so that it is "
        "suitable for learning the word on its own. "
        "If the word is a special form, such as a conjugated verb, return both the conjugated form"
        "and the base form in an array called 'meanings'. For non-verbs, return an array with a single object. "
        "Return your answer as a JSON object with exactly one key: 'meanings'. Each element in 'meanings' "
        "should be an object with keys 'transliteration' and 'translation'.\n\n"
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
        result = json.loads(content) # type: ignore
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
    
    Each word is processed with its segment context. The LLM call returns one or more meanings.
    For each meaning, a separate learning item is created. The learning item structure is:
    
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
    
    Multiple learning items may exist for the same Arabic word if the LLM returns multiple meanings.
    A composite key (e.g., "تعرفي__0", "تعرفي__1") is used in the dictionary.
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
        context = text  # pass the entire segment text as context
        words_in_segment = re.findall(r"[\u0600-\u06FF]+", text)
        for w in words_in_segment:
            if not w.strip():
                continue
            # Get a list of meanings from the LLM (each as a tuple: (transliteration, translation))
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
        # Since one Arabic word may yield several learning items, we expect each item to have a unique composite key.
        # For simplicity, we reconstruct a dict with keys as the composite key.
        words_dict = {}
        for entry in existing_words:
            # We assume each entry already has a composite key embedded in its "word" field if needed.
            # Here, we'll simply use the Arabic word with an index if multiple occurrences exist.
            base_word = entry["word"]
            if base_word not in words_dict:
                words_dict[base_word] = [entry]
            else:
                words_dict[base_word].append(entry)
        # Flatten into a single dict with composite keys
        flat_dict = {}
        for word, items in words_dict.items():
            for i, item in enumerate(items):
                flat_dict[f"{word}__{i}"] = item
        words_dict = flat_dict
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
