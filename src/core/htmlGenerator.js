// ============================================================================
// CORE: HTML Generator
// Ported from roamMap/core/html_generator.py
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {
    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", extractAdditionalContent = false) {
        const css = this._getCSS();
        const js = this._getJS();

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

        for (let i = 0; i < questions.length; i++) {
            try {
                const question = questions[i];
                const qId = `q${i}`;
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));

                html += `<div id="${qId}" class="node que-node">`;
                html += `<h2 class="collapsible">`;
                html += `<span class="node-tag">[[QUE]]</span> - ${qTitle}`;
                html += `<button class="btn-copy-individual" onclick="copyIndividualQuestion('${qId}')">Copiar</button>`;
                html += `<button class="btn-reorder btn-reorder-up" onclick="moveQuestionUp('${qId}')" title="Mover hacia arriba">↑</button>`;
                html += `<button class="btn-reorder btn-reorder-down" onclick="moveQuestionDown('${qId}')" title="Mover hacia abajo">↓</button>`;
                html += `</h2>`;
                html += `<div class="content">`;

                // Metadata
                const metadata = question.project_metadata || {};
                html += this._generateMetadataHtml(metadata);

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
                    html += '</div></div>';
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (let j = 0; j < question.related_clms.length; j++) {
                        const clmUid = question.related_clms[j];
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmId = `q${i}_c${j}`;
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));

                            html += `<div id="${clmId}" class="node clm-node">`;
                            html += `<h3 class="collapsible">`;
                            html += `<span class="node-tag">[[CLM]]</span> - ${clmTitle}`;
                            html += `<button class="btn-copy-individual" onclick="copyIndividualCLM('${clmId}')">Copiar</button>`;
                            html += `</h3>`;
                            html += `<div class="content">`;

                            html += this._generateMetadataHtml(clm.project_metadata || {});

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                html += '<div class="supporting-clms">';
                                html += '<div class="connected-clm-title" style="color: #005a9e;"><strong>CLMs de soporte (SupportedBy):</strong></div>';

                                for (let suppIdx = 0; suppIdx < clm.supporting_clms.length; suppIdx++) {
                                    const suppUid = clm.supporting_clms[suppIdx];
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));

                                        html += `<div class="supporting-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${suppTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(suppClm.project_metadata || {}, true);

                                        // Evidencias de soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            html += '<div style="margin-left: 15px;"><strong>Evidencias:</strong></div>';
                                            for (const evdUid of suppClm.related_evds) {
                                                if (allNodes[evdUid]) {
                                                    const evd = allNodes[evdUid];
                                                    const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                                    html += `<div class="node" style="margin-left: 20px; border-left: 1px solid #e0e0e0;">`;
                                                    html += `<h6 class="collapsible" style="font-size: 11px; margin: 8px 0 4px 0;"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h6>`;
                                                    html += `<div class="content">`;
                                                    const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractEvdContent(evd.data, extractAdditionalContent);
                                                    if (detailedContent) {
                                                        html += '<div style="margin-left: 15px; font-size: 11px; color: #555;">';
                                                        html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                                        html += '</div>';
                                                    }
                                                    html += `</div></div>`;
                                                }
                                            }
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                                html += '</div>';
                            }

                            // Connected CLMs
                            if (clm.connected_clms && clm.connected_clms.length > 0) {
                                html += '<div class="connected-clms">';
                                html += '<div class="connected-clm-title"><strong>CLMs relacionados:</strong></div>';
                                for (const connUid of clm.connected_clms) {
                                    if (allNodes[connUid] && connUid !== clmUid) {
                                        const connClm = allNodes[connUid];
                                        const connTitle = DiscourseGraphToolkit.cleanText(connClm.title.replace("[[CLM]] - ", ""));
                                        html += `<div class="connected-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${connTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(connClm.project_metadata || {}, true);
                                        html += `</div></div>`;
                                    }
                                }
                                html += '</div>';
                            }

                            // EVDs
                            if (clm.related_evds && clm.related_evds.length > 0) {
                                html += '<div style="margin-top: 15px;"><strong>Evidencias que respaldan esta afirmación:</strong></div>';
                                for (let k = 0; k < clm.related_evds.length; k++) {
                                    const evdUid = clm.related_evds[k];
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdId = `q${i}_c${j}_e${k}`;
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                                        html += `<div id="${evdId}" class="node evd-node">`;
                                        html += `<h4 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h4>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(evd.project_metadata || {});

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractEvdContent(evd.data, extractAdditionalContent);
                                        if (detailedContent) {
                                            html += '<div class="node content-node">';
                                            html += '<p><strong>Contenido detallado:</strong></p>';
                                            html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                            html += '</div>';
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                            } else if ((!clm.connected_clms || clm.connected_clms.length === 0) && (!clm.supporting_clms || clm.supporting_clms.length === 0)) {
                                html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
                            }

                            html += `</div></div>`;
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (let j = 0; j < question.direct_evds.length; j++) {
                        const evdUid = question.direct_evds[j];
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdId = `q${i}_de${j}`;
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                            html += `<div id="${evdId}" class="node direct-evd-node">`;
                            html += `<h3 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h3>`;
                            html += `<div class="content">`;
                            html += this._generateMetadataHtml(evd.project_metadata || {});

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractEvdContent(evd.data, extractAdditionalContent);
                            if (detailedContent) {
                                html += '<div class="node direct-content-node">';
                                html += '<p><strong>Contenido detallado:</strong></p>';
                                html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                html += '</div>';
                            }
                            html += `</div></div>`;
                        }
                    }
                }

                html += `</div></div>`;

            } catch (e) {
                console.error(`Error procesando pregunta ${i}: ${e}`);
                html += `<div class="error-message">Error procesando pregunta: ${e}</div>`;
            }
        }

        html += `
    ${js}
</body>
</html>`;
        return html;
    },

    _generateMetadataHtml: function (metadata, small = false) {
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

    _formatContentForHtml: function (content) {
        if (!content) return "";
        // Simple escape and newline to br
        return content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    },

    _getCSS: function () {
        return `
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        h1 { font-size: 24px; font-weight: 300; margin: 0 0 30px 0; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; }
        h2 { font-size: 16px; font-weight: 500; margin: 20px 0 10px 0; position: relative; }
        h3 { font-size: 14px; font-weight: 500; margin: 15px 0 8px 0; }
        h4 { font-size: 13px; font-weight: 500; margin: 12px 0 6px 0; }
        h5 { font-size: 12px; font-weight: 500; margin: 10px 0 5px 0; color: #555; }
        h6 { font-size: 11px; font-weight: 500; margin: 8px 0 4px 0; color: #666; }
        .node { margin-bottom: 8px; padding-left: 12px; }
        .que-node { border-left: 2px solid #000; margin-bottom: 15px; }
        .clm-node { margin-left: 20px; border-left: 1px solid #d0d0d0; }
        .evd-node { margin-left: 40px; border-left: 1px solid #e0e0e0; }
        .direct-evd-node { margin-left: 20px; border-left: 1px solid #c8c8c8; background-color: #fafafa; border-radius: 3px; padding: 8px 12px; }
        .content-node, .direct-content-node { margin-left: 60px; border-left: 1px solid #f0f0f0; font-size: 12px; color: #4a4a4a; }
        .project-metadata { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 11px; color: #6c757d; }
        .connected-clms { margin-left: 40px; background-color: #f9f9f9; border-left: 2px solid #b0b0b0; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .supporting-clms { margin-left: 40px; background-color: #f0f7ff; border-left: 2px solid #007acc; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .connected-clm-item, .supporting-clm-item { margin-left: 10px; border-left: 1px solid #d8d8d8; padding: 6px 8px; margin-bottom: 8px; background-color: #fff; border-radius: 2px; }
        .collapsible { cursor: pointer; position: relative; padding-right: 25px; user-select: none; }
        .collapsible::after { content: '+'; position: absolute; right: 8px; top: 0; font-size: 14px; color: #888; }
        .active::after { content: '−'; }
        .content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; padding-right: 15px; }
        .show-content { max-height: none; overflow: visible; }
        .controls { position: sticky; top: 10px; background: rgba(255,255,255,0.95); padding: 12px 0; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; z-index: 100; }
        .btn { background: #fff; border: 1px solid #e0e0e0; padding: 6px 12px; margin-right: 8px; cursor: pointer; border-radius: 4px; }
        .btn:hover { background-color: #f8f8f8; }
        .btn-copy { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
        .btn-export { background: #007acc; color: #fff; border-color: #007acc; }
        .btn-copy-individual, .btn-reorder { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 2px 6px; margin-left: 8px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .node-tag { font-weight: 600; font-family: monospace; font-size: 11px; }
        .error-message { color: #777; font-style: italic; background-color: #f8f8f8; padding: 8px; }
        .copy-success { position: fixed; top: 20px; right: 20px; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; }
        .copy-success.show { opacity: 1; }
    </style>`;
    },

    _getJS: function () {
        return `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var coll = document.getElementsByClassName("collapsible");
            for (var i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function(e) {
                    if (e.target.tagName === 'BUTTON') return;
                    this.classList.toggle("active");
                    var content = this.nextElementSibling;
                    if (content.classList.contains("show-content")) {
                        content.classList.remove("show-content");
                        content.style.maxHeight = "0";
                    } else {
                        content.classList.add("show-content");
                        content.style.maxHeight = content.scrollHeight + "px";
                        setTimeout(function() { if (content.classList.contains("show-content")) content.style.maxHeight = "none"; }, 300);
                    }
                });
            }
            
            document.getElementById('expandAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.add('show-content'); c.style.maxHeight = "none"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.add('active'); });
            });
            
            document.getElementById('collapseAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.remove('show-content'); c.style.maxHeight = "0"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.remove('active'); });
            });

            document.getElementById('copyAll').addEventListener('click', function() {
                var text = document.body.innerText; // Simplificado para este ejemplo
                copyToClipboard(text);
            });
        });

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                showCopySuccess();
            }, function(err) {
                console.error('Async: Could not copy text: ', err);
            });
        }

        function showCopySuccess(msg) {
            var div = document.createElement('div');
            div.className = 'copy-success show';
            div.textContent = msg || 'Copiado!';
            document.body.appendChild(div);
            setTimeout(function() { document.body.removeChild(div); }, 2000);
        }
        
        function copyIndividualQuestion(id) { copyToClipboard(document.getElementById(id).innerText); }
        function copyIndividualCLM(id) { copyToClipboard(document.getElementById(id).innerText); }
        function moveQuestionUp(id) { 
            var el = document.getElementById(id);
            if (el.previousElementSibling && el.previousElementSibling.classList.contains('que-node')) 
                el.parentNode.insertBefore(el, el.previousElementSibling);
        }
        function moveQuestionDown(id) {
            var el = document.getElementById(id);
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('que-node'))
                el.parentNode.insertBefore(el.nextElementSibling, el);
        }
    </script>`;
    }
};
