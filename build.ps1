$ErrorActionPreference = "Stop"

$version = "1.1.0"
$outputFile = "dist/extension.js"

$files = @(
    "src/config.js",
    "src/utils/helpers.js",
    "src/utils/toast.js",
    "src/state.js",
    "src/api/roam.js",
    "src/core/nodes.js",
    "src/core/projects.js",
    "src/core/export.js",
    "src/ui/modal.js",
    "src/index.js"
)

Write-Host "Building Discourse Graph Toolkit v$version..."

$content = @"
/**
 * DISCOURSE GRAPH TOOLKIT v$version
 * Bundled build: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "$version";

"@

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  Adding $file"
        $fileContent = Get-Content $file -Raw -Encoding UTF8
        $content += "`n// --- MODULE: $file ---`n"
        $content += $fileContent
        $content += "`n"
    }
    else {
        Write-Warning "File not found: $file"
    }
}

$content += @"

})();
"@

Set-Content -Path $outputFile -Value $content -Encoding UTF8
Write-Host "Build complete: $outputFile"
