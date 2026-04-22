# crm

Python/uv tooling for course data in `video-vocab`.

## Commands

- `uv run crm migrate-legacy-data`
- `uv run crm generate-data --course arz`
- `uv run crm extract-subtitles --course arz`
- `uv run crm find-videos --course arz`

## Paths

- app-served course data: `public/data/<iso3>/...`
- non-public work files: `crm/data/work/<iso3>/...`
