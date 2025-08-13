#!/usr/bin/env python3
"""
Refactor script: globally rename terms across the repository with case preservation.

Renames (in this order to avoid overlap):
  1) renote  -> renote
  2) note    -> note

Changes are applied to:
  - File contents (text files only, UTF-8 best-effort)
  - File names
  - Directory names (deepest paths first)

Features:
  - Case-preserving replacements (e.g., Note -> Note, RENOTE -> RENOTE, ReNote -> ReNote)
  - Dry-run by default (shows a summary and planned changes)
  - Excludes common vendor/build directories by default
  - Safe size and binary guards

Usage:
  python scripts/refactor_rename_terms.py [--apply] [--root .] [--verbose]

Tip:
  Run with --apply only after reviewing dry-run output.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Tuple


# Terms to replace, order matters (longest first to avoid partial overlaps)
TERMS: List[Tuple[str, str]] = [
	("renote", "renote"),
	("note", "note"),
]

# Default directory exclusions (relative or matching anywhere in path)
DEFAULT_EXCLUDES = {
	".git",
	"node_modules",
	"build",
	"dist",
	".expo",
	"Pods",
	os.path.join("android", "app", "build"),
	os.path.join("ios", "build"),
}

# File extensions considered text for content replacement
TEXT_EXTENSIONS = {
	# web/js/ts
	".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json",
	# configs/docs
	".md", ".markdown", ".yml", ".yaml", ".toml", ".ini", ".conf", ".env",
	# styles/html
	".css", ".scss", ".sass", ".less", ".html",
	# c/c++/go/proto
	".c", ".cc", ".cpp", ".h", ".hpp", ".hh", ".ipp", ".go", ".proto",
	# scripts
	".sh", ".bash", ".py", ".rb",
	# cmake/others
	".cmake", ".txt",
}

# Max file size (in bytes) to attempt content rewrite (skip very large files by default)
MAX_TEXT_BYTES = 5 * 1024 * 1024  # 5 MB


def is_path_excluded(path: Path, excludes: Iterable[str]) -> bool:
	parts = set(Path(path).parts)
	for ex in excludes:
		ex_parts = set(Path(ex).parts)
		# Exclude if any excluded dir is in the path components
		if ex_parts & parts:
			return True
	return False


def preserve_case(source: str, replacement: str) -> str:
	"""Return replacement with casing patterned after source.

	- If source is all upper -> replacement upper
	- If source is all lower -> replacement lower
	- If source is title case (first char upper and rest lower) -> capitalize replacement
	- Else, map character-by-character (for equal lengths) using source's case for each position;
	  if lengths differ, fall back to per-word heuristics then lower for remaining.
	"""
	if not source:
		return replacement

	if source.isupper():
		return replacement.upper()
	if source.islower():
		return replacement.lower()
	if source[0].isupper() and source[1:].islower():
		return replacement.capitalize()

	# Character-by-character mapping when lengths match
	if len(source) == len(replacement):
		out_chars = []
		for s_ch, r_ch in zip(source, replacement):
			out_chars.append(r_ch.upper() if s_ch.isupper() else r_ch.lower())
		return "".join(out_chars)

	# Fallback: best-effort per-character until one side ends
	out = []
	for i, r_ch in enumerate(replacement):
		s_ch = source[i] if i < len(source) else ""
		out.append(r_ch.upper() if s_ch.isupper() else r_ch.lower())
	return "".join(out)


def make_replacer(term_from: str, term_to: str) -> Callable[[re.Match], str]:
	# Case-insensitive regex for the exact term (not word-bound to also catch within identifiers/names)
	pattern = re.compile(re.escape(term_from), flags=re.IGNORECASE)

	def _repl(match: re.Match) -> str:
		src = match.group(0)
		return preserve_case(src, term_to)

	# wrap into a function that takes a string and returns replaced string
	def apply(s: str) -> str:
		return pattern.sub(_repl, s)

	return apply


REPLACERS = [(make_replacer(src, dst)) for (src, dst) in TERMS]


def apply_all_replacements(s: str) -> str:
	"""Apply all replacements in order: renote->renote then note->note."""
	for repl in REPLACERS:
		s = repl(s)
	return s


@dataclass
class ChangeLog:
	content_files_changed: List[Path] = field(default_factory=list)
	files_renamed: List[Tuple[Path, Path]] = field(default_factory=list)
	dirs_renamed: List[Tuple[Path, Path]] = field(default_factory=list)

	def log_content(self, p: Path):
		self.content_files_changed.append(p)

	def log_file_rename(self, src: Path, dst: Path):
		self.files_renamed.append((src, dst))

	def log_dir_rename(self, src: Path, dst: Path):
		self.dirs_renamed.append((src, dst))

	def summary(self) -> str:
		return (
			f"Content files changed: {len(self.content_files_changed)}\n"
			f"Files renamed: {len(self.files_renamed)}\n"
			f"Dirs renamed: {len(self.dirs_renamed)}\n"
		)


def should_edit_content(p: Path) -> bool:
	if not p.is_file():
		return False
	if p.suffix.lower() in TEXT_EXTENSIONS:
		try:
			size = p.stat().st_size
			if size > MAX_TEXT_BYTES:
				return False
			# Quick binary sniff: if NUL byte present, skip
			with p.open("rb") as f:
				chunk = f.read(2048)
				if b"\x00" in chunk:
					return False
		except Exception:
			return False
		return True
	return False


def collect_paths(root: Path, excludes: Iterable[str]) -> Tuple[List[Path], List[Path]]:
	files: List[Path] = []
	dirs: List[Path] = []
	for dirpath, dirnames, filenames in os.walk(root):
		current = Path(dirpath)
		# prune dirnames in-place based on excludes
		pruned = []
		for d in list(dirnames):
			full = current / d
			if is_path_excluded(full, excludes):
				continue
			pruned.append(d)
		dirnames[:] = pruned

		dirs.append(current)
		for fn in filenames:
			p = current / fn
			files.append(p)
	return files, dirs


def rename_candidates(paths: Iterable[Path]) -> List[Tuple[Path, Path]]:
	planned: List[Tuple[Path, Path]] = []
	for p in paths:
		new_name = apply_all_replacements(p.name)
		if new_name != p.name:
			planned.append((p, p.with_name(new_name)))
	return planned


def apply_content_changes(files: Iterable[Path], apply: bool, log: ChangeLog, verbose: bool = False):
	for p in files:
		if not should_edit_content(p):
			continue
		try:
			orig = p.read_text(encoding="utf-8")
		except Exception:
			# best effort: skip non-utf8
			continue
		changed = apply_all_replacements(orig)
		if changed != orig:
			if apply:
				try:
					p.write_text(changed, encoding="utf-8")
				except Exception as e:
					print(f"[ERROR] Writing {p}: {e}")
					continue
			log.log_content(p)
			if verbose:
				print(f"[CONTENT]{' (dry-run)' if not apply else ''} {p}")


def apply_renames(planned: List[Tuple[Path, Path]], apply: bool, log_item: Callable[[Path, Path], None], kind: str, verbose: bool = False):
	# Sort deepest paths first to avoid parent dir rename collisions
	planned_sorted = sorted(planned, key=lambda t: len(t[0].parts), reverse=True)
	for src, dst in planned_sorted:
		if apply:
			try:
				# Ensure destination directory exists
				dst.parent.mkdir(parents=True, exist_ok=True)
				os.rename(src, dst)
			except Exception as e:
				print(f"[ERROR] Renaming {kind} {src} -> {dst}: {e}")
				continue
		log_item(src, dst)
		if verbose:
			print(f"[{kind.upper()}]{' (dry-run)' if not apply else ''} {src} -> {dst}")


def main(argv: Optional[List[str]] = None) -> int:
	parser = argparse.ArgumentParser(description="Refactor terms: renote->renote, note->note across repo.")
	parser.add_argument("--root", default=str(Path.cwd()), help="Repository root (default: current directory)")
	parser.add_argument("--apply", action="store_true", help="Apply changes (default: dry-run)")
	parser.add_argument("--verbose", action="store_true", help="Verbose output of each change")
	parser.add_argument("--no-content", action="store_true", help="Skip editing file contents")
	parser.add_argument("--no-rename", action="store_true", help="Skip file/dir renames")
	parser.add_argument("--include-hidden", action="store_true", help="Do not skip hidden directories/files except .git")
	args = parser.parse_args(argv)

	root = Path(args.root).resolve()
	if not root.exists() or not root.is_dir():
		print(f"Root not found: {root}")
		return 2

	excludes = set(DEFAULT_EXCLUDES)
	if not args.include_hidden:
		# Add typical hidden roots besides .git
		excludes.update({
			".husky",
			".expo",
			".github",
			".idea",
			".vscode",
		})

	print(f"Scanning under: {root}")
	files, dirs = collect_paths(root, excludes)

	log = ChangeLog()

	# Content edits
	if not args.no_content:
		apply_content_changes(files, apply=args.apply, log=log, verbose=args.verbose)

	# File renames
	if not args.no_rename:
		file_planned = rename_candidates(files)
		apply_renames(file_planned, apply=args.apply, log_item=log.log_file_rename, kind="file", verbose=args.verbose)

		# Refresh file list after file renames for accurate dir rename planning
		files, dirs = collect_paths(root, excludes)
		# Directory renames (exclude root itself)
		dir_candidates = [d for d in dirs if d != root]
		dir_planned = rename_candidates(dir_candidates)
		apply_renames(dir_planned, apply=args.apply, log_item=log.log_dir_rename, kind="dir", verbose=args.verbose)

	print("\nSummary:\n" + log.summary())
	if not args.apply:
		print("Dry-run complete. Re-run with --apply to make changes.")
	else:
		print("Applied changes. Review with git status and run tests/builds.")

	return 0


if __name__ == "__main__":
	sys.exit(main())

