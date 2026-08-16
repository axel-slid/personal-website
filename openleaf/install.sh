#!/bin/bash
# Openleaf installer - https://alex-dils.com/openleaf
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
OPENLEAF_INSTALL_TMP=""

cleanup() {
  if [ -n "$OPENLEAF_INSTALL_TMP" ] && [ -d "$OPENLEAF_INSTALL_TMP" ]; then
    rm -rf "$OPENLEAF_INSTALL_TMP"
  fi
}

trap cleanup EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

install_user_tectonic() {
  if command -v tectonic >/dev/null 2>&1; then
    return
  fi

  say "Installing Tectonic in your user account..."

  local archive expected_hash actual_hash
  archive="$OPENLEAF_INSTALL_TMP/tectonic-0.17.0-aarch64-apple-darwin.tar.gz"
  expected_hash="a3f1cac7c5678f01661a92212f58480ae3b0634115d880dbc59e2953ded45667"
  curl -fL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-0.17.0-aarch64-apple-darwin.tar.gz" -o "$archive"
  actual_hash="$(shasum -a 256 "$archive" | awk '{ print $1 }')"
  if [ "$actual_hash" != "$expected_hash" ]; then
    echo "Tectonic download verification failed."
    exit 1
  fi

  tar -xzf "$archive" -C "$OPENLEAF_INSTALL_TMP"
  mkdir -p "$HOME/.local/bin"
  /usr/bin/install -m 755 "$OPENLEAF_INSTALL_TMP/tectonic" "$HOME/.local/bin/tectonic"
  export PATH="$HOME/.local/bin:$PATH"
  hash -r
}

tinytex_bin_dir() {
  local candidate
  for candidate in "$HOME/Library/Openleaf/TinyTeX"/bin/*; do
    if [ -d "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

install_user_tinytex() {
  local tinytex_parent tinytex_root tinytex_bin archive expected_hash actual_hash backup
  tinytex_parent="$HOME/Library/Openleaf"
  tinytex_root="$tinytex_parent/TinyTeX"
  tinytex_bin="$(tinytex_bin_dir || true)"

  if [ -z "$tinytex_bin" ] || [ ! -x "$tinytex_bin/pdflatex" ] || [ ! -x "$tinytex_bin/latexmk" ]; then
    say "Installing TinyTeX for pdflatex and latexmk in your user account..."

    archive="$OPENLEAF_INSTALL_TMP/TinyTeX-1-darwin-v2026.08.tar.xz"
    expected_hash="dd22ffdf1063eff79cadcff45de1f24e8546edf508ab402dc9f87ec2f3367344"
    curl -fL "https://github.com/rstudio/tinytex-releases/releases/download/v2026.08/TinyTeX-1-darwin-v2026.08.tar.xz" -o "$archive"
    actual_hash="$(shasum -a 256 "$archive" | awk '{ print $1 }')"
    if [ "$actual_hash" != "$expected_hash" ]; then
      echo "TinyTeX download verification failed."
      exit 1
    fi

    if [ -e "$tinytex_root" ]; then
      mkdir -p "$HOME/.Trash"
      backup="$HOME/.Trash/Openleaf-TinyTeX-previous-$(date +%Y%m%d-%H%M%S)"
      mv "$tinytex_root" "$backup"
    fi
    mkdir -p "$tinytex_parent"
    tar -xJf "$archive" -C "$tinytex_parent"
    tinytex_bin="$(tinytex_bin_dir || true)"
  fi

  if [ -z "$tinytex_bin" ] || [ ! -x "$tinytex_bin/pdflatex" ] || [ ! -x "$tinytex_bin/latexmk" ]; then
    echo "TinyTeX installed, but pdflatex or latexmk could not be found."
    exit 1
  fi

  mkdir -p "$HOME/.local/bin"
  ln -sfn "$tinytex_bin/pdflatex" "$HOME/.local/bin/pdflatex"
  ln -sfn "$tinytex_bin/latexmk" "$HOME/.local/bin/latexmk"
  ln -sfn "$tinytex_bin/tlmgr" "$HOME/.local/bin/tlmgr"
  export PATH="$HOME/.local/bin:$PATH"
  hash -r
}

ensure_latex_tools() {
  install_user_tectonic
  install_user_tinytex

  local missing_tools=""
  for tool in tectonic latexmk pdflatex; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_tools="$missing_tools $tool"
    fi
  done
  if [ -n "$missing_tools" ]; then
    echo "LaTeX tool installation finished, but these commands are still unavailable:$missing_tools"
    exit 1
  fi

  say "LaTeX toolchain ready: tectonic, latexmk, and pdflatex."
}

main() {
  if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
    echo "This installer currently supports Apple Silicon Macs."
    exit 1
  fi

  say "Installing Openleaf..."

  local archive checksum_file unpack_dir install_dir target backup
  OPENLEAF_INSTALL_TMP="$(mktemp -d "${TMPDIR:-/tmp}/openleaf-install.XXXXXX")"

  if [ "${OPENLEAF_SKIP_TOOLCHAIN:-0}" != "1" ]; then
    ensure_latex_tools
  fi

  archive="$OPENLEAF_INSTALL_TMP/Openleaf-macOS-arm64.zip"
  checksum_file="$OPENLEAF_INSTALL_TMP/SHA256SUMS.txt"
  unpack_dir="$OPENLEAF_INSTALL_TMP/unpacked"

  curl -fL "https://github.com/axel-slid/openleaf/releases/latest/download/Openleaf-macOS-arm64.zip" -o "$archive"
  curl -fL "https://github.com/axel-slid/openleaf/releases/latest/download/SHA256SUMS.txt" -o "$checksum_file"
  (cd "$OPENLEAF_INSTALL_TMP" && shasum -a 256 -c "$(basename "$checksum_file")")

  mkdir -p "$unpack_dir"
  ditto -x -k "$archive" "$unpack_dir"

  if [ ! -d "$unpack_dir/Openleaf.app" ]; then
    echo "The downloaded release does not contain Openleaf.app."
    exit 1
  fi

  install_dir="${OPENLEAF_INSTALL_DIR:-/Applications}"
  if [ "$install_dir" = "/Applications" ] && [ ! -w "$install_dir" ]; then
    install_dir="$HOME/Applications"
  fi
  mkdir -p "$install_dir"
  target="$install_dir/Openleaf.app"

  if [ -e "$target" ]; then
    mkdir -p "$HOME/.Trash"
    backup="$HOME/.Trash/Openleaf-previous-$(date +%Y%m%d-%H%M%S).app"
    mv "$target" "$backup"
  fi

  ditto "$unpack_dir/Openleaf.app" "$target"
  xattr -dr com.apple.quarantine "$target"

  if [ "${OPENLEAF_SKIP_OPEN:-0}" != "1" ]; then
    open "$target"
  fi

  say "Openleaf is installed and running."
}

# Running through main ensures a truncated download executes nothing.
if [ "${OPENLEAF_SOURCE_ONLY:-0}" != "1" ]; then
  main "$@"
fi
