import json
import os
import random 
import requests

PATH_TRANSLATION = os.path.expanduser("/home/b/GITHUB/question-trainer/src/assets/questions.json")
PATH_AUDIO = os.path.expanduser("/home/b/GITHUB/question-trainer/public/audio")

SPEAKERS = ['Bernd', 'Christoph', 'Claus', 'Conrad', "Tanja", "Magda", "Linda", "Katja"]

def main():
    translation_data = load_data()
    get_audio_for_translations(translation_data)



def load_data():
    with open(PATH_TRANSLATION, mode="r") as file:
        data = json.load(file)
        return data
    

def get_audio_for_translations(translations):
    with open('.api.txt', 'r') as f:
        api_email = f.readline().strip()
        api_key = f.readline().strip()

    for translation in translations:
        path =  os.path.join(PATH_AUDIO, translation + ".mp3")
        if os.path.exists(path):
            print('exists already, skipping', translation)
            continue
        else:
            print('generating', translation)

        speaker = random.choice(SPEAKERS)
        url = 'https://speechgen.io/index.php?r=api/text'
        data = {
            "token": api_key,
            "email": api_email,
            "voice": speaker,
            "text": translation,
            "format": "mp3",
            "speed": 1,
            "pitch": 0,
            "emotion": "good"
        }
        response = requests.post(url, data=data)  
        response = json.loads(response.text)

        if response['status'] == 1:
            if 'file' in response and 'format' in response:
                file_url = response['file']
                file_path = path
                file_content = requests.get(file_url).content
                with open(file_path, 'wb') as file:
                    file.write(file_content)
    
if __name__ == "__main__":
    main()