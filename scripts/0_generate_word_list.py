import re
from pathlib import Path

# Constants for file paths
INPUT_FILE = Path("/home/b/GITHUB/vary-video-vocab/scripts/data/jNQXAC9IVRw.srt")  # Input subtitle file
OUTPUT_FILE  = Path("/home/b/GITHUB/vary-video-vocab/scripts/data/jNQXAC9IVRw.txt")  # Input subtitle file

# Function to extract Arabic words from a string
def extract_arabic_words(text):
    arabic_pattern = r"[\u0600-\u06FF]+"
    return re.findall(arabic_pattern, text)

# Function to process the subtitle file and extract unique Arabic words
def process_subtitle_file(input_file, output_file):
    unique_words = set()

    # Read the subtitle file
    with open(input_file, "r", encoding="utf-8") as file:
        for line in file:
            words = extract_arabic_words(line)
            unique_words.update(words)

    # Write unique words to the output file
    with open(output_file, "w", encoding="utf-8") as file:
        for word in sorted(unique_words):  # Sorting for consistency
            file.write(word + "\n")

    print(f"Extracted {len(unique_words)} unique Arabic words to {output_file}")

# Main entry point
if __name__ == "__main__":
    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
    else:
        process_subtitle_file(INPUT_FILE, OUTPUT_FILE)
