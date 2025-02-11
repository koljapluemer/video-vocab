import os
from time import sleep
import traceback
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import urllib.request
from selenium import webdriver
from selenium.webdriver.firefox.options import Options as FFOptions
from selenium.webdriver.firefox.service import Service


def get_standard_selenium_driver():
    options = FFOptions()
    service = Service(executable_path='/snap/bin/geckodriver')
    driver = webdriver.Firefox(service=service, options=options)
    return driver


# Function to parse Netscape cookies.txt format
def load_cookies_from_file(filepath):
    cookies = []
    with open(filepath, "r") as file:
        for line in file:
            if not line.startswith("#") and line.strip():  # Skip comments and blank lines
                parts = line.strip().split("\t")
                cookie = {
                    "domain": parts[0],
                    "path": parts[2],
                    "secure": parts[3] == "TRUE",  # Convert 'TRUE'/'FALSE' to boolean
                    "expires": int(parts[4]),  # Expiry as an integer timestamp
                    "name": parts[5],
                    "value": parts[6]
                }
                cookies.append(cookie)
    return cookies


def add_cookies_from_file_to_driver(driver, filepath):
    """
    Load cookies from a Netscape-style cookies.txt file and add them to a Selenium browser session.

    Args:
        driver (selenium.webdriver): The Selenium WebDriver instance.
        filepath (str): Path to the cookies.txt file.
    """
    with open(filepath, "r") as file:
        for line in file:
            if not line.startswith("#") and line.strip():  # Skip comments and blank lines
                parts = line.strip().split("\t")
                cookie = {
                    "domain": parts[0],
                    "path": parts[2],
                    "secure": parts[3] == "TRUE",  # Convert 'TRUE'/'FALSE' to boolean
                    "name": parts[5],
                    "value": parts[6]
                }
                # Selenium expects 'expires' as an integer if it exists
                if parts[4].isdigit():
                    cookie["expires"] = int(parts[4])

                try:
                    driver.add_cookie(cookie)
                except Exception as e:
                    print(f"Could not add cookie {cookie}: {e}")


IN_FILE="/home/b/GITHUB/vary-video-vocab/scripts/data/jNQXAC9IVRw.txt"
OUT_PATH="/home/b/GITHUB/vary-video-vocab/scripts/data/vocab/jNQXAC9IVRw/"

# WARNING! this gets the best match for the string sent to lisaanmasry
# that may not be the same word at all
# however, filenames of the html and the sound file will be according to the OG string
def download_vocab_pages_from_lisaanmasry(word_list:list[str], out_path:str, kill_after_first = False):
    driver = get_standard_selenium_driver()
    os.makedirs(out_path, exist_ok=True)

    for word in word_list:
        url = f"https://eu.lisaanmasry.org/online/search.php?language=EN&key={word}&action=s"
        try:
            driver.get(url)
            first_word_table = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.searchword"))
            )

            all_links = first_word_table.find_elements(By.CSS_SELECTOR, "a")
            for link in all_links:
                # if "word.php?" in 
                if "word.php?" in link.get_attribute("href"): 
                    print(link.get_attribute("href"))
                    word_link = link
                    break

            word_link.click()

            # wait for load and get #content
            el_content = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#content"))
            )
           
            with open(os.path.join(out_path, word + ".html"), "w", encoding="utf-8") as file:
                file.write(el_content.get_attribute("outerHTML"))

            # getting sound
            play_button = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "img[src='/images/ifx_play24.png']"))
            )
            if play_button:
                onclick_prop = play_button.get_attribute("onclick")
                sound_id = onclick_prop.split("(")[1].split(")")[0]
                sound_url = f"https://eu.lisaanmasry.org/php/auto/getsound.php?language=ar&sound_id={sound_id}"
                urllib.request.urlretrieve(sound_url, os.path.join(out_path, f"{word}.mp3"))

            sleep(1)

        except Exception as e:
            print("Error occured with loading page for:", word)
            traceback.print_exc()
        if kill_after_first:
            driver.quit()
            return
    driver.quit()

if __name__ == "__main__":
    # get wordlist, run
    with open(IN_FILE, "r") as file:
        word_list = file.read().splitlines()
    download_vocab_pages_from_lisaanmasry(word_list, OUT_PATH, kill_after_first=False)

