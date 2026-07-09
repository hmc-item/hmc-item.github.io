# build-standalone.ps1 — 방법2: 자기완결형 HTML 세트 생성
# 실행: PowerShell에서  ./build-standalone.ps1   (item-dev 폴더 기준)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out  = Join-Path $root 'dist-standalone'
New-Item -ItemType Directory -Force -Path $out | Out-Null

# UTF-8(BOM 없음) 인코딩 + 루트를 script 스코프로(델리게이트에서 참조)
$script:enc  = New-Object System.Text.UTF8Encoding($false)
$script:sroot = $root

# 로고 → data URI
$logoBytes = [System.IO.File]::ReadAllBytes((Join-Path $root 'assets/hyundai-logo.png'))
$logoUri   = 'data:image/png;base64,' + [System.Convert]::ToBase64String($logoBytes)

# CSS/JS 인라인 델리게이트 (조기 종료 방지 이스케이프 포함)
$cssEval = [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  $css = [System.IO.File]::ReadAllText((Join-Path $script:sroot ('css/' + $m.Groups[1].Value)))
  '<style>' + ($css -replace '(?i)</style', '<\/style') + '</style>'
}
$jsEval = [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  $js = [System.IO.File]::ReadAllText((Join-Path $script:sroot ('js/' + $m.Groups[1].Value)))
  '<script>' + ($js -replace '(?i)</script', '<\/script') + '</script>'
}

$pages = 'entry','team','items','review','admin','samples','theory'
foreach($page in $pages){
  $html = [System.IO.File]::ReadAllText((Join-Path $root "$page.html"))

  # 1) CSS 인라인:  <link rel="stylesheet" href="css/X.css">  ->  <style>...</style>
  $html = [regex]::Replace($html, '<link[^>]*rel="stylesheet"[^>]*href="css/([^"]+)"[^>]*>', $cssEval)

  # 2) JS 인라인:  <script src="js/....js"></script>  ->  <script>...</script>  (lib 포함)
  $html = [regex]::Replace($html, '<script[^>]*src="js/([^"]+)"[^>]*>\s*</script>', $jsEval)

  # 3) 로고 참조(HTML <img> + 인라인된 session.js navbar 문자열) -> data URI
  $html = $html.Replace('assets/hyundai-logo.png', $logoUri)

  [System.IO.File]::WriteAllText((Join-Path $out "$page.html"), $html, $script:enc)
  Write-Host "built: $page.html"
}

# index.html: 원본 그대로 복사(entry.html로 meta refresh)
Copy-Item (Join-Path $root 'index.html') (Join-Path $out 'index.html') -Force
Write-Host 'built: index.html'
Write-Host ("Done -> " + $out)
