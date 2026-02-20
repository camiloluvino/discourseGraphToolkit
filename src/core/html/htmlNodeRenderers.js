// ============================================================================
// HTML: Node Renderers
// Funciones de renderizado para cada tipo de nodo (QUE, CLM, EVD)
// Recursión dinámica para profundidad ilimitada
// ============================================================================

DiscourseGraphToolkit.HtmlNodeRenderers = {

    // Límite de seguridad para recursión
    MAX_RENDER_DEPTH: 10,

    // Renderiza un nodo CLM o EVD recursivamente a cualquier profundidad
    renderNode: function (nodeUid, allNodes, config, excludeBitacora, depth, visited, parentId) {
        if (!nodeUid || !allNodes[nodeUid]) return '';
        if (depth > this.MAX_RENDER_DEPTH) return '';
        if (visited[nodeUid]) return ''; // Evitar ciclos
        visited[nodeUid] = true;

        const node = allNodes[nodeUid];
        const type = node.type; // 'CLM' o 'EVD'
        const helpers = DiscourseGraphToolkit.HtmlHelpers;
        const title = DiscourseGraphToolkit.cleanText((node.title || '').replace(`[[${type}]] - `, ''));

        // Determinar nivel de heading HTML (h3-h6, máximo h6)
        const hLevel = Math.min(depth, 6);
        // Indentación extra para niveles > 6
        const extraIndent = depth > 6 ? (depth - 6) * 15 : 0;
        const extraStyle = extraIndent > 0 ? ` style="margin-left: ${extraIndent}px;"` : '';

        // CSS class basada en tipo
        const cssClass = type === 'CLM' ? 'clm-node' : (type === 'EVD' ? 'evd-node' : 'node');

        let html = `<div id="${parentId || ''}" class="node ${cssClass}"${extraStyle}>`;
        html += `<h${hLevel} class="collapsible">`;
        html += `<span class="node-tag">[[${type}]]</span> - ${title}`;
        // Botón copiar solo para CLMs de primer nivel (depth 3)
        if (type === 'CLM' && depth === 3 && parentId) {
            html += `<button class="btn-copy-individual" onclick="copyIndividualCLM('${parentId}')">Copiar</button>`;
        }
        html += `</h${hLevel}>`;
        html += `<div class="content">`;

        // Metadata
        html += helpers.generateMetadataHtml(node.project_metadata || {}, depth > 3);

        // Contenido del nodo
        if (config[type]) {
            const content = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(node.data, config[type], type, excludeBitacora);
            if (content) {
                const contentStyle = depth > 4 ? ` style="margin-left: ${Math.min((depth - 3) * 5, 20)}px; font-size: ${Math.max(13 - depth, 10)}px; color: #333;"` : '';
                html += `<div class="node content-node"${contentStyle}>`;
                html += `<p>${helpers.formatContentForHtml(content)}</p>`;
                html += '</div>';
            }
        }

        // Hijos: CLMs de soporte (recursión)
        const hasSupportingClms = node.supporting_clms && node.supporting_clms.length > 0;
        if (hasSupportingClms) {
            html += '<div class="supporting-clms">';
            for (const suppUid of node.supporting_clms) {
                html += this.renderNode(suppUid, allNodes, config, excludeBitacora, depth + 1, visited, '');
            }
            html += '</div>';
        }

        // Hijos: EVDs relacionados
        const hasRelatedEvds = node.related_evds && node.related_evds.length > 0;
        if (hasRelatedEvds) {
            for (let k = 0; k < node.related_evds.length; k++) {
                const evdId = parentId ? `${parentId}_e${k}` : '';
                html += this.renderNode(node.related_evds[k], allNodes, config, excludeBitacora, depth + 1, visited, evdId);
            }
        }

        // Mensaje si un CLM no tiene ni EVDs ni CLMs de soporte
        if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds) {
            html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
        }

        html += `</div></div>`;

        visited[nodeUid] = false; // Liberar para ramas paralelas
        return html;
    },

    // Renderiza una pregunta completa con todos sus hijos (entry point)
    renderQuestion: function (question, qIndex, allNodes, config, excludeBitacora) {
        const qId = `q${qIndex}`;
        const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        let html = `<div id="${qId}" class="node que-node">`;
        html += `<h2 class="collapsible">`;
        html += `<span class="node-tag">[[QUE]]</span> - ${qTitle}`;
        html += `<button class="btn-copy-individual" onclick="copyIndividualQuestion('${qId}')">Copiar</button>`;
        html += `<button class="btn-export-md" onclick="exportQuestionMarkdown(${qIndex})" title="Exportar Markdown">MD</button>`;
        html += `<button class="btn-reorder btn-reorder-up" onclick="moveQuestionUp('${qId}')" title="Mover hacia arriba">↑</button>`;
        html += `<button class="btn-reorder btn-reorder-down" onclick="moveQuestionDown('${qId}')" title="Mover hacia abajo">↓</button>`;
        html += `</h2>`;
        html += `<div class="content">`;

        // Metadata
        html += helpers.generateMetadataHtml(question.project_metadata || {});

        // Contenido QUE
        const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora);
        if (queContent) {
            html += `<div class="node content-node" style="margin-bottom: 10px;">`;
            html += `<p>${helpers.formatContentForHtml(queContent)}</p>`;
            html += `</div>`;
        }

        const hasClms = question.related_clms && question.related_clms.length > 0;
        const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

        if (!hasClms && !hasDirectEvds) {
            html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
            html += '</div></div>';
            return html;
        }

        // CLMs (recursión desde profundidad 3)
        if (question.related_clms) {
            for (let j = 0; j < question.related_clms.length; j++) {
                const clmId = `q${qIndex}_c${j}`;
                html += this.renderNode(question.related_clms[j], allNodes, config, excludeBitacora, 3, {}, clmId);
            }
        }

        // Direct EVDs (profundidad 3)
        if (question.direct_evds) {
            for (let j = 0; j < question.direct_evds.length; j++) {
                const evdId = `q${qIndex}_de${j}`;
                html += this.renderNode(question.direct_evds[j], allNodes, config, excludeBitacora, 3, {}, evdId);
            }
        }

        html += `</div></div>`;
        return html;
    }
};

