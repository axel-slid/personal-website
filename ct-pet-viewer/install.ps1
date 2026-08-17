$ErrorActionPreference = "Stop"

if (-not [Environment]::Is64BitOperatingSystem) {
  throw "CT-PET Review Workstation requires 64-bit Windows 10 or 11."
}

$downloadUrl = "https://github.com/axel-slid/personal-website/releases/download/ct-pet-viewer-v1.1.0/CT-PET-Review-Workstation-1.1.0-Windows-x64.exe"
$expectedSha256 = "403725950e07c624de4455f0e9dda00e721f0b717c1a1bee82347ffe9b797805"
$installWork = Join-Path ([IO.Path]::GetTempPath()) ("ct-pet-viewer-" + [Guid]::NewGuid().ToString("N"))
$installer = Join-Path $installWork "CT-PET-Review-Workstation-Setup.exe"

New-Item -ItemType Directory -Path $installWork | Out-Null
try {
  Write-Host "Downloading CT-PET Review Workstation..."
  & curl.exe -fL --retry 3 --progress-bar $downloadUrl -o $installer
  if ($LASTEXITCODE -ne 0) { throw "The Windows installer download failed." }
  $actualSha256 = (Get-FileHash -Algorithm SHA256 $installer).Hash.ToLowerInvariant()
  if ($actualSha256 -ne $expectedSha256) { throw "Download verification failed. Nothing was installed." }
  Start-Process -FilePath $installer -Wait
  Write-Host "Installation complete. Download the task021-task030 case folder separately; the app will find it under Downloads."
}
finally {
  Remove-Item -LiteralPath $installWork -Recurse -Force -ErrorAction SilentlyContinue
}
