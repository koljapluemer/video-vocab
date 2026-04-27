from __future__ import annotations

import argparse

from crm.commands import extract_subtitles, find_videos, generate_data, migrate_legacy_data


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="crm")
    subparsers = parser.add_subparsers(dest="command", required=True)

    migrate_parser = subparsers.add_parser("migrate-legacy-data")
    migrate_parser.set_defaults(handler=lambda args: migrate_legacy_data.run())

    generate_parser = subparsers.add_parser("generate-data")
    generate_parser.add_argument("--course", required=True)
    generate_parser.add_argument(
        "--local-translation",
        action="store_true",
        help="Prefer local Argos translation to English when the subtitle language is supported.",
    )
    generate_parser.add_argument(
        "--one-new",
        action="store_true",
        help="Stop after generating data for the first unprocessed video.",
    )
    generate_parser.set_defaults(
        handler=lambda args: generate_data.run(
            args.course,
            use_local_translation=args.local_translation,
            stop_after_one_new=args.one_new,
        )
    )

    subtitles_parser = subparsers.add_parser("extract-subtitles")
    subtitles_parser.add_argument("--course", required=True)
    subtitles_parser.set_defaults(handler=lambda args: extract_subtitles.run(args.course))

    find_parser = subparsers.add_parser("find-videos")
    find_parser.add_argument("--course", required=True)
    find_parser.add_argument("--target-count", type=int, default=20)
    find_parser.add_argument("--max-attempts", type=int, default=10)
    find_parser.set_defaults(
        handler=lambda args: find_videos.run(
            args.course,
            target_count=args.target_count,
            max_attempts=args.max_attempts,
        )
    )

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.handler(args)
