#!/usr/bin/env bash
# Download a YouTube video's English captions into research/transcripts/ (gitignored).
# Usage: scripts/fetch_transcript.sh <youtube-url-or-id> [more...]
# Needs yt-dlp: https://github.com/yt-dlp/yt-dlp
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <youtube-url-or-id> [more...]" >&2
  exit 1
fi

out_dir="$(cd "$(dirname "$0")/.." && pwd)/research/transcripts"
mkdir -p "$out_dir"

for video in "$@"; do
  yt-dlp --ignore-config --skip-download --write-subs --write-auto-subs \
    --sub-langs "en.*,en" --sub-format vtt \
    -o "$out_dir/%(id)s.%(ext)s" -- "$video"
done
