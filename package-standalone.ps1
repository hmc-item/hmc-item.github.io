# package-standalone.ps1 — 사내망 배포용: dist-standalone 재빌드 + zip 압축을 한 번에
# 실행: PowerShell에서  ./package-standalone.ps1   (어느 폴더에서 실행해도 됨)
# 산출물: 프로젝트 루트의  문항개발_사내망_standalone.zip
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                                   # item-dev 폴더
$dist = Join-Path $root 'dist-standalone'
$zip  = Join-Path (Split-Path $root -Parent) '문항개발_사내망_standalone.zip'

# 1) 자기완결형 HTML 재빌드(원본이 단일 진실 공급원)
Write-Host '[1/3] dist-standalone 재빌드...' -ForegroundColor Cyan
& (Join-Path $root 'build-standalone.ps1')

# 2) 옛 이모지/누락 간단 점검(선택적 안전장치)
Write-Host '[2/3] 번들 점검...' -ForegroundColor Cyan
$files = Get-ChildItem $dist -Filter *.html
if ($files.Count -lt 7) { throw "dist-standalone HTML이 7개 미만입니다($($files.Count)) — 빌드 확인 필요" }

# 3) zip 압축(폴더째 — 상대 링크 유지)
Write-Host '[3/3] zip 압축...' -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $dist -DestinationPath $zip -CompressionLevel Optimal

$item = Get-Item $zip
Write-Host ''
Write-Host ("완료 → {0}" -f $item.FullName) -ForegroundColor Green
Write-Host ("크기 : {0:N0} KB · HTML {1}개" -f ($item.Length / 1KB), $files.Count)
Write-Host '전달: zip 풀면 dist-standalone 폴더째 나옴 → entry.html 더블클릭(file://). 폴더 유지 필수.'
