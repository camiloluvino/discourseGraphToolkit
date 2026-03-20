// ============================================================================
// UTILS: Helpers
// ============================================================================

DiscourseGraphToolkit.sanitizeFilename = function (name) {
    if (!name || typeof name !== 'string') return 'export';
    return name
        .replace(/\.\./g, '').replace(/\.\//g, '').replace(/\\/g, '') // Path traversal
        .replace(/[\/\\]/g, '-') // Separadores
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Control chars
        .replace(/[<>:"|?*]/g, '') // Invalid chars
        .replace(/\s+/g, '_')
        .trim().toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 50) || 'export';
};

// Escape strings for safe use in Datalog queries
DiscourseGraphToolkit.escapeDatalogString = function (str) {
    if (!str || typeof str !== 'string') return '';
    // Escape backslashes first, then double quotes
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
};

DiscourseGraphToolkit.downloadJSON = function (data, filename) {
    let jsonStr;
    try {
        jsonStr = JSON.stringify(data, null, 2);
    } catch (e) {
        console.warn("JSON muy grande para format, intentando minificado...");
        try { jsonStr = JSON.stringify(data); }
        catch (e2) { throw new Error("Archivo demasiado grande para exportar."); }
    }
    this.downloadFile(filename, jsonStr, 'application/json');
};

DiscourseGraphToolkit.countBlocks = function (pageData) {
    if (!pageData) return 0;
    let count = 1;
    const children = pageData[':block/children'] || pageData['children'];
    if (children && Array.isArray(children)) {
        for (const child of children) count += this.countBlocks(child);
    }
    return count;
};

DiscourseGraphToolkit.convertTimestamp = function (timestamp) {
    return timestamp || Date.now();
};

DiscourseGraphToolkit.cleanText = function (text) {
    if (!text || typeof text !== 'string') return "";
    // Eliminar marcadores de Roam Research
    text = text.replace(/\[\[/g, "").replace(/\]\]/g, "");
    // Eliminar marcadores de formato Markdown
    text = text.replace(/\*\*/g, "");
    return text.trim();
};

DiscourseGraphToolkit.downloadFile = function (filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

DiscourseGraphToolkit.getNodeType = function (title) {
    if (!title) return null;
    if (title.includes('[[GRI]]')) return 'GRI';
    if (title.includes('[[QUE]]')) return 'QUE';
    if (title.includes('[[CLM]]')) return 'CLM';
    if (title.includes('[[EVD]]')) return 'EVD';
    return null;
};

// Parse markdown bold (**text**) into React elements
DiscourseGraphToolkit.parseMarkdownBold = function (text) {
    if (!text) return null;
    const React = window.React;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return React.createElement('strong', { key: index }, part.slice(2, -2));
        }
        return part;
    });
};

// Navigate to a Roam page, with fallback to opening in browser
DiscourseGraphToolkit.navigateToPage = function (uid) {
    try {
        window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
        this.minimizeModal();
    } catch (e) {
        console.error("Error navigating to page:", e);
        window.open(`https://roamresearch.com/#/app/${this.getGraphName()}/page/${uid}`, '_blank');
    }
};

// Format project name for export filenames (DG_proyecto_namespace)
DiscourseGraphToolkit.formatExportProjectName = function (pName) {
    return pName.split('/').map(part => this.sanitizeFilename(part).replace(/^dg_/i, '')).join('_');
};


