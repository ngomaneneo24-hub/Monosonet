#!/usr/bin/env bash
# Normalize branding terms: convert variations of Sonet/Sonet to 'Sonet' in user-facing text.
# Safeguards: skips protocol/module namespaces like app.bsky.*, domains like bsky.app, t.gifs.bsky.app, etc.
# Default mode is dry-run (no file modifications). Set APPLY=1 to write changes.
# Usage: scripts/branding/normalize_bluesky.sh [path (default=repo root)]

set -euo pipefail

REPO_ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
DRY_RUN="${DRY_RUN:-1}"
APPLY="${APPLY:-0}"

# File extensions to process (add more as needed)
EXT_PATTERN='\.(md|MD|markdown|txt|ts|tsx|js|jsx|mjs|cjs|json|yml|yaml)$'

# Directories to skip
SKIP_DIRS='(*/node_modules/*|*/build/*|*/dist/*|*/.git/*|*/patches/*|*/vendor/*|*/ios/Pods/*)'

changed_files=()
modified_count=0
replacement_count=0

while IFS= read -r -d '' file; do
  # Skip binary files quickly
  if grep -Iq . "$file" 2>/dev/null; then
    original_content=$(cat "$file")
    new_content=$(printf '%s' "$original_content" | perl -0777 -pe '
      # Replace standalone Sonet (any case) with capitalized form
      s/\bbluesky\b/Sonet/gi;
      # Replace standalone Sonet (any case) with Sonet when NOT followed by a dot (avoids app.bsky.*, bsky.app, etc.)
      s/\b[bB]sky\b(?!\.)/Sonet/g;
    ')
    if [[ "$new_content" != "$original_content" ]]; then
      changes=$(diff -U0 <(printf '%s' "$original_content") <(printf '%s' "$new_content") | grep -E '^[+-]' | grep -Ev '^(\+\+\+|---)' || true)
      # Count replacements (lines starting with + that contain Sonet and had lower-case before)
      this_repls=$(printf '%s' "$changes" | grep -c '+.*Sonet' || true)
      replacement_count=$((replacement_count + this_repls))
      changed_files+=("$file:$this_repls")
      modified_count=$((modified_count + 1))
      if [[ "$APPLY" == "1" ]]; then
        printf '%s' "$new_content" > "$file"
      fi
    fi
  fi
# Find matching files
done < <(find "$REPO_ROOT" -type f -regextype posix-extended -regex ".*${EXT_PATTERN}" -print0 | grep -zvE "$SKIP_DIRS")

if [[ "$APPLY" == "1" ]]; then
  echo "Applied branding normalization. Files modified: $modified_count; Replacements: $replacement_count" >&2
else
  echo "Dry run - no files modified." >&2
  echo "Files that would change (file:replacements):" >&2
  printf '%s\n' "${changed_files[@]}" | head -200 >&2
  echo "Total candidate files: $modified_count" >&2
  echo "Total replacements: $replacement_count" >&2
  echo "To apply changes: APPLY=1 DRY_RUN=0 scripts/branding/normalize_bluesky.sh" >&2
fi