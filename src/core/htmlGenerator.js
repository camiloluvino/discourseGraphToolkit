// ============================================================================
// CORE: HTML Generator
// Ported from roamMap/core/html_generator.py
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {
    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", contentConfig = true, excludeBitacora = true) {
        // Compatibilidad legacy
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

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
                html += `<button class="btn-export-md" onclick="exportQuestionMarkdown(${i})" title="Exportar Markdown">MD</button>`;
                html += `<button class="btn-reorder btn-reorder-up" onclick="moveQuestionUp('${qId}')" title="Mover hacia arriba">↑</button>`;
                html += `<button class="btn-reorder btn-reorder-down" onclick="moveQuestionDown('${qId}')" title="Mover hacia abajo">↓</button>`;
                html += `</h2>`;
                html += `<div class="content">`;

                // Metadata
                const metadata = question.project_metadata || {};
                html += this._generateMetadataHtml(metadata);

                // --- Contenido QUE ---
                const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora);
                if (queContent) {
                    html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                    html += `<p>${this._formatContentForHtml(queContent)}</p>`;
                    html += `</div>`;
                }
                // ---------------------

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

                            // --- NUEVO: Contenido del CLM ---
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, config.CLM, "CLM", excludeBitacora);
                            if (clmContent) {
                                html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                                html += `<p>${this._formatContentForHtml(clmContent)}</p>`;
                                html += `</div>`;
                            }
                            // --------------------------------

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                html += '<div class="supporting-clms">';
                                // html += '<div class="connected-clm-title" style="color: #005a9e;"><strong>CLMs de soporte (SupportedBy):</strong></div>';

                                for (let suppIdx = 0; suppIdx < clm.supporting_clms.length; suppIdx++) {
                                    const suppUid = clm.supporting_clms[suppIdx];
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));

                                        html += `<div class="supporting-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${suppTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(suppClm.project_metadata || {}, true);

                                        // --- NUEVO: Contenido CLM Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, config.CLM, "CLM", excludeBitacora);
                                        if (suppContent) {
                                            html += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px; color: #333;">`;
                                            html += `<p>${this._formatContentForHtml(suppContent)}</p>`;
                                            html += `</div>`;
                                        }
                                        // ------------------------------------

                                        // Evidencias de soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            // html += '<div style="margin-left: 15px;"><strong>Evidencias:</strong></div>';
                                            for (const evdUid of suppClm.related_evds) {
                                                if (allNodes[evdUid]) {
                                                    const evd = allNodes[evdUid];
                                                    const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                                    html += `<div class="node" style="margin-left: 20px; border-left: 1px solid #e0e0e0;">`;
                                                    html += `<h6 class="collapsible" style="font-size: 11px; margin: 8px 0 4px 0;"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h6>`;
                                                    html += `<div class="content">`;
                                                    const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
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


                            // EVDs
                            if (clm.related_evds && clm.related_evds.length > 0) {
                                // html += '<div style="margin-top: 15px;"><strong>Evidencias que respaldan esta afirmación:</strong></div>';
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

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                                        if (detailedContent) {
                                            html += '<div class="node content-node">';
                                            // html += '<p><strong>Contenido detallado:</strong></p>';
                                            html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                            html += '</div>';
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                            } else if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
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

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                            if (detailedContent) {
                                html += '<div class="node direct-content-node">';
                                // html += '<p><strong>Contenido detallado:</strong></p>';
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

        // Helper para copiar estructura de bloques sin referencias circulares
        const cleanBlockData = (block, depth = 0) => {
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
                clean.children = children.map(child => cleanBlockData(child, depth + 1)).filter(c => c !== null);
            }

            return clean;
        };

        // Preparar datos para embeber en el HTML (para que exportToMarkdown use los mismos datos)
        const embeddedData = {
            questions: questions.map(q => ({
                title: q.title,
                uid: q.uid,
                project_metadata: q.project_metadata,
                related_clms: q.related_clms,
                direct_evds: q.direct_evds,
                data: cleanBlockData(q.data || q)
            })),
            allNodes: Object.fromEntries(
                Object.entries(allNodes).map(([uid, node]) => [uid, {
                    title: node.title,
                    uid: node.uid,
                    type: node.type,
                    project_metadata: node.project_metadata,
                    related_evds: node.related_evds,
                    supporting_clms: node.supporting_clms,
                    data: cleanBlockData(node.data || node)
                }])
            ),
            config: config,
            excludeBitacora: excludeBitacora
        };

        html += `
    <script id="embedded-data" type="application/json">${JSON.stringify(embeddedData)}</script>
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
        .btn-export-md { background: #4CAF50; color: white; border: 1px solid #4CAF50; padding: 2px 6px; margin-left: 4px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .btn-export-md:hover { background: #45a049; }
        .node-tag { font-weight: 600; font-family: monospace; font-size: 11px; }
        .error-message { color: #777; font-style: italic; background-color: #f8f8f8; padding: 8px; }
        .copy-success { position: fixed; top: 20px; right: 20px; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; }
        .copy-success.show { opacity: 1; }
    </style>`;
    },

    _getJS: function () {
        return `
    <script>
        // --- Orden persistido ---
        var ORDER_KEY = 'discourseGraph_questionOrder';
        
        function saveOrder() {
            var order = [];
            document.querySelectorAll('.que-node').forEach(function(el) {
                order.push(el.id);
            });
            localStorage.setItem(ORDER_KEY, JSON.stringify(order));
            showCopySuccess('Orden guardado');
        }
        
        function loadOrder() {
            var saved = localStorage.getItem(ORDER_KEY);
            if (!saved) return;
            try {
                var order = JSON.parse(saved);
                var container = document.querySelector('.que-node').parentNode;
                order.forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) container.appendChild(el);
                });
            } catch(e) { console.warn('Error loading order:', e); }
        }
        
        function resetOrder() {
            localStorage.removeItem(ORDER_KEY);
            location.reload();
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Cargar orden guardado
            loadOrder();
            
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
                var text = document.body.innerText;
                copyToClipboard(text);
            });
            
            document.getElementById('exportMarkdown').addEventListener('click', function() {
                exportToMarkdown();
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
        
        function exportToMarkdown() {
            // Cargar datos embebidos
            var dataEl = document.getElementById('embedded-data');
            if (!dataEl) {
                alert('Error: No se encontraron datos embebidos para exportar.');
                return;
            }
            var data = JSON.parse(dataEl.textContent);
            var originalQuestions = data.questions;
            var allNodes = data.allNodes;
            var config = data.config;
            var excludeBitacora = data.excludeBitacora;
            
            // Reordenar questions según el orden actual del DOM
            var domOrder = [];
            document.querySelectorAll('.que-node').forEach(function(el) {
                // El ID es "q0", "q1", etc. - extraer el índice
                var idx = parseInt(el.id.replace('q', ''), 10);
                if (!isNaN(idx) && originalQuestions[idx]) {
                    domOrder.push(originalQuestions[idx]);
                }
            });
            // Usar el orden del DOM si está disponible, sino el original
            var questions = domOrder.length > 0 ? domOrder : originalQuestions;
            
            // --- ContentProcessor replicado ---
            function extractBlockContent(block, indentLevel, skipMetadata, visitedBlocks, maxDepth) {
                var content = '';
                if (!visitedBlocks) visitedBlocks = {};
                if (indentLevel > maxDepth) return content;
                if (!block || typeof block !== 'object') return content;
                
                var blockUid = block.uid || '';
                var blockString = block.string || '';
                
                if (blockUid && visitedBlocks[blockUid]) return content;
                if (blockUid) visitedBlocks[blockUid] = true;
                
                // Excluir bitácora
                if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) {
                    return '';
                }
                
                var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructural = structuralMarkers.indexOf(blockString) !== -1;
                
                if (skipMetadata && (!blockString || isStructural)) {
                    // Pass
                } else {
                    if (blockString) {
                        var indent = '';
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
                
                var children = block.children || [];
                for (var i = 0; i < children.length; i++) {
                    var childContent = extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth);
                    if (childContent) content += childContent;
                }
                
                if (blockUid) delete visitedBlocks[blockUid];
                return content;
            }
            
            function extractNodeContent(nodeData, extractAdditionalContent, nodeType) {
                var detailedContent = '';
                if (!nodeData) return detailedContent;
                
                var children = nodeData.children || [];
                if (children.length > 0) {
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        var childString = child.string || '';
                        var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                        var isStructuralMetadata = false;
                        for (var j = 0; j < structuralMetadata.length; j++) {
                            if (childString.indexOf(structuralMetadata[j]) === 0) {
                                isStructuralMetadata = true;
                                break;
                            }
                        }
                        
                        if (!isStructuralMetadata) {
                            var childContent = extractBlockContent(child, 0, false, null, 20);
                            if (childContent) detailedContent += childContent;
                        }
                    }
                }
                
                if (!detailedContent) {
                    var mainString = nodeData.string || '';
                    if (mainString) {
                        detailedContent += '- ' + mainString + '\\n';
                    } else {
                        var title = nodeData.title || '';
                        if (title) {
                            var prefix = '[[' + nodeType + ']] - ';
                            var cleanTitle = title.replace(prefix, '').trim();
                            if (cleanTitle) detailedContent += '- ' + cleanTitle + '\\n';
                        }
                    }
                }
                
                return detailedContent;
            }
            
            function cleanText(text) {
                return text.replace(/\\s+/g, ' ').trim();
            }
            
            // --- MarkdownGenerator replicado exactamente ---
            var result = '# Estructura de Investigación\\n\\n';
            
            for (var q = 0; q < questions.length; q++) {
                var question = questions[q];
                var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
                result += '## [[QUE]] - ' + qTitle + '\\n\\n';
                
                // Metadata
                var metadata = question.project_metadata || {};
                if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                    result += '**Información del proyecto:**\\n';
                    if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n';
                    if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\\n';
                    result += '\\n';
                }
                
                // Contenido QUE
                if (config.QUE) {
                    var queContent = extractNodeContent(question.data || question, true, 'QUE');
                    if (queContent) result += queContent + '\\n';
                }
                
                var hasClms = question.related_clms && question.related_clms.length > 0;
                var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
                
                if (!hasClms && !hasDirectEvds) {
                    result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
                    continue;
                }
                
                // CLMs
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        var clmUid = question.related_clms[c];
                        if (allNodes[clmUid]) {
                            var clm = allNodes[clmUid];
                            var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\\n\\n';
                            
                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n';
                                if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n';
                                result += '\\n\\n';
                            }
                            
                            // Contenido CLM
                            if (config.CLM) {
                                var clmContent = extractNodeContent(clm.data, true, 'CLM');
                                if (clmContent) result += clmContent + '\\n';
                            }
                            
                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\\n';
                                        
                                        if (config.CLM) {
                                            var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                            if (suppContent) result += '\\n' + suppContent + '\\n';
                                        }
                                    }
                                }
                                result += '\\n';
                            }
                            
                            // EVDs
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\\n\\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\\n\\n';
                                        
                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += '**Información del proyecto:**\\n';
                                            if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n';
                                            if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n';
                                            result += '\\n';
                                        }
                                        
                                        if (config.EVD) {
                                            var evdContent = extractNodeContent(evd.data, true, 'EVD');
                                            if (evdContent) {
                                                result += evdContent + '\\n';
                                            } else {
                                                result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Direct EVDs
                if (question.direct_evds) {
                    for (var d = 0; d < question.direct_evds.length; d++) {
                        var devdUid = question.direct_evds[d];
                        if (allNodes[devdUid]) {
                            var devd = allNodes[devdUid];
                            var devdTitle = cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\\n\\n';
                            
                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n';
                                if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n';
                                result += '\\n';
                            }
                            
                            if (config.EVD) {
                                var devdContent = extractNodeContent(devd.data, true, 'EVD');
                                if (devdContent) {
                                    result += devdContent + '\\n';
                                } else {
                                    result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                }
                            }
                        }
                    }
                }
            }
            
            // Descargar archivo con el mismo nombre que el HTML
            var fileName = (document.title || 'mapa_discurso').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
            var blob = new Blob([result], {type: 'text/markdown'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            showCopySuccess('Markdown exportado');
        }
        
        function copyIndividualQuestion(id) { copyToClipboard(document.getElementById(id).innerText); }
        function copyIndividualCLM(id) { copyToClipboard(document.getElementById(id).innerText); }
        
        function exportQuestionMarkdown(questionIndex) {
            var dataEl = document.getElementById('embedded-data');
            if (!dataEl) { alert('Error: No se encontraron datos embebidos.'); return; }
            var data = JSON.parse(dataEl.textContent);
            var allNodes = data.allNodes;
            var config = data.config;
            var excludeBitacora = data.excludeBitacora;
            var question = data.questions[questionIndex];
            if (!question) { alert('Error: Pregunta no encontrada.'); return; }
            
            function extractBlockContent(block, indentLevel, skipMetadata, visitedBlocks, maxDepth) {
                var content = '';
                if (!visitedBlocks) visitedBlocks = {};
                if (indentLevel > maxDepth) return content;
                if (!block || typeof block !== 'object') return content;
                var blockUid = block.uid || '';
                var blockString = block.string || '';
                if (blockUid && visitedBlocks[blockUid]) return content;
                if (blockUid) visitedBlocks[blockUid] = true;
                if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) return '';
                var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructural = structuralMarkers.indexOf(blockString) !== -1;
                if (skipMetadata && (!blockString || isStructural)) { } else {
                    if (blockString) {
                        var indent = '';
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
                var children = block.children || [];
                for (var i = 0; i < children.length; i++) {
                    var childContent = extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth);
                    if (childContent) content += childContent;
                }
                if (blockUid) delete visitedBlocks[blockUid];
                return content;
            }
            function extractNodeContent(nodeData, extractAdditionalContent, nodeType) {
                var detailedContent = '';
                if (!nodeData) return detailedContent;
                var children = nodeData.children || [];
                if (children.length > 0) {
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        var childString = child.string || '';
                        var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                        var isStructuralMetadata = false;
                        for (var j = 0; j < structuralMetadata.length; j++) {
                            if (childString.indexOf(structuralMetadata[j]) === 0) { isStructuralMetadata = true; break; }
                        }
                        if (!isStructuralMetadata) {
                            var childContent = extractBlockContent(child, 0, false, null, 20);
                            if (childContent) detailedContent += childContent;
                        }
                    }
                }
                if (!detailedContent) {
                    var mainString = nodeData.string || '';
                    if (mainString) { detailedContent += '- ' + mainString + '\\n'; }
                    else {
                        var title = nodeData.title || '';
                        if (title) {
                            var prefix = '[[' + nodeType + ']] - ';
                            var cleanTitle = title.replace(prefix, '').trim();
                            if (cleanTitle) detailedContent += '- ' + cleanTitle + '\\n';
                        }
                    }
                }
                return detailedContent;
            }
            function cleanText(text) { return text.replace(/\\s+/g, ' ').trim(); }
            
            var result = '';
            var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
            result += '## [[QUE]] - ' + qTitle + '\\n\\n';
            var metadata = question.project_metadata || {};
            if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                result += '**Información del proyecto:**\\n';
                if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n';
                if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\\n';
                result += '\\n';
            }
            if (config.QUE) {
                var queContent = extractNodeContent(question.data || question, true, 'QUE');
                if (queContent) result += queContent + '\\n';
            }
            var hasClms = question.related_clms && question.related_clms.length > 0;
            var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
            if (!hasClms && !hasDirectEvds) {
                result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
            } else {
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        var clmUid = question.related_clms[c];
                        if (allNodes[clmUid]) {
                            var clm = allNodes[clmUid];
                            var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\\n\\n';
                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n';
                                if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n';
                                result += '\\n\\n';
                            }
                            if (config.CLM) {
                                var clmContent = extractNodeContent(clm.data, true, 'CLM');
                                if (clmContent) result += clmContent + '\\n';
                            }
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\\n';
                                        if (config.CLM) {
                                            var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                            if (suppContent) result += '\\n' + suppContent + '\\n';
                                        }
                                    }
                                }
                                result += '\\n';
                            }
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM).*\\n\\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\\n\\n';
                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += '**Información del proyecto:**\\n';
                                            if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n';
                                            if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n';
                                            result += '\\n';
                                        }
                                        if (config.EVD) {
                                            var evdContent = extractNodeContent(evd.data, true, 'EVD');
                                            if (evdContent) result += evdContent + '\\n';
                                            else result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (question.direct_evds) {
                    for (var d = 0; d < question.direct_evds.length; d++) {
                        var devdUid = question.direct_evds[d];
                        if (allNodes[devdUid]) {
                            var devd = allNodes[devdUid];
                            var devdTitle = cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\\n\\n';
                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n';
                                if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n';
                                result += '\\n';
                            }
                            if (config.EVD) {
                                var devdContent = extractNodeContent(devd.data, true, 'EVD');
                                if (devdContent) result += devdContent + '\\n';
                                else result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                            }
                        }
                    }
                }
            }
            var fileName = 'QUE_' + qTitle.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
            var blob = new Blob([result], {type: 'text/markdown'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            showCopySuccess('Markdown exportado: ' + qTitle.substring(0, 20) + '...');
        }
        
        function moveQuestionUp(id) { 
            var el = document.getElementById(id);
            if (el.previousElementSibling && el.previousElementSibling.classList.contains('que-node')) {
                el.parentNode.insertBefore(el, el.previousElementSibling);
                saveOrder();
            }
        }
        function moveQuestionDown(id) {
            var el = document.getElementById(id);
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('que-node')) {
                el.parentNode.insertBefore(el.nextElementSibling, el);
                saveOrder();
            }
        }
    </script>`;
    }
};
