#!/usr/bin/env bash
# Rebrand user-facing occurrences of Sonet -> Sonet.
# Also converts standalone Sonet/Sonet (not followed by a dot) -> Sonet (optional).
# Skips protocol / domain / lexicon identifiers: app.bsky.*, *.bsky.*, bsky.app, at://.../app.bsky.*, etc.
# Dry run by default. Set APPLY=1 to write changes.
# Optional flags:
#   KEEP_UTM=1    Do not change utm_source=sonet style params (default changes to utm_source=sonet)
#   REPLACE_BSKY=0  Skip mapping Sonet -> Sonet when standalone (default REPLACE_BSKY=1)
# Usage: scripts/branding/rebrand_to_sonet.sh [path]

set -euo pipefail

TARGET_ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
APPLY="${APPLY:-0}"
DRY_RUN="${DRY_RUN:-1}"
KEEP_UTM="${KEEP_UTM:-0}"
REPLACE_BSKY="${REPLACE_BSKY:-1}"

EXT_PATTERN='\.(md|MD|markdown|txt|ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|go|sh)$'

SKIP_DIRS=(.git node_modules build dist patches vendor ios/Pods android/app/build)

# Build -prune expression segments
PRUNE_ARGS=()
for d in "${SKIP_DIRS[@]}"; do
  PRUNE_ARGS+=( -path "*/$d/*" -prune -o )
done

changed_files=()
replacement_total=0
file_modified_count=0

process_file() {
  local file="$1"
  # Binary guard
  if ! grep -Iq . "$file" 2>/dev/null; then
    return
  fi
  local original new diff_lines repls
  original="$(cat "$file")"
  # Perl script does line-wise guarded replacements to avoid touching import paths
  new="$(perl -0777 -pe '
    my @lines = split(/\n/, $_);
    for my $l (@lines) {
      next if $l =~ /github\.com\/Sonet-social/; # preserve upstream import paths
      $l =~ s/\bBLUESKY\b/SONET/g;
      $l =~ s/\b[Bb][Ll][Uu][Ee][Ss][Kk][Yy]\b/Sonet/g;
      if ($ENV{REPLACE_BSKY} && $ENV{REPLACE_BSKY} eq "1") {
        $l =~ s/\b[Bb]sky\b(?!\.)/Sonet/g;
      }
      if (! $ENV{KEEP_UTM} || $ENV{KEEP_UTM} ne "1") {
        $l =~ s/(utm_(?:source|medium|campaign|content)=)Sonet/${1}sonet/gi;
      }
      $l =~ s/Sonet/Sonet/g;
    }
    $_ = join("\n", @lines);
  ' "$file")"
  if [[ "$new" != "$original" ]]; then
    diff_lines="$(diff -U0 <(printf '%s' "$original") <(printf '%s' "$new") || true)"
    repls="$(printf '%s' "$diff_lines" | grep -E '^\+' | grep -vE '^\+\+\+' | grep -c 'Sonet' || true)"
    replacement_total=$((replacement_total + repls))
    changed_files+=("$file:$repls")
    file_modified_count=$((file_modified_count + 1))
    if [[ "$APPLY" == "1" ]]; then
      printf '%s' "$new" > "$file"
    fi
  fi
}

# Simplify find invocation (previous array expansion caused path ordering issues in some shells)
# Build a unified prune expression and then filter by extension regex
find "$TARGET_ROOT" \
  \( -path '*/.git/*' -o -path '*/node_modules/*' -o -path '*/build/*' -o -path '*/dist/*' -o -path '*/patches/*' -o -path '*/vendor/*' -o -path '*/ios/Pods/*' -o -path '*/android/app/build/*' \) -prune -o \
  -type f -regextype posix-extended -regex ".*${EXT_PATTERN}" -print0 2>/dev/null |
while IFS= read -r -d '' f; do
  # Skip very large files
  if [[ $(stat -c%s "$f") -gt 1048576 ]]; then
    continue
  fi
  process_file "$f"
done

if [[ "$APPLY" == "1" ]]; then
  echo "Applied rebrand: files modified=$file_modified_count replacements=$replacement_total" >&2
else
  echo "Dry run: files that would change (first 200):" >&2
  printf '%s\n' "${changed_files[@]}" | head -200 >&2
  echo "Totals: files=$file_modified_count replacements=$replacement_total" >&2
  echo "To apply: APPLY=1 DRY_RUN=0 scripts/branding/rebrand_to_sonet.sh" >&2
fi