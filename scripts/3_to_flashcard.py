import os
import shutil
import re
import uuid

# file paths
md_directory = "/home/b/GITHUB/vary-video-vocab/scripts/data/md/jNQXAC9IVRw"
sound_directory = "/home/b/GITHUB/vary-video-vocab/scripts/data/vocab/jNQXAC9IVRw"
flashcard_out_directory = "/home/b/GITHUB/vary-video-vocab/scripts/data/flashcards/jNQXAC9IVRw"

def generate_flashcards_from_md_basic(md_directory, sound_directory, flashcard_out_directory):
    """
    Generates flashcards from Markdown files, linking to sound files and including content in a specific markdown format.
    
    Args:
        md_directory (str): Path to the directory containing markdown files.
        sound_directory (str): Path to the directory containing sound files (named the same as markdown files).
        flashcard_out_directory (str): Path to the directory where generated flashcards should be saved.
    """
    # Make sure the output directory exists
    os.makedirs(flashcard_out_directory, exist_ok=True)

    # Iterate through the markdown files in the directory
    for md_file in os.listdir(md_directory):
        if md_file.endswith('.md'):
            # ideally replaced later
            # (remember, the filename rn is the og word that we sent to lisaan,
            # not necessarily the one that is actually the one we got back)
            true_name = os.path.basename(md_file) 
            # Get the full path to the markdown file
            md_file_path = os.path.join(md_directory, md_file)

            # Corresponding sound file name (assuming same name as markdown file)
            with open(md_file_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
                true_name = find_first_arabic_string(markdown_content) or true_name
                
            true_name = true_name.strip()
            sound_file_name = os.path.basename(md_file).replace('.md', '.mp3')  # Adjust extension as needed
            sound_file_path = os.path.join(sound_directory, sound_file_name)
            sound_file_name_new = 'sound-' + str(uuid.uuid4()) + '.mp3'  # Adjust extension as needed

            shutil.copy(sound_file_path, os.path.join(flashcard_out_directory, sound_file_name_new))
          

            # Construct the flashcard content
            flashcard_content = f"""---
q:
  template: learn
---

![]({sound_file_name_new})

> [!faq]- 🇪🇬?"""
            with open(md_file_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
                for line in markdown_content.splitlines():
                    flashcard_content += f'\n> {line}' 

            flashcard_content += '\n>\n> [[moana song test]]'
            # Path to save the generated flashcard
            flashcard_file_path = os.path.join(flashcard_out_directory, true_name + '.md')

            # Write the flashcard content to a new file
            with open(flashcard_file_path, 'w', encoding='utf-8') as flashcard_file:
                flashcard_file.write(flashcard_content)
            print(f"Generated flashcard for: {md_file}")


import re

def find_first_arabic_string(text):
    # Regular expression to match Arabic characters until a "|" character
    match = re.search(r'[\u0600-\u06FF\u0750-\u077F]+(?:[^\|])*', text)
    if match:
        return match.group(0).replace("*", "")  # Return the first sequence of Arabic characters (including spaces and punctuation until '|')
    return None  # Return None if no Arabic string is found


if __name__ == "__main__":
    generate_flashcards_from_md_basic(md_directory, sound_directory, flashcard_out_directory)