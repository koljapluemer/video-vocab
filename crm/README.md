# crm

Python/uv tooling for course data in `video-vocab`.

## Commands

- `uv run crm migrate-legacy-data`
- `uv run crm generate-data --course arz`
- `uv run crm extract-subtitles --course arz`
- `uv run crm find-videos --course arz`

## Environment

- keys are read only from `crm/.env`
- `OPENAI_API_KEY` is required for `generate-data`
- `GOOGLE_API_KEY` is required for `find-videos`

## Paths

- app-served course data: `public/data/<iso3>/...`
- non-public work files: `crm/data/work/<iso3>/...`
