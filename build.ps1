$ErrorActionPreference = "Stop"

$version = "1.3.2"
$outputFile = "discourse-graph-toolkit.js"

$files = @(
    "src/config.js",
    "src/utils/helpers.js",
    "src/utils/toast.js",
    "src/state.js",
    "src/api/roamProjects.js",
    "src/api/roamSearch.js",
    "src/api/roamBranchVerification.js",
    "src/api/roamStructureVerification.js",
    "src/core/nodes.js",
    "src/core/projects.js",
    "src/core/export.js",
    "src/core/import.js",
    "src/core/contentProcessor.js",
    "src/core/relationshipMapper.js",
    "src/core/markdownCore.js",
    "src/core/html/htmlStyles.js",
    "src/core/html/htmlHelpers.js",
    "src/core/html/htmlNodeRenderers.js",
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

# --- Leer markdownCore.js para inyectar en el HTML embebido ---
$markdownCorePath = "src/core/markdownCore.js"
if (Test-Path $markdownCorePath) {
    Write-Host "  Reading MarkdownCore for HTML injection..."
    $markdownCore = Get-Content $markdownCorePath -Raw -Encoding UTF8
}
else {
    Write-Error "CRITICAL: $markdownCorePath not found! Build aborted."
    exit 1
}

# --- Leer htmlEmbeddedScript.js ---
$embeddedScriptPath = "src/core/htmlEmbeddedScript.js"
if (Test-Path $embeddedScriptPath) {
    Write-Host "  Reading embedded HTML script..."
    $embeddedScript = Get-Content $embeddedScriptPath -Raw -Encoding UTF8
}
else {
    Write-Error "CRITICAL: $embeddedScriptPath not found! Build aborted."
    exit 1
}

# --- Concatenar MarkdownCore + HTMLEmbeddedScript ---
$fullEmbeddedScript = $markdownCore + "`n`n" + $embeddedScript

# --- Escapar para uso dentro de template string JavaScript ---
# Escapar: backslash -> \\, backtick -> \`, ${} -> \${}
$embeddedScriptEscaped = $fullEmbeddedScript -replace '\\', '\\' -replace '`', '\`' -replace '\$\{', '\${'

# --- Construir el header del bundle ---
$buildTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$content = "/**`n * DISCOURSE GRAPH TOOLKIT v$version`n * Bundled build: $buildTimestamp`n */`n`n(function () {`n    'use strict';`n`n    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};`n    DiscourseGraphToolkit.VERSION = `"$version`";`n`n// --- EMBEDDED SCRIPT FOR HTML EXPORT (MarkdownCore + htmlEmbeddedScript.js) ---`nDiscourseGraphToolkit._HTML_EMBEDDED_SCRIPT = ``$embeddedScriptEscaped``;`n`n"

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

$content += "`n})();`n"

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
