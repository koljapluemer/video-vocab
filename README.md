![screenshot of the app's different modes: studying flashcards with a spaced repetition view, and watching video snippets and rating how well you understood them](doc/img/header_screenshots.png)

# learn the vocab to understand a bit of target language video, watch, repeat

### Adding Content

- add or edit a course in `public/data/<iso3>/course.json`
- run `cd crm && uv run crm generate-data --course <iso3>`
- optionally run `cd crm && uv run crm extract-subtitles --course <iso3>`

For legacy repos still on the old layout, run:

- `cd crm && uv run crm migrate-legacy-data`

## Navigation

- the selected target language is stored locally in the browser
- opening `/target-language/<iso3>` sets that target language automatically and redirects to the video overview at `/`
- example: `/target-language/fra` selects French and lands on the overview page

