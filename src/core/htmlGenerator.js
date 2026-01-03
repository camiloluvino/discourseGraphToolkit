// ============================================================================
// CORE: HTML Generator
// Orquestador para generación de HTML exportado
// Usa: HtmlStyles, HtmlHelpers, HtmlNodeRenderers
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {

    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", contentConfig = true, excludeBitacora = true) {
        // Compatibilidad legacy: si contentConfig es boolean, convertir a objeto
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

        const css = DiscourseGraphToolkit.HtmlStyles.getCSS();
        const js = this._getJS();

        // Header del documento
        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${css}
</head>
<body>
    <h1>${title}</h1>
    
    <div class="controls">
        <button id="expandAll" class="btn">Expandir Todo</button>
        <button id="collapseAll" class="btn">Contraer Todo</button>
        <button id="copyAll" class="btn btn-copy">Copiar Texto</button>
        <button id="exportMarkdown" class="btn btn-export">Exportar Markdown</button>
    </div>
`;

        // Renderizar cada pregunta
        for (let i = 0; i < questions.length; i++) {
            try {
                html += DiscourseGraphToolkit.HtmlNodeRenderers.renderQuestion(
                    questions[i], i, allNodes, config, excludeBitacora
                );
            } catch (e) {
                console.error(`Error procesando pregunta ${i}: ${e}`);
                html += `<div class="error-message">Error procesando pregunta: ${e}</div>`;
            }
        }

        // Preparar datos embebidos para el HTML
        const embeddedData = this._prepareEmbeddedData(questions, allNodes, config, excludeBitacora);

        // Footer con datos y scripts
        html += `
    <script id="embedded-data" type="application/json">${JSON.stringify(embeddedData)}</script>
    ${js}
</body>
</html>`;

        return html;
    },

    // Prepara los datos que se embeben en el HTML para exportación Markdown desde el navegador
    _prepareEmbeddedData: function (questions, allNodes, config, excludeBitacora) {
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        return {
            questions: questions.map(q => ({
                title: q.title,
                uid: q.uid,
                project_metadata: q.project_metadata,
                related_clms: q.related_clms,
                direct_evds: q.direct_evds,
                data: helpers.cleanBlockData(q.data || q)
            })),
            allNodes: Object.fromEntries(
                Object.entries(allNodes).map(([uid, node]) => [uid, {
                    title: node.title,
                    uid: node.uid,
                    type: node.type,
                    project_metadata: node.project_metadata,
                    related_evds: node.related_evds,
                    supporting_clms: node.supporting_clms,
                    data: helpers.cleanBlockData(node.data || node)
                }])
            ),
            config: config,
            excludeBitacora: excludeBitacora
        };
    },

    // Retorna el JavaScript embebido (inyectado en build)
    _getJS: function () {
        const scriptContent = DiscourseGraphToolkit._HTML_EMBEDDED_SCRIPT;
        return `<script>${scriptContent}</script>`;
    }
};
