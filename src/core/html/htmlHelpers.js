// ============================================================================
// HTML: Helpers
// Funciones auxiliares para generación de HTML
// ============================================================================

DiscourseGraphToolkit.HtmlHelpers = {

    // Formatea contenido para HTML (escape + newlines a br)
    formatContentForHtml: function (content) {
        if (!content) return "";
        return content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    },

    // Genera HTML para metadata de proyecto
    generateMetadataHtml: function (metadata, small = false) {
        if (!metadata || Object.keys(metadata).length === 0) return "";

        const proyecto = metadata.proyecto_asociado;
        const seccion = metadata.seccion_tesis;

        if (!proyecto && !seccion) return "";

        let html = '<div class="project-metadata"';
        if (small) html += ' style="font-size: 10px; padding: 6px 8px; margin: 6px 0 8px 0;"';
        html += '>';

        if (proyecto) html += `<div class="metadata-item"><span class="metadata-label">Proyecto Asociado:</span><span class="metadata-value">${proyecto}</span></div>`;
        if (seccion) html += `<div class="metadata-item"><span class="metadata-label">Sección Narrativa:</span><span class="metadata-value">${seccion}</span></div>`;

        html += '</div>';
        return html;
    },

    // Copia estructura de bloques sin referencias circulares (para embeddedData)
    cleanBlockData: function (block, depth = 0) {
        if (!block || typeof block !== 'object' || depth > 25) return null;

        const clean = {};

        // Copiar solo propiedades seguras
        if (block.string !== undefined) clean.string = block.string;
        if (block[':block/string'] !== undefined) clean.string = block[':block/string'];
        if (block.uid !== undefined) clean.uid = block.uid;
        if (block[':block/uid'] !== undefined) clean.uid = block[':block/uid'];
        if (block.title !== undefined) clean.title = block.title;
        if (block[':node/title'] !== undefined) clean.title = block[':node/title'];

        // Copiar children recursivamente
        const children = block.children || block[':block/children'];
        if (Array.isArray(children) && children.length > 0) {
            clean.children = children.map(child => this.cleanBlockData(child, depth + 1)).filter(c => c !== null);
        }

        return clean;
    }
};
