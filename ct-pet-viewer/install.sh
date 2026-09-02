#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is for macOS. Use the Windows command shown on alex-dils.com instead." >&2
  exit 1
fi

if [[ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" != "1" ]]; then
  echo "CT-PET Review Workstation requires an Apple silicon Mac." >&2
  exit 1
fi

version="1.1.2"
app_name="CT-PET Review Workstation.app"
download_url="https://github.com/axel-slid/personal-website/releases/download/ct-pet-viewer-v1.1.2/CT-PET-Review-Workstation-1.1.2-arm64.dmg"
expected_sha256="aaf3708fb694568ab2259c4746a00ba0a3d4bc53c8d3d03b19b3a466fcf8ca92"
install_dir="${CTPET_INSTALL_DIR:-/Applications}"
destination="$install_dir/$app_name"
install_work="$(mktemp -d "${TMPDIR:-/tmp}/ct-pet-viewer.XXXXXX")"
disk_image="$install_work/CT-PET-Review-Workstation.dmg"
mount_point="$install_work/mount"

cleanup() {
  hdiutil detach "$mount_point" -quiet >/dev/null 2>&1 || true
  /bin/rm -rf "$install_work"
}
trap cleanup EXIT

mkdir -p "$mount_point"
echo "Downloading CT-PET Review Workstation ${version}…"
curl -fL --retry 3 --progress-bar "$download_url" -o "$disk_image"
actual_sha256="$(shasum -a 256 "$disk_image" | awk '{print $1}')"
if [[ "$actual_sha256" != "$expected_sha256" ]]; then
  echo "Download verification failed. Nothing was installed." >&2
  exit 1
fi

hdiutil attach "$disk_image" -nobrowse -readonly -mountpoint "$mount_point" -quiet
mkdir -p "$install_dir"

if [[ -d "$destination" ]]; then
  backup="$install_dir/CT-PET Review Workstation.backup-$(date +%Y%m%d-%H%M%S).app"
  if [[ -w "$install_dir" ]]; then
    mv "$destination" "$backup"
  else
    sudo mv "$destination" "$backup"
  fi
  echo "Backed up the previous app to: $backup"
fi

echo "Installing CT-PET Review Workstation $version (macOS may ask for your password)…"
if [[ -w "$install_dir" ]]; then
  ditto "$mount_point/$app_name" "$destination"
  xattr -r -d com.apple.quarantine "$destination" 2>/dev/null || true
else
  sudo ditto "$mount_point/$app_name" "$destination"
  sudo xattr -r -d com.apple.quarantine "$destination" 2>/dev/null || true
fi

codesign --verify --deep --strict "$destination"
installed_version="$(defaults read "$destination/Contents/Info" CFBundleShortVersionString)"
if [[ "$installed_version" != "$version" ]]; then
  echo "Installed version $installed_version did not match expected version $version." >&2
  exit 1
fi

if [[ "${CTPET_NO_OPEN:-0}" != "1" ]]; then
  open "$destination"
fi
echo "Installed CT-PET Review Workstation $version. Choose any folder containing aligned CT, PET, and segmentation NIfTI files."
