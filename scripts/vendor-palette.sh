#!/usr/bin/env bash
# Copies the Enterprise-R palette of project-branding into media/palette.css,
# unedited. Only the palette: the preview uses none of Dark-®'s fonts,
# elements or r- classes, and the W menu follows the IDE.
#
#   scripts/vendor-palette.sh [branch]     branch defaults to main
#
# The copied file carries no commit id. The script prints the commit it
# copied from, for the commit message.
set -euo pipefail

branch=${1:-main}
repo=https://github.com/enterprise-r/project-branding.git
here=$(cd "$(dirname "$0")/.." && pwd)
out=$here/media/palette.css
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git -C "$tmp" init -q
git -C "$tmp" fetch -q --depth 1 "$repo" "refs/heads/$branch"
git -C "$tmp" checkout -q FETCH_HEAD
commit=$(git -C "$tmp" rev-parse HEAD)

cp "$tmp/palette/palette.css" "$out"
echo "Vendor the palette from project-branding $branch at ${commit:0:7}"
