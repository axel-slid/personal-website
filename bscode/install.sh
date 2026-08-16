#!/bin/bash
# BsCode installer - https://alex-dils.com/bscode
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
BSCODE_INSTALL_TMP=""

cleanup() {
  if [ -n "$BSCODE_INSTALL_TMP" ] && [ -d "$BSCODE_INSTALL_TMP" ]; then
    rm -rf "$BSCODE_INSTALL_TMP"
  fi
}

trap cleanup EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

main() {
  if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
    echo "This installer currently supports Apple Silicon Macs."
    exit 1
  fi

  say "Installing BsCode..."

  local archive checksum_file unpack_dir install_dir target backup
  BSCODE_INSTALL_TMP="$(mktemp -d)"
  archive="$BSCODE_INSTALL_TMP/BsCode-macOS-arm64.zip"
  checksum_file="$BSCODE_INSTALL_TMP/BsCode-macOS-arm64.zip.sha256"
  unpack_dir="$BSCODE_INSTALL_TMP/unpacked"

  curl -fL "https://github.com/axel-slid/bscode/releases/latest/download/BsCode-macOS-arm64.zip" -o "$archive"
  curl -fL "https://github.com/axel-slid/bscode/releases/latest/download/BsCode-macOS-arm64.zip.sha256" -o "$checksum_file"
  (cd "$BSCODE_INSTALL_TMP" && shasum -a 256 -c "$(basename "$checksum_file")")

  mkdir -p "$unpack_dir"
  ditto -x -k "$archive" "$unpack_dir"

  install_dir="/Applications"
  if [ ! -w "$install_dir" ]; then
    install_dir="$HOME/Applications"
    mkdir -p "$install_dir"
  fi
  target="$install_dir/BsCode.app"

  if [ -e "$target" ]; then
    mkdir -p "$HOME/.Trash"
    backup="$HOME/.Trash/BsCode-previous-$(date +%Y%m%d-%H%M%S).app"
    mv "$target" "$backup"
  fi

  ditto "$unpack_dir/BsCode.app" "$target"
  xattr -dr com.apple.quarantine "$target"
  open "$target"

  say "BsCode is installed and running."
}

# Running through main ensures a truncated download executes nothing.
main "$@"
