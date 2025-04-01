![screenshot of the app's different modes: studying flashcards with a spaced repetition view, and watching video snippets and rating how well you understood them](doc/img/header_screenshots.png)

- *learn the vocab to understand a video, watch the video, repeat*
- my latest attempt, for spoken Arabic :)


## User Stories

### ١

**As a learner, I want to watch and understand interesting Arabic videos from day 1**

![](doc/img/us0.webp)

- [ ] a range of interesting videos is included

### ٢

**As a learner, I want to learn to communicate in Arabic**

![](doc/img/us1.webp)

- [ ] app covers relevant topics, expressions, words and grammar

### ٣

**As a learner, I want to integrate the app into my long-term Arabic study routine**

![](doc/img/us2.webp)

- [ ] accounts exist; progress can be synced across devices
- [ ] progress is tracked

### ٤

**As a learner, I do not want to be bored or frustrated**

![](doc/img/us3.webp)

- [ ] app includes appropriate gamification/extrinsic motivation to keep going
- [ ] features should not feel boring


## Understand & Develop

- basic vue app; run with `npm i`, `npm run dev`

### Data



### Folders

The project follows a module-based architecture. That means that instead of putting all composables into `composables/`, things are structured by domain-informed features. Things should be mostly contained into their folder, and communicate outside their system boundaries in clearly defined ways

```bash
├── App.vue                                       # boilerplate
├── main.css                                      # should not be extended; use tailwind + Daisy
├── modules                                       # everything's a module!
│   ├── spacedRepetitionLearning                  # fsrs stuff, reading the local data, talking to the per-user data on supabase
│   │   ├── api.ts                                # the only file of the folder talking to the rest of the code
│   │   ├── exposeStaticPerVideoData.ts           # accessing the per-video jsons, out/$youtube_id.json
│   │   └── exposeVideoList.ts                    # accessing videos.json
│   ├── viewFlashcard                             # a reusable flashcard(s) viewer
│   │   ├── FlashCardsWrapper.vue                 #
│   │   └── FlashCard.vue                         #
│   ├── viewSnippet                               # learner wants to watch and eval a snippet of a video
│   │   ├── SnippetView.vue                       #
│   │   └── WatchSnippet.vue                      #
│   ├── viewVideo                                 # viewing stuff relating to a video as a whole
│   │   ├── components                            #
│   │   │   └── VideoCard.vue                     #
│   │   └── VideoView.vue                         #
│   └── viewVideoList                             # see all the videos that we got
│       └── VideoListView.vue                     #
├── router.ts                                     # we're not doing much routing, so we're keeping that here
├── shared                                        # stuff that's used across the app
│   └── types                                     #
│       └── domainTypes.ts                        # types (=interfaces) like Flashcard
```


### Testing

### Adding Content

- Helpful: [youtube short with subtitle search](https://www.youtube.com/results?search_query=+%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9&sp=EgQYASgB)



## Notes

- this project was started _before_ the Django version, but became the main version of the project after concluding the test launch of the Django version