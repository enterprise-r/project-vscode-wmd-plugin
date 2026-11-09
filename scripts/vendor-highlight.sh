#!/usr/bin/env bash
# Bundles highlight.js core and its JSON language into media/vendor/highlight.js,
# with the license on top. Only JSON: the plugin's own card language is
# registered in media/wmd.js, and fenced code keeps the preview's highlighting.
#
#   scripts/vendor-highlight.sh [version]     version defaults to 11, the latest 11.x
#
# The bundled file carries no exact version. The script prints the version it
# bundled, for the commit message.
set -euo pipefail

version=${1:-11}
here=$(cd "$(dirname "$0")/.." && pwd)
out=$here/media/vendor/highlight.js
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cd "$tmp"
npm pack -q "highlight.js@$version" >/dev/null
tar -xzf highlight.js-*.tgz
resolved=$(node -p "require('./package/package.json').version")

cat > entry.js <<'JS'
import hljs from './package/es/core.js';
import json from './package/es/languages/json.js';
hljs.registerLanguage('json', json);
export default hljs;
JS
npx --yes esbuild@0.25 entry.js --bundle --format=esm --legal-comments=none --log-level=warning > bundle.js

mkdir -p "$(dirname "$out")"
{
  echo "/*!"
  echo " * highlight.js ${resolved%%.*}, core and the JSON language."
  echo " *"
  sed -e 's/[[:space:]]*$//' -e 's/^/ * /' -e 's/^ \* $/ */' package/LICENSE
  echo " */"
  cat bundle.js
} > "$out"
echo "Vendor highlight.js $resolved, core and JSON"
