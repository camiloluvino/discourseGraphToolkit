// ============================================================================
// HTML: Node Renderers
// Funciones de renderizado para cada tipo de nodo (QUE, CLM, EVD)
// Recursión dinámica para profundidad ilimitada
// ============================================================================

DiscourseGraphToolkit.HtmlNodeRenderers = {

    // Límite de seguridad para recursión
    MAX_RENDER_DEPTH: 10,

    // Renderiza un nodo CLM o EVD recursivamente a cualquier profundidad
    renderNode: function (nodeUid, allNodes, config, excludeBitacora, depth, visited, parentId, skeletonMode, includeProjectMetadata = true) {
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
        const cssClass = type === 'CLM' ? 'clm-node' : (type === 'EVD' ? 'evd-node' : (type === 'GRI' ? 'gri-node' : 'node'));

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
        if (includeProjectMetadata) {
            html += helpers.generateMetadataHtml(node.project_metadata || {}, depth > 3);
        }

        // Contenido del nodo — SKIP en modo esqueleto
        if (config[type] && !skeletonMode) {
            const content = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(node.data, config[type], type, excludeBitacora);
            if (content) {
                const contentStyle = depth > 4 ? ` style="margin-left: ${Math.min((depth - 3) * 5, 20)}px; font-size: ${Math.max(13 - depth, 10)}px; color: #333;"` : '';
                html += `<div class="node content-node"${contentStyle}>`;
                html += `<p>${helpers.formatContentForHtml(content)}</p>`;
                html += '</div>';
            }
        }

        // Hijos de GRI (Comodín Universal): contained_nodes, related_clms, direct_evds, related_gris, supporting_clms, related_evds, supporting_gris, connected_clms, connected_gris
        if (type === 'GRI') {
            let hasGRIChildren = false;

            if (node.contained_nodes && node.contained_nodes.length > 0) {
                hasGRIChildren = true;
                html += '<div class="contained-nodes">';
                for (let cn = 0; cn < node.contained_nodes.length; cn++) {
                    const cnId = parentId ? `${parentId}_cn${cn}` : '';
                    html += this.renderNode(node.contained_nodes[cn], allNodes, config, excludeBitacora, depth + 1, visited, cnId, skeletonMode, includeProjectMetadata);
                }
                html += '</div>';
            }
            if (node.related_clms && node.related_clms.length > 0) {
                hasGRIChildren = true;
                for (let rc = 0; rc < node.related_clms.length; rc++) {
                    const rcId = parentId ? `${parentId}_rc${rc}` : '';
                    html += this.renderNode(node.related_clms[rc], allNodes, config, excludeBitacora, depth + 1, visited, rcId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.direct_evds && node.direct_evds.length > 0) {
                hasGRIChildren = true;
                for (let de = 0; de < node.direct_evds.length; de++) {
                    const deId = parentId ? `${parentId}_de${de}` : '';
                    html += this.renderNode(node.direct_evds[de], allNodes, config, excludeBitacora, depth + 1, visited, deId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.related_gris && node.related_gris.length > 0) {
                hasGRIChildren = true;
                for (let rg = 0; rg < node.related_gris.length; rg++) {
                    const rgId = parentId ? `${parentId}_rg${rg}` : '';
                    html += this.renderNode(node.related_gris[rg], allNodes, config, excludeBitacora, depth + 1, visited, rgId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.supporting_clms && node.supporting_clms.length > 0) {
                hasGRIChildren = true;
                for (let sc = 0; sc < node.supporting_clms.length; sc++) {
                    const scId = parentId ? `${parentId}_sc${sc}` : '';
                    html += this.renderNode(node.supporting_clms[sc], allNodes, config, excludeBitacora, depth + 1, visited, scId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.related_evds && node.related_evds.length > 0) {
                hasGRIChildren = true;
                for (let re = 0; re < node.related_evds.length; re++) {
                    const reId = parentId ? `${parentId}_re${re}` : '';
                    html += this.renderNode(node.related_evds[re], allNodes, config, excludeBitacora, depth + 1, visited, reId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.supporting_gris && node.supporting_gris.length > 0) {
                hasGRIChildren = true;
                for (let sg = 0; sg < node.supporting_gris.length; sg++) {
                    const sgId = parentId ? `${parentId}_sg${sg}` : '';
                    html += this.renderNode(node.supporting_gris[sg], allNodes, config, excludeBitacora, depth + 1, visited, sgId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.connected_clms && node.connected_clms.length > 0) {
                hasGRIChildren = true;
                for (let cc = 0; cc < node.connected_clms.length; cc++) {
                    const ccId = parentId ? `${parentId}_cc${cc}` : '';
                    html += this.renderNode(node.connected_clms[cc], allNodes, config, excludeBitacora, depth + 1, visited, ccId, skeletonMode, includeProjectMetadata);
                }
            }
            if (node.connected_gris && node.connected_gris.length > 0) {
                hasGRIChildren = true;
                for (let cg = 0; cg < node.connected_gris.length; cg++) {
                    const cgId = parentId ? `${parentId}_cg${cg}` : '';
                    html += this.renderNode(node.connected_gris[cg], allNodes, config, excludeBitacora, depth + 1, visited, cgId, skeletonMode, includeProjectMetadata);
                }
            }

            if (!hasGRIChildren && !skeletonMode) {
                html += '<p class="error-message">No se encontraron contenidos en este grupo.</p>';
            }
        }

        if (type !== 'GRI') {
            // Hijos: CLMs de soporte (recursión)
            const hasSupportingClms = node.supporting_clms && node.supporting_clms.length > 0;
            if (hasSupportingClms) {
                html += '<div class="supporting-clms">';
                for (const suppUid of node.supporting_clms) {
                    html += this.renderNode(suppUid, allNodes, config, excludeBitacora, depth + 1, visited, '', skeletonMode, includeProjectMetadata);
                }
                html += '</div>';
            }

            // Hijos: EVDs relacionados
            const hasRelatedEvds = node.related_evds && node.related_evds.length > 0;
            if (hasRelatedEvds) {
                for (let k = 0; k < node.related_evds.length; k++) {
                    const evdId = parentId ? `${parentId}_e${k}` : '';
                    html += this.renderNode(node.related_evds[k], allNodes, config, excludeBitacora, depth + 1, visited, evdId, skeletonMode, includeProjectMetadata);
                }
            }

            // Hijos: GRIs de soporte (recursión para CLM)
            const hasSupportingGris = node.supporting_gris && node.supporting_gris.length > 0;
            if (hasSupportingGris) {
                for (let sg = 0; sg < node.supporting_gris.length; sg++) {
                    const sgId = parentId ? `${parentId}_sg${sg}` : '';
                    html += this.renderNode(node.supporting_gris[sg], allNodes, config, excludeBitacora, depth + 1, visited, sgId, skeletonMode, includeProjectMetadata);
                }
            }

            // Mensaje — SKIP en modo esqueleto
            if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds && !hasSupportingGris && !skeletonMode) {
                html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
            }

            // Hijos: CLMs relacionados (para QUE)
            const hasRelatedClms = node.related_clms && node.related_clms.length > 0;
            if (hasRelatedClms) {
                for (let c = 0; c < node.related_clms.length; c++) {
                    const clmId = parentId ? `${parentId}_c${c}` : '';
                    html += this.renderNode(node.related_clms[c], allNodes, config, excludeBitacora, depth + 1, visited, clmId, skeletonMode, includeProjectMetadata);
                }
            }

            // Hijos: EVDs directos (para QUE)
            const hasDirectEvds = node.direct_evds && node.direct_evds.length > 0;
            if (hasDirectEvds) {
                for (let d = 0; d < node.direct_evds.length; d++) {
                    const evdId = parentId ? `${parentId}_de${d}` : '';
                    html += this.renderNode(node.direct_evds[d], allNodes, config, excludeBitacora, depth + 1, visited, evdId, skeletonMode, includeProjectMetadata);
                }
            }

            // Hijos: GRIs relacionados (para QUE)
            const hasRelatedGris = node.related_gris && node.related_gris.length > 0;
            if (hasRelatedGris) {
                for (let rg = 0; rg < node.related_gris.length; rg++) {
                    const rgId = parentId ? `${parentId}_rg${rg}` : '';
                    html += this.renderNode(node.related_gris[rg], allNodes, config, excludeBitacora, depth + 1, visited, rgId, skeletonMode, includeProjectMetadata);
                }
            }

            // Mensaje — SKIP en modo esqueleto
            if (type === 'QUE' && !hasRelatedClms && !hasDirectEvds && !hasRelatedGris && !skeletonMode) {
                html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
            }
        }

        html += `</div></div>`;

        visited[nodeUid] = false; // Liberar para ramas paralelas
        return html;
    },

    // Renderiza una pregunta completa con todos sus hijos (entry point)
    renderQuestion: function (question, qIndex, allNodes, config, excludeBitacora, skeletonMode, includeProjectMetadata = true) {
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
        if (includeProjectMetadata) {
            html += helpers.generateMetadataHtml(question.project_metadata || {});
        }

        // Contenido QUE — SKIP en modo esqueleto
        if (!skeletonMode) {
            const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora);
            if (queContent) {
                html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                html += `<p>${helpers.formatContentForHtml(queContent)}</p>`;
                html += `</div>`;
            }
        }

        const hasClms = question.related_clms && question.related_clms.length > 0;
        const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
        const hasRelatedGris = question.related_gris && question.related_gris.length > 0;

        if (!hasClms && !hasDirectEvds && !hasRelatedGris) {
            if (!skeletonMode) {
                html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
            }
            html += '</div></div>';
            return html;
        }

        // CLMs (recursión desde profundidad 3)
        if (question.related_clms) {
            for (let j = 0; j < question.related_clms.length; j++) {
                const clmId = `q${qIndex}_c${j}`;
                html += this.renderNode(question.related_clms[j], allNodes, config, excludeBitacora, 3, {}, clmId, skeletonMode, includeProjectMetadata);
            }
        }

        // Direct EVDs (profundidad 3)
        if (question.direct_evds) {
            for (let j = 0; j < question.direct_evds.length; j++) {
                const evdId = `q${qIndex}_de${j}`;
                html += this.renderNode(question.direct_evds[j], allNodes, config, excludeBitacora, 3, {}, evdId, skeletonMode, includeProjectMetadata);
            }
        }

        // GRIs relacionados (profundidad 3)
        if (question.related_gris) {
            for (let j = 0; j < question.related_gris.length; j++) {
                const griId = `q${qIndex}_rg${j}`;
                html += this.renderNode(question.related_gris[j], allNodes, config, excludeBitacora, 3, {}, griId, skeletonMode, includeProjectMetadata);
            }
        }

        html += `</div></div>`;
        return html;
    },

    // Renderiza un nodo raíz GRI con todos sus nodos contenidos (entry point)
    renderRootNode: function (rootNode, qIndex, allNodes, config, excludeBitacora, skeletonMode, includeProjectMetadata = true) {
        const qId = `r${qIndex}`;
        const nodeType = rootNode.type || DiscourseGraphToolkit.getNodeType(rootNode.title);
        const prefix = `[[${nodeType}]]`;
        const title = DiscourseGraphToolkit.cleanText(rootNode.title.replace(`${prefix} - `, ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        const cssClass = nodeType === 'GRI' ? 'gri-node' : 'que-node';

        let html = `<div id="${qId}" class="node ${cssClass}">`;
        html += `<h2 class="collapsible">`;
        html += `<span class="node-tag">${prefix}</span> - ${title}`;
        html += `</h2>`;
        html += `<div class="content">`;

        // Metadata
        if (includeProjectMetadata) {
            html += helpers.generateMetadataHtml(rootNode.project_metadata || {});
        }

        // Contenido del nodo raíz — SKIP en modo esqueleto
        if (config[nodeType] && !skeletonMode) {
            const content = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(rootNode.data || rootNode, config[nodeType], nodeType, excludeBitacora);
            if (content) {
                html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                html += `<p>${helpers.formatContentForHtml(content)}</p>`;
                html += `</div>`;
            }
        }

        // Nodos hijos de GRI (Comodín Universal)
        let hasGRIChildren = false;
        let griChildrenHtml = '';

        if (rootNode.contained_nodes && rootNode.contained_nodes.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.contained_nodes.length; j++) {
                const cnId = `r${qIndex}_cn${j}`;
                griChildrenHtml += this.renderNode(rootNode.contained_nodes[j], allNodes, config, excludeBitacora, 3, {}, cnId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.related_clms && rootNode.related_clms.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.related_clms.length; j++) {
                const rcId = `r${qIndex}_rc${j}`;
                griChildrenHtml += this.renderNode(rootNode.related_clms[j], allNodes, config, excludeBitacora, 3, {}, rcId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.direct_evds && rootNode.direct_evds.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.direct_evds.length; j++) {
                const deId = `r${qIndex}_de${j}`;
                griChildrenHtml += this.renderNode(rootNode.direct_evds[j], allNodes, config, excludeBitacora, 3, {}, deId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.related_gris && rootNode.related_gris.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.related_gris.length; j++) {
                const rgId = `r${qIndex}_rg${j}`;
                griChildrenHtml += this.renderNode(rootNode.related_gris[j], allNodes, config, excludeBitacora, 3, {}, rgId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.supporting_clms && rootNode.supporting_clms.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.supporting_clms.length; j++) {
                const scId = `r${qIndex}_sc${j}`;
                griChildrenHtml += this.renderNode(rootNode.supporting_clms[j], allNodes, config, excludeBitacora, 3, {}, scId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.related_evds && rootNode.related_evds.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.related_evds.length; j++) {
                const reId = `r${qIndex}_re${j}`;
                griChildrenHtml += this.renderNode(rootNode.related_evds[j], allNodes, config, excludeBitacora, 3, {}, reId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.supporting_gris && rootNode.supporting_gris.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.supporting_gris.length; j++) {
                const sgId = `r${qIndex}_sg${j}`;
                griChildrenHtml += this.renderNode(rootNode.supporting_gris[j], allNodes, config, excludeBitacora, 3, {}, sgId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.connected_clms && rootNode.connected_clms.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.connected_clms.length; j++) {
                const ccId = `r${qIndex}_cc${j}`;
                griChildrenHtml += this.renderNode(rootNode.connected_clms[j], allNodes, config, excludeBitacora, 3, {}, ccId, skeletonMode, includeProjectMetadata);
            }
        }
        if (rootNode.connected_gris && rootNode.connected_gris.length > 0) {
            hasGRIChildren = true;
            for (let j = 0; j < rootNode.connected_gris.length; j++) {
                const cgId = `r${qIndex}_cg${j}`;
                griChildrenHtml += this.renderNode(rootNode.connected_gris[j], allNodes, config, excludeBitacora, 3, {}, cgId, skeletonMode, includeProjectMetadata);
            }
        }

        if (!hasGRIChildren) {
            if (!skeletonMode) {
                html += '<p class="error-message">No se encontraron nodos contenidos en este grupo.</p>';
            }
            html += '</div></div>';
            return html;
        }

        html += griChildrenHtml;

        html += `</div></div>`;
        return html;
    }
};

