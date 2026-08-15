#!/usr/bin/env bash

set -euo pipefail

readonly RELEASE_BASE="https://github.com/axel-slid/bscode/releases/latest/download"
readonly ARCHIVE_NAME="BsCode-macOS-arm64.zip"
readonly TARGET_APP="/Applications/BsCode.app"
readonly BACKUP_APP="/Applications/BsCode.app.bscode-install-backup"

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'BsCode currently supports macOS only.\n' >&2
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  printf 'BsCode currently requires an Apple silicon Mac.\n' >&2
  exit 1
fi

for command in curl ditto shasum xattr; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/bscode-install.XXXXXX")"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

printf 'Downloading BsCode…\n'
curl -fL --retry 3 --progress-bar \
  "$RELEASE_BASE/$ARCHIVE_NAME" \
  -o "$work_dir/$ARCHIVE_NAME"
curl -fsSL --retry 3 \
  "$RELEASE_BASE/$ARCHIVE_NAME.sha256" \
  -o "$work_dir/$ARCHIVE_NAME.sha256"

(
  cd "$work_dir"
  shasum -a 256 -c "$ARCHIVE_NAME.sha256"
)

mkdir "$work_dir/unpacked"
ditto -x -k "$work_dir/$ARCHIVE_NAME" "$work_dir/unpacked"

source_app="$(find "$work_dir/unpacked" -maxdepth 2 -type d -name 'BsCode.app' -print -quit)"
if [[ -z "$source_app" || ! -d "$source_app" ]]; then
  printf 'The downloaded archive did not contain BsCode.app.\n' >&2
  exit 1
fi

admin=()
if [[ ! -w "/Applications" ]]; then
  if ! command -v sudo >/dev/null 2>&1; then
    printf 'Administrator access is required to install BsCode in /Applications.\n' >&2
    exit 1
  fi
  admin=(sudo)
fi

"${admin[@]}" rm -rf "$BACKUP_APP"
if [[ -e "$TARGET_APP" ]]; then
  "${admin[@]}" mv "$TARGET_APP" "$BACKUP_APP"
fi

restore_previous_install() {
  "${admin[@]}" rm -rf "$TARGET_APP"
  if [[ -e "$BACKUP_APP" ]]; then
    "${admin[@]}" mv "$BACKUP_APP" "$TARGET_APP"
  fi
}

if ! "${admin[@]}" ditto "$source_app" "$TARGET_APP"; then
  restore_previous_install
  printf 'Installation failed; the previous BsCode installation was restored.\n' >&2
  exit 1
fi

if ! "${admin[@]}" xattr -dr com.apple.quarantine "$TARGET_APP"; then
  restore_previous_install
  printf 'First-launch setup failed; the previous BsCode installation was restored.\n' >&2
  exit 1
fi

"${admin[@]}" rm -rf "$BACKUP_APP"
printf 'BsCode is installed in /Applications.\n'
