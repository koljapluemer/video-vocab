# crm

Python/uv tooling for course data in `video-vocab`.

## Commands

- `uv run crm migrate-legacy-data`
- `uv run crm generate-data --course arz`
- `uv run crm generate-data --course arz --local-translation`
- `uv run crm generate-data --course arz --one-new`
- `uv run crm extract-subtitles --course arz`
- `uv run crm find-videos --course arz`

## Environment

- keys are read only from `crm/.env`
- `OPENAI_API_KEY` is required for `generate-data` unless `--local-translation` is used and Argos can install or use a direct subtitle-language-to-English package
- when `--local-translation` is enabled but Argos cannot install or use the direct package, `crm` falls back to the frontier model
- `GOOGLE_API_KEY` is required for `find-videos`

## Local Translation

- `uv run crm generate-data --course <code> --local-translation` prefers local Argos translation to English for snippet words
- the local path normalizes subtitle language codes with `langcodes`, so values such as `vi`, `vie`, and `vi-VN` resolve to the same base language before asking Argos for a direct package to English
- if the direct Argos package is not installed yet, `crm` asks Argos to install it on demand
- if local translation is unavailable or a snippet-level local translation attempt fails, `crm` falls back to the existing frontier-model translation flow

## Incremental Runs

- `uv run crm generate-data --course <code> --one-new` skips already processed videos and stops after the first newly generated video
- `--one-new` can be combined with `--local-translation`

## Paths

- app-served course data: `public/data/<iso3>/...`
- non-public work files: `crm/data/work/<iso3>/...`
