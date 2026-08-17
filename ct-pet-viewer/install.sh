#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is for macOS. Use the Windows command shown on alex-dils.com instead." >&2
  exit 1
fi

download_url="https://github.com/axel-slid/personal-website/releases/download/ct-pet-viewer-v1.1.0/CT-PET-Review-Workstation-1.1.0-macOS-arm64.dmg"
expected_sha256="5f28716ab369b5ef33ace6f457d1b93dd156f801b5802accae9bbb0b5b290e2b"
install_work="$(mktemp -d "${TMPDIR:-/tmp}/ct-pet-viewer.XXXXXX")"
disk_image="$install_work/CT-PET-Review-Workstation.dmg"
mount_point="$install_work/mount"

cleanup() {
  if mount | grep -Fq "on $mount_point "; then hdiutil detach "$mount_point" -quiet || true; fi
  rm -rf "$install_work"
}
trap cleanup EXIT

mkdir -p "$mount_point"
echo "Downloading CT-PET Review Workstation…"
curl -fL --retry 3 --progress-bar "$download_url" -o "$disk_image"
actual_sha256="$(shasum -a 256 "$disk_image" | awk '{print $1}')"
if [[ "$actual_sha256" != "$expected_sha256" ]]; then
  echo "Download verification failed. Nothing was installed." >&2
  exit 1
fi

hdiutil attach "$disk_image" -nobrowse -readonly -mountpoint "$mount_point" -quiet
echo "Installing in Applications (macOS may ask for your password)…"
sudo ditto "$mount_point/CT-PET Review Workstation.app" "/Applications/CT-PET Review Workstation.app"
sudo xattr -r -d com.apple.quarantine "/Applications/CT-PET Review Workstation.app" 2>/dev/null || true
open "/Applications/CT-PET Review Workstation.app"
echo "Installed. Download the task021-task030 case folder separately; the app will find it under Downloads."

