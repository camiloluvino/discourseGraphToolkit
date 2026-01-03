// ============================================================================
// HTML: Node Renderers
// Funciones de renderizado para cada tipo de nodo (QUE, CLM, EVD)
// ============================================================================

DiscourseGraphToolkit.HtmlNodeRenderers = {

    // Renderiza un EVD (usado tanto para EVDs de CLM como para EVDs de soporte)
    renderEVD: function (evd, evdId, config, excludeBitacora, isNested = false) {
        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        let html = '';

        if (isNested) {
            // EVD dentro de un supporting CLM - estilo más compacto
            html += `<div class="node" style="margin-left: 20px; border-left: 1px solid #e0e0e0;">`;
            html += `<h6 class="collapsible" style="font-size: 11px; margin: 8px 0 4px 0;"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h6>`;
        } else {
            // EVD normal
            html += `<div id="${evdId}" class="node evd-node">`;
            html += `<h4 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h4>`;
        }

        html += `<div class="content">`;
        html += helpers.generateMetadataHtml(evd.project_metadata || {});

        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
        if (detailedContent) {
            const style = isNested ? 'margin-left: 15px; font-size: 11px; color: #555;' : '';
            html += `<div class="node content-node"${style ? ` style="${style}"` : ''}>`;
            html += `<p>${helpers.formatContentForHtml(detailedContent)}</p>`;
            html += '</div>';
        }

        html += `</div></div>`;
        return html;
    },

    // Renderiza un CLM de soporte (bajo #SupportedBy de otro CLM)
    renderSupportingCLM: function (suppClm, allNodes, config, excludeBitacora) {
        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        let html = `<div class="supporting-clm-item">`;
        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${suppTitle}</h5>`;
        html += `<div class="content">`;
        html += helpers.generateMetadataHtml(suppClm.project_metadata || {}, true);

        // Contenido del CLM de soporte
        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, config.CLM, "CLM", excludeBitacora);
        if (suppContent) {
            html += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px; color: #333;">`;
            html += `<p>${helpers.formatContentForHtml(suppContent)}</p>`;
            html += `</div>`;
        }

        // EVDs del CLM de soporte
        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
            for (const evdUid of suppClm.related_evds) {
                if (allNodes[evdUid]) {
                    html += this.renderEVD(allNodes[evdUid], '', config, excludeBitacora, true);
                }
            }
        }

        html += `</div></div>`;
        return html;
    },

    // Renderiza un CLM completo con sus EVDs y CLMs de soporte
    renderCLM: function (clm, qIndex, cIndex, allNodes, config, excludeBitacora) {
        const clmId = `q${qIndex}_c${cIndex}`;
        const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        let html = `<div id="${clmId}" class="node clm-node">`;
        html += `<h3 class="collapsible">`;
        html += `<span class="node-tag">[[CLM]]</span> - ${clmTitle}`;
        html += `<button class="btn-copy-individual" onclick="copyIndividualCLM('${clmId}')">Copiar</button>`;
        html += `</h3>`;
        html += `<div class="content">`;

        html += helpers.generateMetadataHtml(clm.project_metadata || {});

        // Contenido del CLM
        const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, config.CLM, "CLM", excludeBitacora);
        if (clmContent) {
            html += `<div class="node content-node" style="margin-bottom: 10px;">`;
            html += `<p>${helpers.formatContentForHtml(clmContent)}</p>`;
            html += `</div>`;
        }

        // Supporting CLMs
        if (clm.supporting_clms && clm.supporting_clms.length > 0) {
            html += '<div class="supporting-clms">';
            for (const suppUid of clm.supporting_clms) {
                if (allNodes[suppUid]) {
                    html += this.renderSupportingCLM(allNodes[suppUid], allNodes, config, excludeBitacora);
                }
            }
            html += '</div>';
        }

        // EVDs directos del CLM
        if (clm.related_evds && clm.related_evds.length > 0) {
            for (let k = 0; k < clm.related_evds.length; k++) {
                const evdUid = clm.related_evds[k];
                if (allNodes[evdUid]) {
                    const evdId = `q${qIndex}_c${cIndex}_e${k}`;
                    html += this.renderEVD(allNodes[evdUid], evdId, config, excludeBitacora, false);
                }
            }
        } else if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
            html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
        }

        html += `</div></div>`;
        return html;
    },

    // Renderiza un EVD directo de una pregunta (no bajo un CLM)
    renderDirectEVD: function (evd, qIndex, dIndex, config, excludeBitacora) {
        const evdId = `q${qIndex}_de${dIndex}`;
        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
        const helpers = DiscourseGraphToolkit.HtmlHelpers;

        let html = `<div id="${evdId}" class="node direct-evd-node">`;
        html += `<h3 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h3>`;
        html += `<div class="content">`;
        html += helpers.generateMetadataHtml(evd.project_metadata || {});

        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
        if (detailedContent) {
            html += '<div class="node direct-content-node">';
            html += `<p>${helpers.formatContentForHtml(detailedContent)}</p>`;
            html += '</div>';
        }

        html += `</div></div>`;
        return html;
    },

    // Renderiza una pregunta completa con todos sus hijos
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

        // CLMs
        if (question.related_clms) {
            for (let j = 0; j < question.related_clms.length; j++) {
                const clmUid = question.related_clms[j];
                if (allNodes[clmUid]) {
                    html += this.renderCLM(allNodes[clmUid], qIndex, j, allNodes, config, excludeBitacora);
                }
            }
        }

        // Direct EVDs
        if (question.direct_evds) {
            for (let j = 0; j < question.direct_evds.length; j++) {
                const evdUid = question.direct_evds[j];
                if (allNodes[evdUid]) {
                    html += this.renderDirectEVD(allNodes[evdUid], qIndex, j, config, excludeBitacora);
                }
            }
        }

        html += `</div></div>`;
        return html;
    }
};
