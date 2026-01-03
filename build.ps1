$ErrorActionPreference = "Stop"

$version = "1.2.3"
$outputFile = "discourse-graph-toolkit.js"

$files = @(
    "src/config.js",
    "src/utils/helpers.js",
    "src/utils/toast.js",
    "src/state.js",
    "src/api/roam.js",
    "src/core/nodes.js",
    "src/core/projects.js",
    "src/core/export.js",
    "src/core/import.js",
    "src/core/contentProcessor.js",
    "src/core/relationshipMapper.js",
    "src/core/htmlGenerator.js",
    "src/core/markdownGenerator.js",
    "src/core/epubGenerator.js",
    "src/ui/tabs/ProjectsTab.js",
    "src/ui/tabs/BranchesTab.js",
    "src/ui/tabs/ExportTab.js",
    "src/ui/tabs/ImportTab.js",
    "src/ui/modal.js",
    "src/index.js"
)

Write-Host "Building Discourse Graph Toolkit v$version..."

# --- Leer y preparar el script embebido para HTML ---
$embeddedScriptPath = "src/core/htmlEmbeddedScript.js"
if (Test-Path $embeddedScriptPath) {
    Write-Host "  Reading embedded HTML script..."
    $embeddedScript = Get-Content $embeddedScriptPath -Raw -Encoding UTF8
    # Escapar para uso dentro de template string JavaScript
    $embeddedScriptEscaped = $embeddedScript.Replace('\', '\\').Replace('`', '\`').Replace('$', '`$')
}
else {
    Write-Error "CRITICAL: $embeddedScriptPath not found! Build aborted."
    exit 1
}

$content = @"
/**
 * DISCOURSE GRAPH TOOLKIT v$version
 * Bundled build: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "$version";

// --- EMBEDDED SCRIPT FOR HTML EXPORT (from htmlEmbeddedScript.js) ---
DiscourseGraphToolkit._HTML_EMBEDDED_SCRIPT = `` `$($embeddedScriptEscaped)`` `;

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

# --- Verificar sintaxis ---
Write-Host "Verifying syntax..."
$syntaxCheck = & node -c $outputFile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "SYNTAX ERROR in $outputFile!"
    Write-Host $syntaxCheck
    exit 1
}
else {
    Write-Host "Syntax OK!"
}
