/**
 * DISCOURSE GRAPH TOOLKIT v1.5.56
 * Bundled build: 2026-06-09 22:07:04
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "1.5.56";

// --- EMBEDDED SCRIPT FOR HTML EXPORT (MarkdownCore + htmlEmbeddedScript.js) ---
DiscourseGraphToolkit._HTML_EMBEDDED_SCRIPT = `// ============================================================================
// CORE: Markdown Core
// Funciones standalone de generación de Markdown.
// Se inyecta en el HTML exportado — NO puede depender de DiscourseGraphToolkit.
//
// ⚠️ DUPLICACIÓN INTENCIONAL: extractBlockContent y extractNodeContent replican
// la lógica de ContentProcessor (contentProcessor.js). Si modificas estos
// métodos, asegúrate de replicar el cambio en contentProcessor.js y viceversa.
// ============================================================================

var MarkdownCore = {
    MAX_RECURSION_DEPTH: 20,

    // --- Limpieza de texto ---
    cleanText: function (text) {
        if (!text || typeof text !== 'string') return "";
        return text.replace(/\\s+/g, ' ').trim();
    },

    // --- Extracción de contenido de bloque ---
    extractBlockContent: function (block, indentLevel, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType, formatOptions) {
        var content = '';
        if (!visitedBlocks) visitedBlocks = {};
        if (indentLevel === undefined) indentLevel = 0;
        if (maxDepth === undefined) maxDepth = this.MAX_RECURSION_DEPTH;
        if (nodeType === undefined) nodeType = null;
        if (indentLevel > maxDepth) return content;
        if (!block || typeof block !== 'object') return content;

        var blockUid = block.uid || block[':block/uid'] || '';
        var blockString = block.string || block[':block/string'] || '';

        if (blockUid && visitedBlocks[blockUid]) return content;
        if (blockUid) visitedBlocks[blockUid] = true;

        // Excluir bitácora
        if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) {
            return '';
        }

        var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo', '#Contains'];
        var isStructural = structuralMarkers.indexOf(blockString) !== -1;

        if (skipMetadata && (!blockString || isStructural)) {
            // Skip
        } else {
            if (blockString) {
                if (flatMode) {
                    // En flatMode, primer nivel usa estilo de marcador (excepto EVD)
                    if (indentLevel === 0) {
                        if (nodeType === 'EVD') {
                            // EVD: texto normal (contenido sustantivo extenso)
                            content += blockString + '\\n\\n';
                        } else {
                            // QUE/CLM: cursiva con marcador (metadatos/estructura)
                            content += '*— ' + blockString + ' —*\\n\\n';
                        }
                    } else {
                        content += blockString + '\\n\\n';
                    }
                } else {
                    if (indentLevel === 0) {
                        if (nodeType === 'EVD') {
                            // EVD: texto normal
                            content += blockString + '\\n\\n';
                        } else {
                            // Marcador de primer nivel (cursiva con guiones largos)
                            content += '*— ' + blockString + ' —*\\n\\n';
                        }
                    } else {
                        var indent = '';
                        var indentStr = '  '; // 2 espacios estandar
                        for (var i = 0; i < indentLevel; i++) indent += indentStr;
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
            }
        }

        var children = block.children || block[':block/children'] || [];
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var childContent = this.extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType, formatOptions);
                if (childContent) content += childContent;
            }
        }

        if (blockUid) delete visitedBlocks[blockUid];
        return content;
    },

    // --- Extracción de contenido de nodo ---
    extractNodeContent: function (nodeData, includeContent, nodeType, excludeBitacora, flatMode, formatOptions) {
        var detailedContent = '';
        if (!nodeData) return detailedContent;

        var children = nodeData.children || nodeData[':block/children'] || [];
        if (Array.isArray(children) && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var childString = child.string || child[':block/string'] || '';
                var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo', '#Contains'];
                var isStructuralMetadata = false;
                for (var j = 0; j < structuralMetadata.length; j++) {
                    if (childString.indexOf(structuralMetadata[j]) === 0) {
                        isStructuralMetadata = true;
                        break;
                    }
                }

                if (!isStructuralMetadata) {
                    var childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType, formatOptions);
                    if (childContent) detailedContent += childContent;
                }
            }
        }

        if (!detailedContent) {
            var mainString = nodeData.string || nodeData[':block/string'] || '';
            if (mainString) {
                detailedContent += flatMode ? mainString + '\\n\\n' : '- ' + mainString + '\\n';
            } else {
                var title = nodeData.title || nodeData[':node/title'] || '';
                if (title) {
                    var prefix = '[[' + nodeType + ']] - ';
                    var cleanTitle = title.replace(prefix, '').trim();
                    if (cleanTitle) detailedContent += flatMode ? cleanTitle + '\\n\\n' : '- ' + cleanTitle + '\\n';
                }
            }
        }

        return detailedContent;
    },

    // --- Límite de profundidad para recursión de nodos (seguridad) ---
    MAX_NODE_DEPTH: 10,

    // --- Helper: renderizar metadata de un nodo ---
    renderMetadata: function (metadata, flatMode) {
        var result = '';
        if (!metadata) return result;
        if (metadata.proyecto_asociado || metadata.seccion_tesis) {
            if (flatMode) {
                if (metadata.proyecto_asociado) result += 'Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n\\n';
                if (metadata.seccion_tesis) result += 'Sección Narrativa: ' + metadata.seccion_tesis + '\\n\\n';
            } else {
                result += '**Información del proyecto:**\\n';
                if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n';
                if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\\n';
                result += '\\n';
            }
        }
        return result;
    },

    // --- Recursión genérica para renderizar un nodo CLM o EVD y sus hijos ---
    renderNodeTree: function (nodeUid, allNodes, headingLevel, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, numberingPath) {
        if (!nodeUid || !allNodes[nodeUid]) return '';
        if (headingLevel > this.MAX_NODE_DEPTH + 2) return ''; // +2 porque QUE empieza en nivel 2
        if (visited[nodeUid]) return ''; // Evitar ciclos
        visited[nodeUid] = true;

        var node = allNodes[nodeUid];
        var type = node.type; // 'CLM' o 'EVD'
        var result = '';

        // Generar heading dinámico (###, ####, #####, etc.)
        var hashes = '';
        for (var h = 0; h < headingLevel; h++) hashes += '#';
        
        var title = this.cleanText((node.title || '').replace('[[' + type + ']] - ', ''));
        var displayTitle = title;
        if (!(formatOptions && formatOptions.hideNodeLabels)) {
            displayTitle = '[[' + type + ']] - ' + displayTitle;
        }
        if (formatOptions && formatOptions.useAcademicNumbering && numberingPath && numberingPath.length > 0) {
            displayTitle = numberingPath.join('.') + '. ' + displayTitle;
        }

        result += hashes + ' ' + displayTitle + '\\n\\n';

        // Metadata — SKIP en modo esqueleto
        var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
        if (includeProj) {
            result += this.renderMetadata(node.project_metadata || {}, flatMode);
        }

        // Contenido del nodo — SKIP en modo esqueleto
        if (config[type] && !skeletonMode) {
            var content = this.extractNodeContent(node.data, true, type, excludeBitacora, flatMode, formatOptions);
            if (content) {
                result += content + '\\n';
            } else if (type === 'EVD' && !skeletonMode) {
                result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
            }
        }

        var childCounter = 1;

        // Hijos: CLMs de soporte (recursión)
        var hasSupportingClms = node.supporting_clms && node.supporting_clms.length > 0;
        if (hasSupportingClms) {
            for (var s = 0; s < node.supporting_clms.length; s++) {
                var childNum = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.supporting_clms[s], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNum);
            }
        }

        // Hijos: EVDs relacionados (hojas, pero usan recursión por uniformidad)
        var hasRelatedEvds = node.related_evds && node.related_evds.length > 0;
        if (hasRelatedEvds) {
            for (var e = 0; e < node.related_evds.length; e++) {
                var childNumE = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.related_evds[e], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumE);
            }
        }

        // Mensaje — SKIP en modo esqueleto
        if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds && !skeletonMode) {
            result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\\n\\n';
        }

        // Hijos: Nodos contenidos (para GRI vía #Contains)
        if (node.contained_nodes && node.contained_nodes.length > 0) {
            for (var cn = 0; cn < node.contained_nodes.length; cn++) {
                var childNumCN = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.contained_nodes[cn], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumCN);
            }
        }

        // Hijos: CLMs relacionados (para QUE)
        var hasRelatedClms = node.related_clms && node.related_clms.length > 0;
        if (hasRelatedClms) {
            for (var c = 0; c < node.related_clms.length; c++) {
                var childNumC = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.related_clms[c], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumC);
            }
        }

        // Hijos: EVDs directos (para QUE)
        var hasDirectEvds = node.direct_evds && node.direct_evds.length > 0;
        if (hasDirectEvds) {
            for (var d = 0; d < node.direct_evds.length; d++) {
                var childNumD = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.direct_evds[d], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumD);
            }
        }

        // Mensaje — SKIP en modo esqueleto
        if (type === 'QUE' && !hasRelatedClms && !hasDirectEvds && !skeletonMode) {
            result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
        }

        visited[nodeUid] = false; // Liberar para ramas paralelas
        return result;
    },

    // --- Generación de Markdown completo ---
    // rootNodes: array de nodos raíz (GRI y/o QUE)
    generateMarkdown: function (rootNodes, allNodes, config, excludeBitacora, flatMode, skeletonMode, formatOptions) {
        var self = this;

        // Compatibilidad: si config es booleano, convertir a objeto
        if (typeof config === 'boolean') {
            config = { GRI: config, QUE: config, CLM: config, EVD: config };
        }
        if (!config) config = { GRI: true, QUE: true, CLM: true, EVD: true };

        var result = '';
        // En modo esqueleto, omitir el título principal
        if (!skeletonMode) {
            result = '# Estructura de Investigación\\n\\n';
        }

        var lastNamespace = null;
        var rootCounter = 1;

        for (var q = 0; q < rootNodes.length; q++) {
            var rootNode = rootNodes[q];
            
            // --- Lógica de Agrupamiento por Namespace ---
            if (formatOptions && formatOptions.groupNamespaces && rootNode._project) {
                var projectParts = rootNode._project.split('/');
                var lastParts = lastNamespace ? lastNamespace.split('/') : [];
                
                var diffIndex = 0;
                while (diffIndex < projectParts.length && diffIndex < lastParts.length && projectParts[diffIndex] === lastParts[diffIndex]) {
                    diffIndex++;
                }
                
                // Empezar a imprimir desde la primera diferencia, pero SIEMPRE omitir el índice 0 (proyecto raíz)
                var startIndex = Math.max(diffIndex, 1);
                
                for (var i = startIndex; i < projectParts.length; i++) {
                    var currentPart = projectParts[i];
                    if (currentPart) {
                        var capitalizedPart = currentPart.charAt(0).toUpperCase() + currentPart.slice(1);
                        result += '# ' + capitalizedPart + '\\n\\n';
                    }
                }
                
                lastNamespace = rootNode._project;
            }
            // ------------------------------------------

            try {
                var nodeType = rootNode.type || self.getNodeType(rootNode.title);
                var numberingPath = (formatOptions && formatOptions.useAcademicNumbering) ? [rootCounter++] : [];

                if (nodeType === 'QUE') {
                    // Renderizado específico de QUE
                    var qTitle = self.cleanText((rootNode.title || '').replace('[[QUE]] - ', ''));
                    var displayTitleQ = qTitle;
                    if (!(formatOptions && formatOptions.hideNodeLabels)) displayTitleQ = '[[QUE]] - ' + displayTitleQ;
                    if (formatOptions && formatOptions.useAcademicNumbering) displayTitleQ = numberingPath.join('.') + '. ' + displayTitleQ;
                    
                    result += '## ' + displayTitleQ + '\\n\\n';

                    // Metadata — SKIP en modo esqueleto
                    var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
                    if (includeProj) {
                        result += self.renderMetadata(rootNode.project_metadata || {}, flatMode);
                    }

                    // Contenido QUE — SKIP en modo esqueleto
                    if (config.QUE && !skeletonMode) {
                        var queContent = self.extractNodeContent(rootNode.data || rootNode, true, 'QUE', excludeBitacora, flatMode, formatOptions);
                        if (queContent) result += queContent + '\\n';
                    }

                    var hasClms = rootNode.related_clms && rootNode.related_clms.length > 0;
                    var hasDirectEvds = rootNode.direct_evds && rootNode.direct_evds.length > 0;

                    // Mensaje informativo — SKIP en modo esqueleto
                    if (!hasClms && !hasDirectEvds) {
                        if (!skeletonMode) {
                            result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
                        }
                        continue;
                    }

                    var childCounter = 1;
                    
                    // CLMs respondidos (recursión desde nivel 3)
                    if (rootNode.related_clms) {
                        for (var c = 0; c < rootNode.related_clms.length; c++) {
                            var childNumC = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounter++]) : [];
                            result += self.renderNodeTree(rootNode.related_clms[c], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumC);
                        }
                    }

                    // EVDs directos de la pregunta (nivel 3)
                    if (rootNode.direct_evds) {
                        for (var d = 0; d < rootNode.direct_evds.length; d++) {
                            var childNumD = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounter++]) : [];
                            result += self.renderNodeTree(rootNode.direct_evds[d], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumD);
                        }
                    }

                } else if (nodeType === 'GRI') {
                    // Renderizado de GRI como nodo raíz
                    var gTitle = self.cleanText((rootNode.title || '').replace('[[GRI]] - ', ''));
                    var displayTitleG = gTitle;
                    if (!(formatOptions && formatOptions.hideNodeLabels)) displayTitleG = '[[GRI]] - ' + displayTitleG;
                    if (formatOptions && formatOptions.useAcademicNumbering) displayTitleG = numberingPath.join('.') + '. ' + displayTitleG;

                    result += '## ' + displayTitleG + '\\n\\n';

                    // Metadata — SKIP en modo esqueleto
                    var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
                    if (includeProj) {
                        result += self.renderMetadata(rootNode.project_metadata || {}, flatMode);
                    }

                    // Contenido GRI — SKIP en modo esqueleto
                    if (config.GRI && !skeletonMode) {
                        var griContent = self.extractNodeContent(rootNode.data || rootNode, true, 'GRI', excludeBitacora, flatMode, formatOptions);
                        if (griContent) result += griContent + '\\n';
                    }

                    var childCounterG = 1;
                    
                    // Nodos contenidos (recursión desde nivel 3)
                    if (rootNode.contained_nodes && rootNode.contained_nodes.length > 0) {
                        for (var cn = 0; cn < rootNode.contained_nodes.length; cn++) {
                            var childNumCN = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounterG++]) : [];
                            result += self.renderNodeTree(rootNode.contained_nodes[cn], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumCN);
                        }
                    } else if (!skeletonMode) {
                        result += '*No se encontraron nodos contenidos en este grupo.*\\n\\n';
                    }

                } else {
                    // Fallback: renderizar con renderNodeTree genérico
                    result += self.renderNodeTree(rootNode.uid, allNodes, 2, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, numberingPath);
                }

            } catch (err) {
                if (!skeletonMode) {
                    result += '*Error procesando nodo: ' + err + '*\\n\\n';
                }
            }
        }

        return result;
    },

    // --- Generación de Markdown para una sola pregunta ---
    generateQuestionMarkdown: function (question, allNodes, config, excludeBitacora) {
        // Reutilizar generateMarkdown con un array de una sola pregunta
        var result = this.generateMarkdown([question], allNodes, config, excludeBitacora, false);
        // Quitar el header principal ya que es una sola pregunta
        return result.replace('# Estructura de Investigación\\n\\n', '');
    }
};


// ============================================================================
// CORE: HTML Embedded Script
// Este código se inyecta en el HTML exportado por htmlGenerator.js
// ============================================================================

// IMPORTANTE: Este archivo se lee como texto plano durante el build
// y se inserta dentro de tags de script en el HTML final.
// NO uses import/export, este código corre standalone en el navegador.



// --- MarkdownCore se inyecta aquí por build.ps1 ---
// (El build concatena markdownCore.js ANTES de este archivo)


// --- Orden persistido ---
var ORDER_KEY = 'discourseGraph_questionOrder';

function saveOrder() {
    var order = [];
    document.querySelectorAll('.que-node').forEach(function (el) {
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
        order.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) container.appendChild(el);
        });
    } catch (e) { console.warn('Error loading order:', e); }
}

function resetOrder() {
    localStorage.removeItem(ORDER_KEY);
    location.reload();
}

document.addEventListener('DOMContentLoaded', function () {
    // Cargar orden guardado
    loadOrder();

    var coll = document.getElementsByClassName("collapsible");
    for (var i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function (e) {
            if (e.target.tagName === 'BUTTON') return;
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.classList.contains("show-content")) {
                content.classList.remove("show-content");
                content.style.maxHeight = "0";
            } else {
                content.classList.add("show-content");
                content.style.maxHeight = content.scrollHeight + "px";
                setTimeout(function () { if (content.classList.contains("show-content")) content.style.maxHeight = "none"; }, 300);
            }
        });
    }

    document.getElementById('expandAll').addEventListener('click', function () {
        document.querySelectorAll('.content').forEach(function (c) { c.classList.add('show-content'); c.style.maxHeight = "none"; });
        document.querySelectorAll('.collapsible').forEach(function (c) { c.classList.add('active'); });
    });

    document.getElementById('collapseAll').addEventListener('click', function () {
        document.querySelectorAll('.content').forEach(function (c) { c.classList.remove('show-content'); c.style.maxHeight = "0"; });
        document.querySelectorAll('.collapsible').forEach(function (c) { c.classList.remove('active'); });
    });

    document.getElementById('copyAll').addEventListener('click', function () {
        var text = document.body.innerText;
        copyToClipboard(text);
    });

    document.getElementById('exportMarkdown').addEventListener('click', function () {
        exportToMarkdown();
    });
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
        showCopySuccess();
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

function showCopySuccess(msg) {
    var div = document.createElement('div');
    div.className = 'copy-success show';
    div.textContent = msg || 'Copiado!';
    document.body.appendChild(div);
    setTimeout(function () { document.body.removeChild(div); }, 2000);
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
    document.querySelectorAll('.que-node').forEach(function (el) {
        // El ID es "q0", "q1", etc. - extraer el índice
        var idx = parseInt(el.id.replace('q', ''), 10);
        if (!isNaN(idx) && originalQuestions[idx]) {
            domOrder.push(originalQuestions[idx]);
        }
    });
    // Usar el orden del DOM si está disponible, sino el original
    var questions = domOrder.length > 0 ? domOrder : originalQuestions;

    // Usar MarkdownCore (inyectado por build.ps1)
    var result = MarkdownCore.generateMarkdown(questions, allNodes, config, excludeBitacora, false);

    // Descargar archivo con el mismo nombre que el HTML
    var fileName = (document.title || 'mapa_discurso').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
    var blob = new Blob([result], { type: 'text/markdown' });
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

    // Usar MarkdownCore para generar Markdown de una pregunta
    var result = MarkdownCore.generateQuestionMarkdown(question, allNodes, config, excludeBitacora);

    var qTitle = MarkdownCore.cleanText((question.title || '').replace('[[QUE]] - ', ''));
    var fileName = 'QUE_' + qTitle.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
    var blob = new Blob([result], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    showCopySuccess('Markdown exportado: ' + qTitle.substring(0, 20) + '...');
}

function moveQuestionUp(id) {
    var el = document.getElementById(id);
    // Buscar el hermano anterior que sea un que-node
    var prev = el.previousElementSibling;
    while (prev && !prev.classList.contains('que-node')) {
        prev = prev.previousElementSibling;
    }
    if (prev) {
        el.parentNode.insertBefore(el, prev);
        saveOrder();
    }
}
function moveQuestionDown(id) {
    var el = document.getElementById(id);
    // Buscar el hermano siguiente que sea un que-node
    var next = el.nextElementSibling;
    while (next && !next.classList.contains('que-node')) {
        next = next.nextElementSibling;
    }
    if (next) {
        // Insertar después del siguiente que-node
        el.parentNode.insertBefore(el, next.nextSibling);
        saveOrder();
    }
}
`;


// --- MODULE: src/config.js ---
// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

window.DiscourseGraphToolkit = window.DiscourseGraphToolkit || {};
// DiscourseGraphToolkit.VERSION = "1.5.12"; // Managed by build script

// Claves de LocalStorage
DiscourseGraphToolkit.STORAGE = {
    CONFIG: "discourseGraphToolkit_config",
    TEMPLATES: "discourseGraphToolkit_templates",
    PROJECTS: "discourseGraphToolkit_projects",
    DISMISSED_PROJECTS: "discourseGraphToolkit_dismissed_projects",
    HISTORY_NODES: "discourseGraphToolkit_history_nodes",
    HISTORY_EXPORT: "discourseGraphToolkit_history_export",
    QUESTION_ORDER: "discourseGraphToolkit_question_order",
    PANORAMIC_CACHE: "discourseGraphToolkit_panoramic_cache",
    PANORAMIC_EXPANDED: "discourseGraphToolkit_panoramic_expanded",
    GROUP_ORDER: "discourseGraphToolkit_group_order",
    VERIFICATION_CACHE: "discourseGraphToolkit_verificationCache",
    FAVORITES: "discourseGraphToolkit_favorites"
};

// Get current graph name from Roam API or URL
DiscourseGraphToolkit.getGraphName = function () {
    // Method 1: Try Roam API (available in newer versions)
    if (window.roamAlphaAPI?.graph?.name) {
        return window.roamAlphaAPI.graph.name;
    }
    // Method 2: Extract from URL (always works)
    // URL format: https://roamresearch.com/#/app/GRAPH_NAME/...
    const match = window.location.hash.match(/#\/app\/([^\/]+)/);
    return match ? match[1] : 'default';
};

// Generate storage key with graph prefix for isolation
DiscourseGraphToolkit.getStorageKey = function (baseKey) {
    const graphName = this.getGraphName();
    return `${baseKey}_${graphName}`;
};

// Constantes de Roam
DiscourseGraphToolkit.ROAM = {
    PROJECTS_PAGE: "roam/js/discourse-graph/projects",
    CONFIG_PAGE: "roam/js/discourse-graph/config"
};

// Sufijo que identifica páginas contenedoras de nodos discourse
// Las páginas contenedoras siempre terminan con este sufijo
DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX = '/grafoDeDiscurso';

// Configuración de Archivos y Exportación
DiscourseGraphToolkit.FILES = {
    BYTES_PER_MB: 1024 * 1024,
    MAX_SIZE_MB: 10,
    MAX_DEPTH: 10,
    MAX_PANORAMIC_CACHE_NODES: 500
};

// Tipos de Nodos
DiscourseGraphToolkit.TYPES = {
    GRI: { prefix: "GRI", label: "Grupo", color: "#6c5c99" },
    QUE: { prefix: "QUE", label: "Pregunta", color: "#2196F3" },
    CLM: { prefix: "CLM", label: "Afirmación", color: "#4CAF50" },
    EVD: { prefix: "EVD", label: "Evidencia", color: "#FF9800" }
};

// Paleta de Colores Global del Sistema de Diseño (Claude-inspired)
DiscourseGraphToolkit.THEME = {
    colors: {
        primary: '#000000',     // Negro (Primary actions)
        primaryHover: '#2d2c2b',
        secondary: '#f3f1eb',   // Gris cálido (Secondary actions / Backgrounds)
        secondaryHover: '#ebe8e0',
        success: '#377d61',     // Verde oscuro (Completado / Coherente / Validación Ok)
        successHover: '#2d6850',
        warning: '#a87e27',     // Amarillo oscuro (Huérfanos / Faltantes / Diferentes)
        warningHover: '#8a671f',
        danger: '#bb4f43',      // Rojo oscuro (Errores / Eliminar)
        dangerHover: '#9a4137',
        neutral: '#999793',     // Gris texto secundario/muted
        text: '#2d2c2b',        // Texto principal
        border: '#e5e3dc',      // Bordes
        background: '#fbfaf8',  // Blanco cálido para cards/modales
        backgroundApp: '#fbfaf8',// Fondo general
        // Accesorios
        accentPurple: '#6c5c99'  // Para estados especializados
    }
};

// Configuración por defecto
DiscourseGraphToolkit.DEFAULT_CONFIG = {
    defaultProject: "",
    projectFieldName: "Proyecto Asociado"
};

// Pull pattern para exportación robusta (Recursión manual limitada a MAX_DEPTH)
DiscourseGraphToolkit.ROAM_PULL_PATTERN = `[
    :block/uid :node/title :edit/time :create/time :block/string :block/order
    {:block/refs [:block/uid :node/title]}
    {:create/user [:user/display-name :user/uid]}
    {:edit/user [:user/display-name :user/uid]}
    {:block/children [
      :block/uid :block/string :block/order :edit/time :create/time
      {:block/refs [:block/uid :node/title]}
      {:block/children [
        :block/uid :block/string :block/order
        {:block/refs [:block/uid :node/title]}
        {:block/children [
          :block/uid :block/string :block/order
          {:block/refs [:block/uid :node/title]}
          {:block/children [
            :block/uid :block/string :block/order
            {:block/refs [:block/uid :node/title]}
            {:block/children [
               :block/uid :block/string :block/order
               {:block/refs [:block/uid :node/title]}
               {:block/children [
                   :block/uid :block/string :block/order
                   {:block/refs [:block/uid :node/title]}
                   {:block/children [
                       :block/uid :block/string :block/order
                       {:block/refs [:block/uid :node/title]}
                       {:block/children [
                           :block/uid :block/string :block/order
                           {:block/refs [:block/uid :node/title]}
                           {:block/children [
                               :block/uid :block/string :block/order
                               {:block/refs [:block/uid :node/title]}
                           ]}
                       ]}
                   ]}
               ]}
            ]}
          ]}
        ]}
      ]}
    ]}
  ]`;

// Templates por defecto (usando el nombre de campo dinámico en la lógica, aquí es texto)
DiscourseGraphToolkit.DEFAULT_TEMPLATES = {
    "GRI": `Proyecto Asociado:: {PROYECTO}
#Contains
    -`,
    "QUE": `Proyecto Asociado:: {PROYECTO}
#RespondedBy
    -`,
    "CLM": `Proyecto Asociado:: {PROYECTO}
#SupportedBy
    -`,
    "EVD": `Proyecto Asociado:: {PROYECTO}`
};

// ============================================================================
// FavoritesService
// CRUD para perfiles de selección rápida (compartido entre tabs)
// ============================================================================
DiscourseGraphToolkit.FavoritesService = {
    _getStorageKey: function () {
        return DiscourseGraphToolkit.getStorageKey(DiscourseGraphToolkit.STORAGE.FAVORITES);
    },

    // Obtener todos los favoritos de un tipo ('branches' o 'export')
    getAll: function (tabType) {
        try {
            const raw = localStorage.getItem(this._getStorageKey());
            const all = raw ? JSON.parse(raw) : {};
            return all[tabType] || [];
        } catch (e) {
            console.warn('FavoritesService: Error reading favorites', e);
            return [];
        }
    },

    // Guardar la lista completa de un tipo
    _saveAll: function (tabType, list) {
        try {
            const raw = localStorage.getItem(this._getStorageKey());
            const all = raw ? JSON.parse(raw) : {};
            all[tabType] = list;
            localStorage.setItem(this._getStorageKey(), JSON.stringify(all));
            return true;
        } catch (e) {
            console.warn('FavoritesService: Error saving favorites', e);
            return false;
        }
    },

    // Agregar (o sobrescribir) un favorito
    // Si name es null/undefined, se genera automáticamente usando DiscourseGraphToolkit.computeFavoriteName
    // Si ya existe un favorito con ese nombre, se actualiza (sobrescribe)
    add: function (tabType, name, data) {
        // Si no se pasó nombre, generarlo automáticamente desde los datos
        if (!name && data && data.selectedProjects) {
            name = DiscourseGraphToolkit.computeFavoriteName(data.selectedProjects);
        }
        if (!name) name = 'favorito';

        const list = this.getAll(tabType);
        const trimmedName = name.trim().substring(0, 40);

        // Buscar si ya existe un favorito con el mismo nombre (namespace)
        const existingIdx = list.findIndex(f => f.name === trimmedName);
        if (existingIdx !== -1) {
            // Actualizar el existente
            list[existingIdx] = {
                ...list[existingIdx],
                timestamp: Date.now(),
                data: data
            };
            this._saveAll(tabType, list);
            return list;
        }

        // No existe, crear nuevo
        const id = 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        list.push({
            id: id,
            name: trimmedName,
            timestamp: Date.now(),
            data: data
        });
        this._saveAll(tabType, list);
        return list;
    },

    // Actualizar un favorito existente (por id)
    update: function (tabType, id, updates) {
        const list = this.getAll(tabType);
        const idx = list.findIndex(f => f.id === id);
        if (idx === -1) return list;
        if (updates.name) updates.name = updates.name.trim().substring(0, 40);
        if (updates.timestamp === undefined) updates.timestamp = Date.now();
        list[idx] = { ...list[idx], ...updates };
        this._saveAll(tabType, list);
        return list;
    },

    // Eliminar un favorito por id
    remove: function (tabType, id) {
        const list = this.getAll(tabType).filter(f => f.id !== id);
        this._saveAll(tabType, list);
        return list;
    },

    // Renombrar un favorito
    rename: function (tabType, id, newName) {
        return this.update(tabType, id, { name: newName });
    }
};

// ============================================================================
// Función auxiliar para generar nombre de favorito basado en namespace
// ============================================================================

/**
 * Genera un nombre automático para un favorito basado en el namespace
 * (ruta de proyecto común) de los proyectos seleccionados.
 * Filtra proyectos intermedios (que son prefijo de otro proyecto más específico),
 * dejando solo los proyectos "hoja" para calcular el namespace.
 *
 * @param {Set<string>|Object} selectedProjects - Set de strings (Branches) u objeto {proyecto: bool} (Export)
 * @returns {string} - Nombre generado (namespace común o concatenación)
 */
DiscourseGraphToolkit.computeFavoriteName = function (selectedProjects) {
    // Obtener array de nombres de proyectos seleccionados
    let projects;
    if (selectedProjects instanceof Set) {
        projects = Array.from(selectedProjects).filter(p => p && p !== '(sin proyecto)');
    } else if (Array.isArray(selectedProjects)) {
        // Array: usar los valores directamente (ej: BranchesTab con Array.from(selectedProjects))
        projects = selectedProjects.filter(p => p && p !== '(sin proyecto)');
    } else if (selectedProjects && typeof selectedProjects === 'object') {
        // Objeto { proyecto: bool }: usar las keys con valor true (ej: ExportTab)
        projects = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
    } else {
        return 'favorito';
    }

    if (projects.length === 0) return 'favorito';
    if (projects.length === 1) return projects[0];

    // Filtrar solo proyectos "hoja": aquellos que NO son prefijo de otro proyecto
    // (ej: si hay "Filosofía" y "Filosofía/Ética", "Filosofía" es intermedio y se filtra)
    const leafProjects = projects.filter(p => {
        const prefix = p + '/';
        return !projects.some(other => other !== p && other.startsWith(prefix));
    });

    // Si después de filtrar solo queda 1, usarlo directamente
    if (leafProjects.length === 0) return projects.sort().join('|');
    if (leafProjects.length === 1) return leafProjects[0];

    // Calcular el prefijo de ruta común más largo (ancestro común / namespace)
    const splitPaths = leafProjects.map(p => p.split('/'));
    const minLength = Math.min(...splitPaths.map(p => p.length));

    let commonParts = [];
    for (let i = 0; i < minLength; i++) {
        const segment = splitPaths[0][i];
        if (splitPaths.every(path => path[i] === segment)) {
            commonParts.push(segment);
        } else {
            break;
        }
    }

    // Si hay ancestro común (namespace), usarlo; de lo contrario concatenar ordenado
    if (commonParts.length > 0) {
        return commonParts.join('/');
    } else {
        return leafProjects.sort().join('|');
    }
};


// --- MODULE: src/utils/helpers.js ---
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




// --- MODULE: src/utils/toast.js ---
// ============================================================================
// UTILS: Toast Notifications
// ============================================================================

DiscourseGraphToolkit.showToast = function (message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;
        `;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);
    setTimeout(() => {
        toastContainer.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toastContainer), 300);
    }, 3000);
};




// --- MODULE: src/utils/projectTreeUtils.js ---
// ============================================================================
// UTILS: Project Tree Utilities
// Funciones para construir árbol jerárquico de proyectos por namespace
// ============================================================================

/**
 * Construye un árbol jerárquico a partir de resultados de verificación
 * @param {Array} results - Array de bulkVerificationResults
 * @returns {Object} - Árbol jerárquico { projectName: { project, questions, children, aggregatedStatus, issueCount } }
 */
DiscourseGraphToolkit.buildProjectTree = function (results) {
    const tree = {};
    const noProject = { project: null, questions: [], children: {}, aggregatedStatus: 'missing', issueCount: 0 };

    for (const result of results) {
        const project = result.coherence.rootProject;

        if (!project) {
            noProject.questions.push(result);
            continue;
        }

        // Dividir namespace en partes
        const parts = project.split('/');
        let currentLevel = tree;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? currentPath + '/' + part : part;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    project: currentPath,
                    questions: [],
                    children: {},
                    aggregatedStatus: 'coherent',
                    issueCount: 0
                };
            }

            // Si es el último nivel, agregar la pregunta aquí
            if (i === parts.length - 1) {
                currentLevel[part].questions.push(result);
            }

            currentLevel = currentLevel[part].children;
        }
    }

    // Agregar nodo para preguntas sin proyecto
    if (noProject.questions.length > 0) {
        tree['(sin proyecto)'] = noProject;
    }

    // Calcular estados agregados recursivamente
    this._calculateAggregatedStatus(tree);

    return tree;
};

/**
 * Calcula el estado agregado y conteo de issues para cada nodo del árbol
 * @param {Object} tree - Nodo del árbol o árbol completo
 */
DiscourseGraphToolkit._calculateAggregatedStatus = function (tree) {
    const statusPriority = { 'missing': 4, 'different': 3, 'specialized': 2, 'coherent': 1 };

    for (const key of Object.keys(tree)) {
        const node = tree[key];

        // Primero calcular hijos recursivamente
        if (Object.keys(node.children).length > 0) {
            this._calculateAggregatedStatus(node.children);
        }

        // Recopilar todos los estados (propios + hijos)
        let worstStatus = 'coherent';
        let issueCount = 0;

        // Estados de preguntas propias
        for (const q of node.questions) {
            if (statusPriority[q.status] > statusPriority[worstStatus]) {
                worstStatus = q.status;
            }
            if (q.status === 'different' || q.status === 'missing') {
                issueCount++;
            }
        }

        // Estados de hijos
        for (const childKey of Object.keys(node.children)) {
            const child = node.children[childKey];
            if (statusPriority[child.aggregatedStatus] > statusPriority[worstStatus]) {
                worstStatus = child.aggregatedStatus;
            }
            issueCount += child.issueCount;
        }

        node.aggregatedStatus = worstStatus;
        node.issueCount = issueCount;
    }
};

/**
 * Cuenta el total de preguntas en un nodo (propias + descendientes)
 * @param {Object} node - Nodo del árbol
 * @returns {number}
 */
DiscourseGraphToolkit.countTreeQuestions = function (node) {
    let count = node.questions.length;
    for (const childKey of Object.keys(node.children)) {
        count += this.countTreeQuestions(node.children[childKey]);
    }
    return count;
};

/**
 * Obtiene todas las preguntas de un nodo (propias + descendientes) como array plano
 * @param {Object} node - Nodo del árbol
 * @returns {Array}
 */
DiscourseGraphToolkit.getTreeQuestions = function (node) {
    let questions = [...node.questions];
    for (const childKey of Object.keys(node.children)) {
        questions = questions.concat(this.getTreeQuestions(node.children[childKey]));
    }
    return questions;
};

/**
 * Construye un árbol jerárquico simple a partir de nombres de proyectos
 * @param {Array<string>} projectNames - Array de nombres de proyectos
 * @returns {Object} - Árbol jerárquico { key: { project, children, isLeaf } }
 */
DiscourseGraphToolkit.buildSimpleProjectTree = function (projectNames) {
    const tree = {};

    for (const project of projectNames) {
        const parts = project.split('/');
        let currentLevel = tree;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? currentPath + '/' + part : part;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    project: currentPath,
                    children: {},
                    isLeaf: false
                };
            }

            // Marcar como hoja si es el último nivel
            if (i === parts.length - 1) {
                currentLevel[part].isLeaf = true;
            }

            currentLevel = currentLevel[part].children;
        }
    }

    return tree;
};

/**
 * Obtiene todos los proyectos descendientes de un nodo (incluyendo el propio)
 * @param {Object} node - Nodo del árbol
 * @returns {Array<string>} - Array de nombres de proyectos
 */
DiscourseGraphToolkit.getAllDescendantProjects = function (node) {
    let projects = [];
    if (node.isLeaf) {
        projects.push(node.project);
    }
    for (const childKey of Object.keys(node.children)) {
        projects = projects.concat(this.getAllDescendantProjects(node.children[childKey]));
    }
    return projects;
};

/**
 * Cuenta cuántos proyectos hoja hay en un nodo
 * @param {Object} node - Nodo del árbol
 * @returns {number}
 */
DiscourseGraphToolkit.countLeafProjects = function (node) {
    let count = node.isLeaf ? 1 : 0;
    for (const childKey of Object.keys(node.children)) {
        count += this.countLeafProjects(node.children[childKey]);
    }
    return count;
};



// --- MODULE: src/state.js ---
// ============================================================================
// GESTIÓN DE ALMACENAMIENTO (STORAGE)
// ============================================================================

// --- Configuración General ---
DiscourseGraphToolkit.getConfig = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.CONFIG));
    if (stored) {
        try {
            return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch (e) { console.error("Error parsing config", e); }
    }
    return { ...this.DEFAULT_CONFIG };
};

DiscourseGraphToolkit.saveConfig = function (config) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.CONFIG), JSON.stringify(config));
};

// --- Templates ---
DiscourseGraphToolkit.getTemplates = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.TEMPLATES));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.warn("Error parsing templates", e); }
    }
    return { ...this.DEFAULT_TEMPLATES };
};

DiscourseGraphToolkit.saveTemplates = function (templates) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.TEMPLATES), JSON.stringify(templates));
};

// --- Persistencia en Roam (Config + Templates) ---
DiscourseGraphToolkit.saveConfigToRoam = async function (config, templates) {
    try {
        const escapedTitle = this.escapeDatalogString(this.ROAM.CONFIG_PAGE);
        let pageUid = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${escapedTitle}"] [?page :block/uid ?uid]]`);
        if (!pageUid || pageUid.length === 0) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.CONFIG_PAGE, uid: pageUid } });
        } else {
            pageUid = pageUid[0][0];
        }

        // Guardar como un bloque JSON
        const data = JSON.stringify({ config, templates });

        // Limpiar hijos anteriores
        const escapedPageUid = this.escapeDatalogString(pageUid);
        const children = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :block/uid "${escapedPageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid]]`);
        for (let child of children) {
            await window.roamAlphaAPI.data.block.delete({ block: { uid: child[0] } });
        }

        await window.roamAlphaAPI.data.block.create({
            location: { "parent-uid": pageUid, order: 0 },
            block: { string: data }
        });
        console.log("Configuración guardada en Roam.");
        return true;
    } catch (e) {
        console.error("Error guardando config en Roam:", e);
        return false;
    }
};

DiscourseGraphToolkit.loadConfigFromRoam = async function () {
    try {
        const escapedTitle = this.escapeDatalogString(this.ROAM.CONFIG_PAGE);
        const results = await window.roamAlphaAPI.data.async.q(`[:find ?string :where [?page :node/title "${escapedTitle}"] [?child :block/parents ?page] [?child :block/string ?string]]`);
        if (results && results.length > 0) {
            const data = JSON.parse(results[0][0]);
            if (data.config) this.saveConfig(data.config);
            if (data.templates) this.saveTemplates(data.templates);
            return data;
        }
    } catch (e) {
        console.error("Error cargando config de Roam:", e);
    }
    return null;
};

// --- Proyectos (Gestión Robusta con Sincronización) ---
DiscourseGraphToolkit.getProjects = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.PROJECTS));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing projects", e); }
    }
    return [];
};

DiscourseGraphToolkit.saveProjects = function (projects) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.PROJECTS), JSON.stringify(projects));
};

// --- Proyectos Excluidos (Dismissed) ---
DiscourseGraphToolkit.getDismissedProjects = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.DISMISSED_PROJECTS));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing dismissed projects", e); }
    }
    return [];
};

DiscourseGraphToolkit.saveDismissedProjects = function (dismissed) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.DISMISSED_PROJECTS), JSON.stringify(dismissed));
};

DiscourseGraphToolkit.addToDismissedProjects = function (projectNames) {
    const current = this.getDismissedProjects();
    const merged = [...new Set([...current, ...projectNames])].sort();
    this.saveDismissedProjects(merged);
};

DiscourseGraphToolkit.removeFromDismissedProjects = function (projectName) {
    const current = this.getDismissedProjects();
    const updated = current.filter(p => p !== projectName);
    this.saveDismissedProjects(updated);
};

DiscourseGraphToolkit.clearDismissedProjects = function () {
    this.saveDismissedProjects([]);
};

// --- Historial de Nodos ---
DiscourseGraphToolkit.getNodeHistory = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.HISTORY_NODES));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing node history", e); }
    }
    return [];
};

DiscourseGraphToolkit.addToNodeHistory = function (type, title, project) {
    let history = this.getNodeHistory();
    history.unshift({
        type, title, project,
        timestamp: new Date().toISOString(),
        pageTitle: `[[${type}]] - ${title}`
    });
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(this.getStorageKey(this.STORAGE.HISTORY_NODES), JSON.stringify(history));
};

// --- Backup & Restore Config ---
DiscourseGraphToolkit.exportConfig = function () {
    const config = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        config: this.getConfig(),
        templates: this.getTemplates(),
        projects: this.getProjects()
    };
    this.downloadJSON(config, `discourse-toolkit-config-${new Date().toISOString().split('T')[0]}.json`);
};

DiscourseGraphToolkit.importConfig = function (fileContent) {
    try {
        const data = JSON.parse(fileContent);
        if (data.config) this.saveConfig(data.config);
        if (data.templates) this.saveTemplates(data.templates);
        if (data.projects) {
            this.saveProjects(data.projects);
            this.syncProjectsToRoam(data.projects);
        }
        return true;
    } catch (e) {
        console.error("Error importing config:", e);
        return false;
    }
};

// --- Migration to Graph-Specific Storage ---
DiscourseGraphToolkit.migrateStorageToGraphSpecific = function () {
    const migrationKey = `discourseGraphToolkit_migrated_${this.getGraphName()}`;
    if (localStorage.getItem(migrationKey)) return; // Already migrated

    // Migrate each storage type from old global key to new graph-specific key
    Object.values(this.STORAGE).forEach(oldKey => {
        const data = localStorage.getItem(oldKey);
        if (data) {
            const newKey = this.getStorageKey(oldKey);
            // Only migrate if new key doesn't exist (don't overwrite)
            if (!localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, data);
                console.log(`[DiscourseGraphToolkit] Migrated ${oldKey} → ${newKey}`);
            }
        }
    });

    localStorage.setItem(migrationKey, 'true');
    console.log(`[DiscourseGraphToolkit] Storage migration complete for graph: ${this.getGraphName()}`);
};

// --- Cache de Verificación de Ramas ---
DiscourseGraphToolkit.getVerificationCache = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE));
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) { console.warn("Error parsing verification cache", e); }
    }
    return null;
};

DiscourseGraphToolkit.saveVerificationCache = function (results, status) {
    const data = {
        results,
        status,
        timestamp: Date.now()
    };
    localStorage.setItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE), JSON.stringify(data));
};

DiscourseGraphToolkit.clearVerificationCache = function () {
    localStorage.removeItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE));
};

// --- Persistencia del Orden de Preguntas ---
DiscourseGraphToolkit.saveQuestionOrder = function (projectKey, order) {
    if (!projectKey) return; // No guardar si no hay proyecto
    const allOrders = this.loadAllQuestionOrders();
    allOrders[projectKey] = order.map(q => typeof q === 'string' ? q : q.uid); // Acepta objetos o strings
    localStorage.setItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER),
        JSON.stringify(allOrders)
    );
};

DiscourseGraphToolkit.loadAllQuestionOrders = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER)
    );
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing question orders", e); }
    }
    return {};
};

DiscourseGraphToolkit.loadQuestionOrder = function (projectKey) {
    if (!projectKey) return null;
    const allOrders = this.loadAllQuestionOrders();
    return allOrders[projectKey] || null;
};

// --- Persistencia del Orden de Grupos de Sub-Proyectos ---
DiscourseGraphToolkit.saveGroupOrder = function (projectKey, groupKeys) {
    if (!projectKey) return;
    const allGroupOrders = this.loadAllGroupOrders();
    allGroupOrders[projectKey] = groupKeys;
    localStorage.setItem(
        this.getStorageKey(this.STORAGE.GROUP_ORDER),
        JSON.stringify(allGroupOrders)
    );
};

DiscourseGraphToolkit.loadAllGroupOrders = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.GROUP_ORDER)
    );
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing group orders", e); }
    }
    return {};
};

DiscourseGraphToolkit.loadGroupOrder = function (projectKey) {
    if (!projectKey) return null;
    const allGroupOrders = this.loadAllGroupOrders();
    return allGroupOrders[projectKey] || null;
};

// --- Cache de Vista Panorámica ---
DiscourseGraphToolkit.savePanoramicCache = function (panoramicData) {
    // Limitar tamaño del cache para evitar exceder localStorage
    const maxNodes = this.FILES.MAX_PANORAMIC_CACHE_NODES || 500;
    const nodeEntries = Object.entries(panoramicData.allNodes);
    const limitedNodes = nodeEntries.length > maxNodes
        ? Object.fromEntries(nodeEntries.slice(0, maxNodes))
        : panoramicData.allNodes;

    // Crear copia limpia sin referencias circulares (node.data = node)
    const cleanData = {
        questions: panoramicData.questions.map(({ data, ...q }) => q),
        allNodes: Object.fromEntries(
            Object.entries(limitedNodes).map(([uid, node]) => {
                const { data, ...clean } = node;
                return [uid, clean];
            })
        )
    };

    const cachePayload = { panoramicData: cleanData, timestamp: Date.now() };
    try {
        localStorage.setItem(
            this.getStorageKey(this.STORAGE.PANORAMIC_CACHE),
            JSON.stringify(cachePayload)
        );
    } catch (e) {
        console.warn("Panoramic cache save failed:", e);
    }
};

DiscourseGraphToolkit.loadPanoramicCache = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_CACHE)
    );
    if (!stored) return null;
    try {
        const cached = JSON.parse(stored);
        // Restaurar node.data = node para compatibilidad con exportación
        if (cached.panoramicData?.allNodes) {
            for (const node of Object.values(cached.panoramicData.allNodes)) {
                node.data = node;
            }
        }
        return cached;
    } catch (e) {
        console.warn("Error parsing panoramic cache, clearing corrupted data:", e);
        localStorage.removeItem(this.getStorageKey(this.STORAGE.PANORAMIC_CACHE));
        return null;
    }
};

DiscourseGraphToolkit.clearPanoramicCache = function () {
    localStorage.removeItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_CACHE)
    );
};

// --- Cache de Vista Panorámica (Estado Expandido) ---
DiscourseGraphToolkit.savePanoramicExpandedQuestions = function (expandedQuestions) {
    try {
        localStorage.setItem(
            this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED),
            JSON.stringify(expandedQuestions)
        );
    } catch (e) {
        console.warn("Panoramic expanded cache save failed:", e);
    }
};

DiscourseGraphToolkit.loadPanoramicExpandedQuestions = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED)
    );
    if (!stored) return {};
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.warn("Error parsing panoramic expanded cache, clearing corrupted data:", e);
        localStorage.removeItem(this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED));
        return {};
    }
};


// --- MODULE: src/api/roamProjects.js ---
// ============================================================================
// API: Roam Projects Management
// ============================================================================

/**
 * Verifica si un bloque contiene el patrón de proyecto escapado con backticks.
 * Detecta tanto backticks simples como triples (bloques de código).
 * @param {string} blockString - Contenido del bloque
 * @param {string} fieldPattern - Patrón del campo (e.g., "Proyecto Asociado::")
 * @returns {boolean} true si está escapado y debe ignorarse
 */
DiscourseGraphToolkit.isEscapedProjectField = function (blockString, fieldPattern) {
    // Nota: Usamos concatenación '`' + '``' en lugar del literal para evitar
    // romper el bloque de código cuando el plugin se carga en Roam
    return blockString.includes('`' + fieldPattern) || blockString.includes('`' + '``');
};

DiscourseGraphToolkit.findProjectsPage = async function () {
    const escapedTitle = this.escapeDatalogString(this.ROAM.PROJECTS_PAGE);
    const results = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${escapedTitle}"] [?page :block/uid ?uid]]`);
    return (results && results.length > 0) ? results[0][0] : null;
};

DiscourseGraphToolkit.loadProjectsFromRoam = async function () {
    try {
        const pageUid = await this.findProjectsPage();
        if (!pageUid) return [];
        const escapedPageUid = this.escapeDatalogString(pageUid);
        const query = `[:find ?string :where [?page :block/uid "${escapedPageUid}"] [?child :block/parents ?page] [?child :block/string ?string] [?child :block/order ?order] :order (asc ?order)]`;
        const results = await window.roamAlphaAPI.data.async.q(query);
        return results.map(r => r[0].trim()).filter(p => p !== '');
    } catch (e) {
        console.error("Error loading projects from Roam:", e);
        return []; // Fallback seguro: retornar array vacío
    }
};

DiscourseGraphToolkit.syncProjectsToRoam = async function (projects) {
    try {
        let pageUid = await this.findProjectsPage();
        if (!pageUid) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.PROJECTS_PAGE, uid: pageUid } });
        }

        const escapedPageUid = this.escapeDatalogString(pageUid);
        const existingQuery = `[:find ?uid ?string :where [?page :block/uid "${escapedPageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid] [?child :block/string ?string]]`;
        const existingResults = await window.roamAlphaAPI.data.async.q(existingQuery);
        const existingBlocks = new Map(existingResults.map(r => [r[1].trim(), r[0]]));

        // Eliminar obsoletos
        for (const [blockText, blockUid] of existingBlocks.entries()) {
            if (!projects.includes(blockText)) await window.roamAlphaAPI.data.block.delete({ block: { uid: blockUid } });
        }

        // Agregar nuevos
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            if (!existingBlocks.has(project)) {
                await window.roamAlphaAPI.data.block.create({ location: { 'parent-uid': pageUid, order: i }, block: { string: project } });
            }
        }
        return { success: true };
    } catch (e) {
        console.error("Error syncing projects:", e);
        return { success: false, error: e.message };
    }
};

DiscourseGraphToolkit.initializeProjectsSync = async function (retry = 0) {
    if (!window.roamAlphaAPI) return;

    try {
        const local = this.getProjects();
        let roam = await this.loadProjectsFromRoam();

        // RETRY LOGIC: Si Roam devuelve vacío, puede ser por carga lenta. Reintentar.
        if (roam.length === 0 && retry < 5) {
            console.log(`Roam projects empty, retrying sync... (${retry + 1}/5)`);
            await new Promise(r => setTimeout(r, 1000));
            return this.initializeProjectsSync(retry + 1);
        }

        // Si Roam falla (devuelve vacío pero no debería), no sobrescribimos local si local tiene datos
        if (roam.length === 0 && local.length > 0) {
            // Intentar verificar si la página existe
            const pageUid = await this.findProjectsPage();
            if (pageUid) {
                // La página existe pero está vacía, o la query falló. 
                // Asumimos que debemos sincronizar local -> roam
                console.log("Roam projects empty, syncing local to roam.");
                roam = [...local]; // Forzar uso de datos locales para que se sincronicen hacia arriba
            }
        }

        const dismissed = this.getDismissedProjects();
        const merged = [...new Set([...local, ...roam])].filter(p => !dismissed.includes(p)).sort();

        if (merged.length > 0) {
            this.saveProjects(merged);
            await this.syncProjectsToRoam(merged);
            console.log(`Proyectos sincronizados: ${merged.length} (${dismissed.length} ignorados)`);
        }
    } catch (e) {
        console.error("Error initializing projects sync:", e);
        if (retry < 3) {
            await new Promise(r => setTimeout(r, 2000));
            return this.initializeProjectsSync(retry + 1);
        }
        throw e; // Propagar error para que el llamador lo maneje
    }
};

DiscourseGraphToolkit.validateProjectsInGraph = async function (projectNames) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?page :block/children ?block] [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    const inGraph = new Set();
    const regex = PM.getFieldRegex();
    const fieldPattern = PM.getFieldPattern();
    results.forEach(r => {
        const blockString = r[0];

        // Excluir bloques escapados con backticks
        if (this.isEscapedProjectField(blockString, fieldPattern)) {
            return;
        }

        const match = blockString.match(regex);
        if (match) inGraph.add(match[1].trim());
    });

    // Identificar namespaces puros: proyectos que son prefijo de otros pero no se usan solos
    const namespacePrefixes = new Set();
    for (const name of projectNames) {
        const prefix = name + '/';
        for (const other of projectNames) {
            if (other !== name && other.startsWith(prefix)) {
                namespacePrefixes.add(name);
                break;
            }
        }
    }

    const validation = {};
    projectNames.forEach(name => {
        if (namespacePrefixes.has(name) && !inGraph.has(name)) {
            // Es un namespace puro (prefijo de otros) y no se usa directamente en el grafo:
            // no lo marcamos como no encontrado, lo excluimos de la validación
            // (no se agrega al objeto validation)
        } else {
            validation[name] = inGraph.has(name);
        }
    });
    return validation;
};

DiscourseGraphToolkit.discoverProjectsInGraph = async function () {
    const PM = this.ProjectManager;

    // Query para encontrar todos los bloques con la propiedad de proyecto
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?page :block/children ?block] [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);

    const discovered = new Set();
    const regex = PM.getFieldRegex();

    const fieldPattern = PM.getFieldPattern();
    results.forEach(r => {
        const blockString = r[0];

        // Excluir bloques escapados con backticks
        if (this.isEscapedProjectField(blockString, fieldPattern)) {
            return;
        }

        const match = blockString.match(regex);
        if (match && match[1]) {
            discovered.add(match[1].trim());
        }
    });

    return Array.from(discovered).sort();
};


// --- MODULE: src/api/roamSearch.js ---
// ============================================================================
// API: Roam Search - Discourse Pages
// ============================================================================

// --- Lógica de Búsqueda ---
// Match jerárquico: incluye proyecto exacto Y sub-proyectos
// Ej: "tesis/marco" matchea "tesis/marco" y "tesis/marco/posicionamiento"
DiscourseGraphToolkit.findPagesWithProject = async function (projectName) {
    const PM = this.ProjectManager;
    const trimmedProject = projectName.trim();

    const escapedPattern = PM.getEscapedFieldPattern();
    const escapedProject = this.escapeDatalogString(trimmedProject);
    const escapedProjectPrefix = this.escapeDatalogString(trimmedProject + '/');

    // Query optimizada: usa índices de relaciones de Roam (:block/refs)
    const query = `[
            :find ?page-title ?page-uid
            :where
            [?project-page :node/title ?project-title]
            (or 
                [(= ?project-title "${escapedProject}")]
                [(clojure.string/starts-with? ?project-title "${escapedProjectPrefix}")]
            )
            [?block :block/refs ?project-page]
            [?page :block/children ?block]
            [?page :node/title ?page-title]
            [?page :block/uid ?page-uid]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${escapedPattern}")]
        ]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};

DiscourseGraphToolkit.queryDiscoursePages = async function (projectName, selectedTypes) {
    const pages = await this.findPagesWithProject(projectName);
    const prefixes = selectedTypes.map(t => `[[${t}]]`);
    return pages.filter(p => prefixes.some(prefix => p.pageTitle.startsWith(prefix)));
};

/**
 * Reverse-lookup: dado un set de UIDs de nodos hijo (CLM/EVD),
 * encuentra los nodos QUE/GRI padre que los referencian vía block refs.
 * @param {Array<string>} childUids - UIDs de nodos CLM/EVD
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.findParentRootNodes = async function (childUids) {
    if (!childUids || childUids.length === 0) return [];

    const query = `[:find ?page-title ?page-uid
                    :in $ [?ref-uid ...]
                    :where
                    [?ref-page :block/uid ?ref-uid]
                    [?block :block/refs ?ref-page]
                    [?block :block/page ?page]
                    [?page :node/title ?page-title]
                    [?page :block/uid ?page-uid]
                    (or
                      [(clojure.string/starts-with? ?page-title "[[QUE]]")]
                      [(clojure.string/starts-with? ?page-title "[[GRI]]")])]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, childUids);
        return Array.from(new Map(results.map(r => [r[1], { pageTitle: r[0], pageUid: r[1] }])).values());
    } catch (e) {
        console.warn("Error finding parent root nodes:", e);
        return [];
    }
};

/**
 * Obtiene todas las preguntas (QUE) del grafo
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.getAllQuestions = async function () {
    const query = `[:find ?title ?uid 
                   :where 
                   [?page :node/title ?title] 
                   [?page :block/uid ?uid]
                   [(clojure.string/starts-with? ?title "[[QUE]]")]]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results
        .map(r => ({ pageTitle: r[0], pageUid: r[1] }))
        .sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
};

/**
 * Obtiene todos los nodos raíz (GRI y QUE) del grafo
 * GRI y QUE son intercambiables como nodos de entrada al grafo
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.getAllRootNodes = async function () {
    const query = `[:find ?title ?uid 
                   :where 
                   [?page :node/title ?title] 
                   [?page :block/uid ?uid]
                   (or
                     [(clojure.string/starts-with? ?title "[[GRI]]")]
                     [(clojure.string/starts-with? ?title "[[QUE]]")])]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results
        .map(r => ({ pageTitle: r[0], pageUid: r[1] }))
        .sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
};


// --- MODULE: src/api/roamBranchVerification.js ---
// ============================================================================
// API: Roam Branch Verification
// ============================================================================

/**
 * Obtiene todos los nodos (CLM, EVD) descendientes de una pregunta RECURSIVAMENTE
 * Sigue la cadena completa: QUE -> CLM -> EVD, CLM -> CLM -> EVD, etc.
 * @param {string} questionUid - UID de la página de la pregunta
 * @returns {Promise<Array<{uid: string, title: string, type: string, parentUid: string}>>}
 */
DiscourseGraphToolkit.getBranchNodes = async function (questionUid) {
    try {
        const allNodes = new Map(); // uid -> {uid, title, type, parentUid}
        const visited = new Set();
        const enqueued = new Set(); // O(1) dedup for pending queue
        // Cola de procesamiento: {uid, parentUid}
        const toProcess = [{ uid: questionUid, parentUid: null }];
        enqueued.add(questionUid);

        // Procesar en rondas por lotes para reducir llamadas API
        while (toProcess.length > 0) {
            // Extraer todo el lote pendiente de una vez
            const batch = toProcess.splice(0, toProcess.length);
            // Filtrar ya visitados
            const pendingBatch = batch.filter(item => !visited.has(item.uid));
            if (pendingBatch.length === 0) continue;

            // Marcar como visitados
            pendingBatch.forEach(item => visited.add(item.uid));

            // Construir EIDs para pull_many
            const eids = pendingBatch.map(item => [':block/uid', item.uid]);

            // Obtener datos de todos los nodos del lote en una sola llamada
            const rawResults = await window.roamAlphaAPI.data.async.pull_many(
                this.ROAM_PULL_PATTERN,
                eids
            );

            if (!rawResults) continue;

            // Procesar cada resultado del lote
            for (let i = 0; i < rawResults.length; i++) {
                const rawData = rawResults[i];
                if (!rawData) continue;

                const currentUid = pendingBatch[i].uid;
                const currentParentUid = pendingBatch[i].parentUid;

                // Transformar a formato usable
                const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
                if (!nodeData) continue;

                const nodeType = this.getNodeType(nodeData.title);

                // Si es CLM, EVD o GRI, agregarlo a la lista de nodos encontrados
                if (nodeType === 'CLM' || nodeType === 'EVD' || nodeType === 'GRI') {
                    allNodes.set(currentUid, {
                        uid: currentUid,
                        title: nodeData.title,
                        type: nodeType,
                        parentUid: currentParentUid || questionUid // Si no tiene padre, es hijo directo del QUE
                    });
                }

                // Buscar referencias en el contenido del nodo
                const referencedUids = this._extractAllReferencesFromNode(nodeData);

                // Agregar las referencias no visitadas a la cola de procesamiento
                // El padre de estas referencias es el nodo actual
                for (const refUid of referencedUids) {
                    if (!visited.has(refUid) && !enqueued.has(refUid)) {
                        enqueued.add(refUid);
                        toProcess.push({ uid: refUid, parentUid: currentUid });
                    }
                }
            }
        }

        return Array.from(allNodes.values());

    } catch (e) {
        console.error("Error getting branch nodes:", e);
        return [];
    }
};

/**
 * Helper: Extrae las referencias jerárquicas de nodos discourse del contenido de un nodo
 * Busca en #RespondedBy, #SupportedBy, #Contains (ignora #RelatedTo)
 */
DiscourseGraphToolkit._extractAllReferencesFromNode = function (nodeData) {
    const references = new Set();

    if (!nodeData || !nodeData.children) return references;

    const self = this;

    const processBlock = (block) => {
        if (!block) return;

        const str = block.string || "";

        // Si es un bloque de relación, extraer referencias (omitimos #RelatedTo por ser relacional/horizontal, no jerárquico)
        if (str.includes("#RespondedBy") || str.includes("#SupportedBy") || str.includes("#Contains")) {
            
            // Función recursiva para extraer referencias de forma segura explorando la rama del bloque
            const extractSafe = (nodeBlock) => {
                if (!nodeBlock) return;
                
                const nodeStr = nodeBlock.string || "";
                // Si encontramos un #RelatedTo anidado explícitamente, abortamos la extracción por ese sub-árbol
                if (nodeStr.includes("#RelatedTo")) return;

                // Extraemos cualquier referencia en la línea actual
                self._extractRefsFromBlock(nodeBlock, references);

                // Continuamos procesando los hijos recursivamente sin limitación de profundidad (o hasta toparnos con #RelatedTo)
                if (nodeBlock.children) {
                    for (const c of nodeBlock.children) {
                        extractSafe(c);
                    }
                }
            };

            // Iniciar la extracción segura desde el bloque relación
            extractSafe(block);
        }
    };

    // Procesar todos los hijos del nodo
    for (const child of nodeData.children) {
        processBlock(child);
    }

    return references;
};

/**
 * Helper: Extrae UIDs de referencias de un bloque
 */
DiscourseGraphToolkit._extractRefsFromBlock = function (block, collectedUids) {
    // Refs directas
    if (block.refs) {
        block.refs.forEach(r => {
            if (r.uid) collectedUids.add(r.uid);
        });
    }
    if (block[':block/refs']) {
        block[':block/refs'].forEach(r => {
            if (r[':block/uid']) collectedUids.add(r[':block/uid']);
        });
    }

    // Buscar referencias en el texto [[...]]
    const str = block.string || "";
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = pattern.exec(str)) !== null) {
        const refContent = match[1];
        // Si parece ser un nodo discourse (CLM, EVD, QUE)
        if (refContent.includes('[[CLM]]') || refContent.includes('[[EVD]]') || refContent.includes('[[QUE]]') || refContent.includes('[[GRI]]')) {
            // No podemos obtener el UID desde el texto, pero las refs directas ya lo tienen
        }
    }
};

/**
 * Obtiene el valor del atributo "Proyecto Asociado::" de un nodo
 * @param {string} pageUid - UID de la página
 * @returns {Promise<string|null>} - Nombre del proyecto o null si no existe
 */
DiscourseGraphToolkit.getProjectFromNode = async function (pageUid) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const escapedPageUid = this.escapeDatalogString(pageUid);

    const query = `[:find ?string
                   :where 
                    [?page :block/uid "${escapedPageUid}"]
                    [?page :block/children ?block]
                    [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query);
        if (results && results.length > 0) {
            const blockString = results[0][0];
            const fieldPattern = PM.getFieldPattern();

            // Excluir bloques escapados con backticks
            if (DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                return null;
            }

            // Extraer el valor entre [[ ]]
            const regex = PM.getFieldRegex();
            const match = blockString.match(regex);
            return match ? match[1].trim() : null;
        }
        return null;
    } catch (e) {
        console.error("Error getting project from node:", e);
        return null;
    }
};

/**
 * Verifica si un proyecto es jerárquicamente coherente con el proyecto raíz.
 * Un proyecto es coherente si es exactamente igual o es un sub-namespace (especialización).
 * @param {string} rootProject - Proyecto del nodo raíz
 * @param {string} nodeProject - Proyecto del nodo a verificar
 * @returns {boolean}
 */
DiscourseGraphToolkit.isHierarchicallyCoherent = function (rootProject, nodeProject) {
    if (!rootProject || !nodeProject) return false;

    // Exactamente igual
    if (nodeProject === rootProject) return true;

    // El nodo es sub-namespace del raíz (especialización con /)
    if (nodeProject.startsWith(rootProject + '/')) return true;

    return false;
};

/**
 * Verifica coherencia de proyectos en una rama (verificación jerárquica padre-hijo)
 * Cada nodo debe tener un proyecto igual o más específico que su padre directo.
 * @param {string} rootUid - UID del QUE raíz
 * @param {Array<{uid: string, title: string, type: string, parentUid: string}>} branchNodes - Nodos de la rama
 * @returns {Promise<{rootProject: string|null, coherent: Array, specialized: Array, different: Array, missing: Array}>}
 */
DiscourseGraphToolkit.verifyProjectCoherence = async function (rootUid, branchNodes) {
    const PM = this.ProjectManager;

    // 1. Obtener proyecto del QUE raíz
    const rootProject = await this.getProjectFromNode(rootUid);

    // 2. Obtener proyecto de cada nodo (incluyendo padres)
    const allUids = [...new Set([...branchNodes.map(n => n.uid), ...branchNodes.map(n => n.parentUid)])];
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para obtener todos los bloques de Proyecto Asociado de las páginas
    const query = `[:find ?page-uid ?string
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?page :block/children ?block]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    const coherent = [];    // Proyecto exacto al padre
    const specialized = [];  // Sub-namespace del padre (especialización válida)
    const different = [];    // Menos específico o diferente al padre
    const missing = [];

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, allUids);

        // Crear mapa de UID -> proyecto
        const projectMap = new Map();
        // El QUE raíz tiene su proyecto
        projectMap.set(rootUid, rootProject);

        const regex = PM.getFieldRegex();
        const fieldPattern = PM.getFieldPattern();

        results.forEach(r => {
            const pageUid = r[0];
            const blockString = r[1];

            // Excluir bloques escapados con backticks
            if (DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                return;
            }

            const match = blockString.match(regex);
            if (match) {
                projectMap.set(pageUid, match[1].trim());
            }
        });

        // 3. Clasificar nodos según coherencia con su PADRE directo
        for (const node of branchNodes) {
            const nodeProject = projectMap.get(node.uid);
            const parentProject = projectMap.get(node.parentUid) || rootProject;

            if (!nodeProject) {
                missing.push({ ...node, project: null, parentProject });
            } else if (parentProject && nodeProject === parentProject) {
                // Exactamente igual al padre
                coherent.push({ ...node, project: nodeProject, parentProject });
            } else if (parentProject && nodeProject.startsWith(parentProject + '/')) {
                // Más específico que el padre (especialización válida)
                specialized.push({ ...node, project: nodeProject, parentProject });
            } else if (parentProject && parentProject.startsWith(nodeProject + '/')) {
                // MENOS específico que el padre (generalización - ERROR)
                different.push({ ...node, project: nodeProject, parentProject, reason: 'generalization' });
            } else {
                // Proyecto completamente diferente al padre (error de coherencia)
                // Los nodos bajo #RelatedTo ya están excluidos del recorrido,
                // así que todo nodo aquí es parte jerárquica de la rama.
                different.push({ ...node, project: nodeProject, parentProject, reason: 'cross_project' });
            }
        }

        return { rootProject, coherent, specialized, different, missing };
    } catch (e) {
        console.error("Error verifying project coherence:", e);
        return {
            rootProject,
            coherent: [],
            specialized: [],
            different: [],
            missing: branchNodes.map(n => ({ ...n, project: null }))
        };
    }
};

/**
 * Propaga el proyecto del QUE raíz a todos los nodos de la rama
 * @param {string} rootUid - UID del QUE raíz
 * @param {string} targetProject - Proyecto a propagar
 * @param {Array<{uid: string}>} nodesToUpdate - Nodos a actualizar
 * @returns {Promise<{success: boolean, updated: number, created: number, errors: Array}>}
 */
DiscourseGraphToolkit.propagateProjectToBranch = async function (rootUid, targetProject, nodesToUpdate) {
    const PM = this.ProjectManager;
    const newValue = PM.buildFieldValue(targetProject);
    const escapedPattern = PM.getEscapedFieldPattern();

    let updated = 0;
    let created = 0;
    const errors = [];

    // PRIMERO: Actualizar el nodo raíz (QUE) para que futuras verificaciones muestren el valor correcto
    try {
        const escapedRootUid = this.escapeDatalogString(rootUid);
        const rootQuery = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${escapedRootUid}"]
                           [?page :block/children ?block]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const rootResults = await window.roamAlphaAPI.data.async.q(rootQuery);

        if (rootResults && rootResults.length > 0) {
            const blockUid = rootResults[0][0];
            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newValue }
            });
            updated++;
        } else {
            // Crear bloque en el nodo raíz si no existe
            await window.roamAlphaAPI.data.block.create({
                location: { 'parent-uid': rootUid, order: 0 },
                block: { string: newValue }
            });
            created++;
        }
    } catch (e) {
        console.error(`Error updating root node ${rootUid}:`, e);
        errors.push({ uid: rootUid, error: e.message, isRoot: true });
    }

    // SEGUNDO: Actualizar los nodos hijos (CLM/EVD)
    // Respetamos sub-namespaces existentes (especializaciones)
    const regex = PM.getFieldRegex();
    let skipped = 0;

    for (const node of nodesToUpdate) {
        try {
            // Buscar si ya tiene un bloque con Proyecto Asociado
            const escapedNodeUid = this.escapeDatalogString(node.uid);
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${escapedNodeUid}"]
                           [?page :block/children ?block]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            const results = await window.roamAlphaAPI.data.async.q(query);

            const nodeTargetProject = node.parentProject || targetProject;
            const nodeNewValue = PM.buildFieldValue(nodeTargetProject);

            if (results && results.length > 0) {
                const blockUid = results[0][0];
                const blockString = results[0][1];

                // Extraer el proyecto actual del nodo
                const match = blockString.match(regex);
                const currentProject = match ? match[1].trim() : null;

                // Si ya es coherente (exacto o sub-namespace), respetar la especialización
                if (currentProject && this.isHierarchicallyCoherent(nodeTargetProject, currentProject)) {
                    skipped++;
                    continue;
                }

                // Actualizar solo si es incoherente
                await window.roamAlphaAPI.data.block.update({
                    block: { uid: blockUid, string: nodeNewValue }
                });
                updated++;
            } else {
                // Crear nuevo bloque como primer hijo
                await window.roamAlphaAPI.data.block.create({
                    location: { 'parent-uid': node.uid, order: 0 },
                    block: { string: nodeNewValue }
                });
                created++;
            }
        } catch (e) {
            console.error(`Error updating node ${node.uid}:`, e);
            errors.push({ uid: node.uid, error: e.message });
        }
    }

    return { success: errors.length === 0, updated, created, errors };
};

/**
 * Propaga el proyecto del padre directo a cada nodo (para corregir generalizaciones)
 * Cada nodo recibe el proyecto de su parentProject específico.
 * @param {Array<{uid: string, parentProject: string}>} nodesToFix - Nodos con generalización
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
DiscourseGraphToolkit.propagateFromParents = async function (nodesToFix) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const regex = PM.getFieldRegex();

    let updated = 0;
    const errors = [];

    for (const node of nodesToFix) {
        if (!node.parentProject) continue;

        const newValue = PM.buildFieldValue(node.parentProject);

        try {
            // Buscar si ya tiene un bloque con Proyecto Asociado
            const escapedNodeUid = this.escapeDatalogString(node.uid);
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${escapedNodeUid}"]
                           [?page :block/children ?block]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            const results = await window.roamAlphaAPI.data.async.q(query);

            if (results && results.length > 0) {
                const blockUid = results[0][0];
                await window.roamAlphaAPI.data.block.update({
                    block: { uid: blockUid, string: newValue }
                });
                updated++;
            } else {
                // Crear nuevo bloque como primer hijo
                await window.roamAlphaAPI.data.block.create({
                    location: { 'parent-uid': node.uid, order: 0 },
                    block: { string: newValue }
                });
                updated++;
            }
        } catch (e) {
            console.error(`Error updating node ${node.uid}:`, e);
            errors.push({ uid: node.uid, error: e.message });
        }
    }

    return { success: errors.length === 0, updated, errors };
};

/**
 * Verifica cuáles nodos tienen la propiedad "Proyecto Asociado::" (legacy, mantener compatibilidad)
 * @param {Array<string>} nodeUids - Array de UIDs de páginas a verificar
 * @returns {Promise<{withProject: Array, withoutProject: Array}>}
 */
DiscourseGraphToolkit.verifyProjectAssociation = async function (nodeUids) {
    if (!nodeUids || nodeUids.length === 0) {
        return { withProject: [], withoutProject: [] };
    }

    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para encontrar cuáles páginas tienen un bloque con "Proyecto Asociado::"
    const query = `[:find ?page-uid
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?page :block/children ?block]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, nodeUids);
        const withProjectSet = new Set(results.map(r => r[0]));

        const withProject = nodeUids.filter(uid => withProjectSet.has(uid));
        const withoutProject = nodeUids.filter(uid => !withProjectSet.has(uid));

        return { withProject, withoutProject };
    } catch (e) {
        console.error("Error verifying project association:", e);
        return { withProject: [], withoutProject: nodeUids };
    }
};

/**
 * Encuentra nodos discourse (QUE/CLM/EVD) que son páginas pero no están
 * conectados a ningún proyecto ni tienen relaciones con otros nodos del discourse graph.
 * @returns {Promise<Array<{uid: string, title: string, type: string, hasProject: boolean, refCount: number}>>}
 */
DiscourseGraphToolkit.findOrphanNodes = async function () {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();

    try {
        // 1. Obtener TODAS las páginas QUE/CLM/EVD
        const allNodesQuery = `[:find ?uid ?title
                               :where
                               [?page :node/title ?title]
                               [?page :block/uid ?uid]
                               (or
                                 [(clojure.string/starts-with? ?title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?title "[[EVD]] - ")])]`;

        const allNodes = await window.roamAlphaAPI.data.async.q(allNodesQuery);
        if (!allNodes || allNodes.length === 0) return [];

        // 2. Obtener cuáles tienen Proyecto Asociado
        const allUids = allNodes.map(n => n[0]);
        const projectQuery = `[:find ?page-uid
                              :in $ [?page-uid ...]
                              :where
                              [?page :block/uid ?page-uid]
                              [?page :block/children ?block]
                              [?block :block/string ?string]
                              [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const withProjectResults = await window.roamAlphaAPI.data.async.q(projectQuery, allUids);
        const withProjectSet = new Set(withProjectResults.map(r => r[0]));

        // 3. Contar cuántas referencias tiene cada página (desde otras páginas discourse)
        const refCountQuery = `[:find ?target-uid (count ?source-page)
                               :where
                               [?target :block/uid ?target-uid]
                               [?target :node/title ?target-title]
                               (or
                                 [(clojure.string/starts-with? ?target-title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[EVD]] - ")])
                               [?source-block :block/refs ?target]
                               [?source-block :block/page ?source-page]
                               [?source-page :node/title ?source-title]
                               (or
                                 [(clojure.string/starts-with? ?source-title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[EVD]] - ")])]`;

        const refCounts = await window.roamAlphaAPI.data.async.q(refCountQuery);
        const refCountMap = new Map(refCounts.map(r => [r[0], r[1]]));

        // 4. Filtrar huérfanos: sin proyecto Y sin referencias desde otros nodos discourse
        const orphans = [];
        for (const [uid, title] of allNodes) {
            const hasProject = withProjectSet.has(uid);
            const refCount = refCountMap.get(uid) || 0;

            // Un huérfano es: sin proyecto Y sin referencias entrantes desde otros nodos discourse
            if (!hasProject && refCount === 0) {
                const type = title.startsWith('[[GRI]]') ? 'GRI' :
                    title.startsWith('[[QUE]]') ? 'QUE' :
                        title.startsWith('[[CLM]]') ? 'CLM' : 'EVD';
                orphans.push({
                    uid,
                    title,
                    type,
                    hasProject,
                    refCount
                });
            }
        }

        return orphans;
    } catch (e) {
        console.error("Error finding orphan nodes:", e);
        return [];
    }
};

/**
 * Dado un array de UIDs de QUEs/GRIs, encuentra qué página contenedora
 * (página cuyo título termina en CONTAINER_PAGE_SUFFIX, ej: /grafoDeDiscurso)
 * los referencia como bloque de PRIMER NIVEL (hijo directo de la página).
 *
 * Estrategia Datalog: usar :block/children desde la página contenedora asegura
 * que solo se devuelven bloques de primer nivel (hijos directos), sin necesidad
 * de filtrar padres en JS.
 *
 * @param {Array<string>} queUids - UIDs de las páginas QUE/GRI a buscar
 * @returns {Promise<Map<string, {uid, title, project, containerStatus}>>}
 *   Mapa queUid → info de la página contenedora (primera encontrada por QUE)
 */
DiscourseGraphToolkit.getContainerPagesForNodes = async function (queUids) {
    if (!queUids || queUids.length === 0) return new Map();

    try {
        const containerSuffix = this.CONTAINER_PAGE_SUFFIX; // '/grafoDeDiscurso'
        const escapedContainerSuffix = this.escapeDatalogString(containerSuffix);

        // Query: páginas que terminan en /grafoDeDiscurso cuyo :block/children
        // (hijos directos = bloques de primer nivel) referencian alguno de los QUEs
        const query = `[:find ?container-uid ?container-title ?que-uid
                        :in $ [?que-uid ...]
                        :where
                        [?que-page :block/uid ?que-uid]
                        [?container :node/title ?container-title]
                        [?container :block/uid ?container-uid]
                        [(clojure.string/ends-with? ?container-title "${escapedContainerSuffix}")]
                        [?container :block/children ?block]
                        [?block :block/refs ?que-page]]`;

        const results = await window.roamAlphaAPI.data.async.q(query, queUids);
        if (!results || results.length === 0) return new Map();

        // Tomar la primera coincidencia por QUE (un QUE puede estar en varias páginas)
        const queToContainer = new Map();
        for (const [containerUid, containerTitle, queUid] of results) {
            if (queToContainer.has(queUid)) continue;
            queToContainer.set(queUid, { uid: containerUid, title: containerTitle, project: null });
        }

        // Obtener proyectos de todas las páginas contenedoras en lote
        const containerUids = [...new Set([...queToContainer.values()].map(c => c.uid))];
        if (containerUids.length === 0) return queToContainer;

        const PM = this.ProjectManager;
        const escapedPattern = PM.getEscapedFieldPattern();
        const projectQuery = `[:find ?page-uid ?string
                              :in $ [?page-uid ...]
                              :where
                              [?page :block/uid ?page-uid]
                              [?page :block/children ?block]
                              [?block :block/string ?string]
                              [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const projectResults = await window.roamAlphaAPI.data.async.q(projectQuery, containerUids);
        const containerProjectMap = new Map();
        const regex = PM.getFieldRegex();
        const fieldPattern = PM.getFieldPattern();

        if (projectResults) {
            for (const [pageUid, blockString] of projectResults) {
                if (this.isEscapedProjectField(blockString, fieldPattern)) continue;
                const match = blockString.match(regex);
                if (match) containerProjectMap.set(pageUid, match[1].trim());
            }
        }

        // Enriquecer con el proyecto de cada página contenedora
        for (const [, containerInfo] of queToContainer) {
            containerInfo.project = containerProjectMap.get(containerInfo.uid) || null;
        }

        return queToContainer;
    } catch (e) {
        console.error('Error getting container pages for nodes:', e);
        return new Map();
    }
};

/**
 * Calcula el containerStatus de una QUE dada la info de su página contenedora.
 * @param {string|null} queProject - Proyecto del QUE (rootProject del cohResult)
 * @param {{uid, title, project}|null} containerInfo - Info de la página contenedora
 * @returns {'coherent'|'mismatched'|'no_project'|'no_container'}
 */
DiscourseGraphToolkit.calcContainerStatus = function (queProject, containerInfo) {
    if (!containerInfo) return 'no_container';
    if (!containerInfo.project) return 'no_project';
    if (!queProject) return 'mismatched';
    // El QUE debe tener el mismo proyecto que la página contenedora
    // o ser un sub-namespace más específico
    if (queProject === containerInfo.project ||
        queProject.startsWith(containerInfo.project + '/')) {
        return 'coherent';
    }
    return 'mismatched';
};

/**
 * Corrige la alineación del proyecto en una página específica (ya sea la QUE o el contenedor).
 * Busca si ya existe un bloque de Proyecto Asociado. Si existe, lo actualiza. Si no, lo crea como primer hijo.
 *
 * @param {string} targetUid - UID de la página a modificar (QUE o contenedor)
 * @param {string} newProject - El nuevo proyecto a asignar
 * @returns {Promise<{success: boolean, action: 'updated'|'created'|'none', error?: string}>}
 */
DiscourseGraphToolkit.fixContainerAlignment = async function (targetUid, newProject) {
    if (!targetUid) {
        return { success: false, action: 'none', error: 'No target UID provided' };
    }
    const PM = this.ProjectManager;
    const newValue = PM.buildFieldValue(newProject);
    const escapedPattern = PM.getEscapedFieldPattern();

    try {
        const escapedTargetUid = this.escapeDatalogString(targetUid);
        const query = `[:find ?block-uid ?string
                       :where 
                       [?page :block/uid "${escapedTargetUid}"]
                       [?page :block/children ?block]
                       [?block :block/uid ?block-uid]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const results = await window.roamAlphaAPI.data.async.q(query);

        if (results && results.length > 0) {
            const blockUid = results[0][0];
            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newValue }
            });
            return { success: true, action: 'updated' };
        } else {
            // Crear bloque como primer hijo de la página
            await window.roamAlphaAPI.data.block.create({
                location: { 'parent-uid': targetUid, order: 0 },
                block: { string: newValue }
            });
            return { success: true, action: 'created' };
        }
    } catch (e) {
        console.error(`Error aligning container/QUE project for UID ${targetUid}:`, e);
        return { success: false, action: 'none', error: e.message };
    }
};



// --- MODULE: src/api/roamStructureVerification.js ---
// ============================================================================
// API: Roam Structure Verification
// ============================================================================

/**
 * Verifica la estructura de un nodo individual
 * @param {object} nodeData - Datos del nodo (ya transformados)
 * @param {string} nodeType - Tipo del nodo (QUE, CLM, EVD)
 * @returns {{ valid: boolean, issues: string[] }}
 */
DiscourseGraphToolkit.verifyNodeStructure = function (nodeData, nodeType) {
    const issues = [];

    if (!nodeData || !nodeData.children) {
        return { valid: true, issues: [] };
    }

    const children = nodeData.children || [];

    if (nodeType === 'QUE') {
        // Verificar que QUE use #RespondedBy (no #SupportedBy directamente)
        let hasRespondedBy = false;
        let hasSupportedByDirect = false;

        for (const child of children) {
            const str = child.string || "";
            if (str.includes("#RespondedBy")) {
                hasRespondedBy = true;
            }
            if (str.includes("#SupportedBy")) {
                hasSupportedByDirect = true;
            }
        }

        // Si tiene #SupportedBy pero no #RespondedBy, es un problema
        if (hasSupportedByDirect && !hasRespondedBy) {
            issues.push("Usa #SupportedBy en lugar de #RespondedBy. Las respuestas no se exportarán correctamente.");
        }

        // Si no tiene ninguno de los dos, también es un problema
        if (!hasRespondedBy && !hasSupportedByDirect) {
            // Verificar si tiene CLMs/EVDs como hijos directos sin marcador
            const hasDiscourseRefs = children.some(child => {
                const str = child.string || "";
                return str.includes("[[CLM]]") || str.includes("[[EVD]]");
            });

            if (hasDiscourseRefs) {
                issues.push("Tiene referencias a CLM/EVD pero sin marcador #RespondedBy. Las respuestas podrían no exportarse.");
            }
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
};

/**
 * Verifica la estructura completa de una rama (QUE y sus descendientes)
 * @param {string} questionUid - UID de la pregunta a verificar
 * @returns {Promise<{ structureIssues: Array<{uid, title, type, issues}>, isExportable: boolean }>}
 */
DiscourseGraphToolkit.verifyBranchStructure = async function (questionUid) {
    try {
        const structureIssues = [];

        // 1. Obtener datos del QUE
        const rawData = await window.roamAlphaAPI.data.async.pull(
            this.ROAM_PULL_PATTERN,
            [':block/uid', questionUid]
        );

        if (!rawData) {
            return { structureIssues: [], isExportable: true };
        }

        const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
        if (!nodeData) {
            return { structureIssues: [], isExportable: true };
        }

        // 2. Verificar estructura del QUE
        const queVerification = this.verifyNodeStructure(nodeData, 'QUE');
        if (!queVerification.valid) {
            structureIssues.push({
                uid: questionUid,
                title: nodeData.title,
                type: 'QUE',
                issues: queVerification.issues
            });
        }

        // 3. Determinar si es exportable (si tiene problemas críticos, no lo es)
        const isExportable = structureIssues.length === 0;

        return { structureIssues, isExportable };

    } catch (e) {
        console.error("Error verifying branch structure:", e);
        return { structureIssues: [], isExportable: true };
    }
};

/**
 * Corrige la estructura de un QUE: cambia #SupportedBy a #RespondedBy
 * @param {string} questionUid - UID de la pregunta a corregir
 * @returns {Promise<{ success: boolean, fixed: number }>}
 */
DiscourseGraphToolkit.fixQueStructure = async function (questionUid) {
    try {
        // Buscar bloques hijos que tengan #SupportedBy
        const query = `[:find ?block-uid ?string
                       :where 
                       [?page :block/uid "${questionUid}"]
                       [?block :block/parents ?page]
                       [?block :block/uid ?block-uid]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "#SupportedBy")]]`;

        const results = await window.roamAlphaAPI.data.async.q(query);

        let fixed = 0;
        for (const [blockUid, blockString] of results) {
            // Reemplazar #SupportedBy con #RespondedBy
            const newString = blockString.replace(/#SupportedBy/g, "#RespondedBy");

            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newString }
            });
            fixed++;
        }

        return { success: true, fixed };

    } catch (e) {
        console.error("Error fixing QUE structure:", e);
        return { success: false, fixed: 0 };
    }
};


// --- MODULE: src/core/nodes.js ---
// ============================================================================
// CORE: Creación de Nodos
// ============================================================================

DiscourseGraphToolkit.parseTemplate = function (templateText) {
    const lines = templateText.split('\n');
    const result = [];
    const stack = [{ children: result, indent: -1 }];

    for (let line of lines) {
        const indent = line.search(/\S/);
        const text = line.trim();
        if (text === '' || indent === -1) continue;

        const level = Math.floor(indent / 4);
        const item = { text, children: [] };

        while (stack.length > 1 && stack[stack.length - 1].indent >= level) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(item);
        stack.push({ children: item.children, indent: level });
    }
    return result;
};

DiscourseGraphToolkit.createTemplateBlocks = async function (parentUid, templateItems, startOrder = 0, proyecto = "") {
    try {
        for (let i = 0; i < templateItems.length; i++) {
            let item = templateItems[i];
            let processedText = item.text.replace(/{PROYECTO}/g, proyecto);

            let blockUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.block.create({
                "location": { "parent-uid": parentUid, "order": startOrder + i },
                "block": { "uid": blockUid, "string": processedText }
            });

            if (item.children && item.children.length > 0) {
                await this.createTemplateBlocks(blockUid, item.children, 0, proyecto);
            }
        }
    } catch (e) {
        console.error("Error creating template blocks:", e);
        throw e; // Re-throw to be caught by caller
    }
};

DiscourseGraphToolkit.convertBlockToNode = async function (typePrefix) {
    let pageUid = null;
    let pageWasCreated = false;
    let blockUid = null;
    let originalBlockContent = null;

    try {
        let focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock();
        if (!focusedBlock) {
            this.showToast("No hay bloque enfocado", "error");
            return;
        }
        blockUid = focusedBlock["block-uid"];
        let blockData = window.roamAlphaAPI.data.pull("[:block/string]", `[:block/uid "${blockUid}"]`);
        if (!blockData) return;

        originalBlockContent = blockData[":block/string"] || "";
        if (originalBlockContent.trim() === "") {
            this.showToast("El bloque está vacío", "error");
            return;
        }
        if (originalBlockContent.startsWith(`[[${typePrefix}]]`)) {
            this.showToast("El bloque ya fue transformado", "info");
            return;
        }

        // Configuración actual
        const config = this.getConfig();
        const proyecto = config.defaultProject;
        const templates = this.getTemplates();
        const templateText = templates[typePrefix];
        const templateItems = this.parseTemplate(templateText);

        // Crear página
        let newPageTitle = `[[${typePrefix}]] - ${originalBlockContent}`;
        let newBlockString = `[[${newPageTitle}]]`;

        // Verificar existencia
        let safeTitle = this.escapeDatalogString(newPageTitle);
        let existing = window.roamAlphaAPI.q(`[:find ?uid :where [?page :node/title "${safeTitle}"] [?page :block/uid ?uid]]`);

        if (existing && existing.length > 0) {
            pageUid = existing[0][0];
            this.showToast(`Nodo ${typePrefix} ya existe, vinculando...`, "info");
        } else {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": newPageTitle, "uid": pageUid }
            });
            pageWasCreated = true;
            await this.createTemplateBlocks(pageUid, templateItems, 0, proyecto);
        }

        this.addToNodeHistory(typePrefix, originalBlockContent, proyecto);

        await window.roamAlphaAPI.data.block.update({
            "block": { "uid": blockUid, "string": newBlockString }
        });

        this.showToast(`✓ Nodo ${typePrefix} creado`, "success");

        setTimeout(() => {
            window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: blockUid } });
        }, 100);

    } catch (error) {
        console.error("Error creando nodo:", error);
        this.showToast("Error: " + error.message, "error");
        // Rollback simple
        if (pageWasCreated && pageUid) {
            await window.roamAlphaAPI.data.page.delete({ "page": { "uid": pageUid } });
        }
        if (blockUid && originalBlockContent) {
            await window.roamAlphaAPI.data.block.update({ "block": { "uid": blockUid, "string": originalBlockContent } });
        }
    }
};




// --- MODULE: src/core/projects.js ---
// ============================================================================
// PROJECT MANAGER: Centralized Project Logic
// ============================================================================

/**
 * ProjectManager - Provides centralized helpers for project field handling.
 * This module addresses the fragmentation of project-related logic across
 * multiple files and eliminates hardcoded "Proyecto Asociado::" strings.
 */
DiscourseGraphToolkit.ProjectManager = {

    /**
     * Gets the configured project field name (e.g., "Proyecto Asociado")
     * Falls back to default if not configured.
     * @returns {string} The field name without "::"
     */
    getFieldName: function () {
        const config = DiscourseGraphToolkit.getConfig();
        return config.projectFieldName || "Proyecto Asociado";
    },

    /**
     * Gets the full field pattern including "::" (e.g., "Proyecto Asociado::")
     * Use this for string matching and queries.
     * @returns {string} The field pattern with "::"
     */
    getFieldPattern: function () {
        return this.getFieldName() + "::";
    },

    /**
     * Gets a regex to extract project name from a block string.
     * Matches pattern: FieldName:: [[ProjectName]]
     * Caches the compiled regex; only recompiles if the field name changes.
     * @returns {RegExp} Regex with capture group for project name
     */
    _cachedRegex: null,
    _cachedRegexFieldName: null,
    getFieldRegex: function () {
        const fieldName = this.getFieldName();
        if (this._cachedRegex && this._cachedRegexFieldName === fieldName) {
            return this._cachedRegex;
        }
        // Escape special regex characters in field name
        const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        this._cachedRegex = new RegExp(escaped + "::\\s*\\[\\[([^\\]]+)\\]\\]");
        this._cachedRegexFieldName = fieldName;
        return this._cachedRegex;
    },

    /**
     * Builds a complete field value string for a project.
     * Result: "Proyecto Asociado:: [[ProjectName]]"
     * @param {string} projectName - The project name to include
     * @returns {string} Complete field value string
     */
    buildFieldValue: function (projectName) {
        return this.getFieldName() + ":: [[" + projectName + "]]";
    },

    /**
     * Escapes the field name for use in Datalog queries.
     * @returns {string} Escaped field name safe for Datalog
     */
    getEscapedFieldName: function () {
        return DiscourseGraphToolkit.escapeDatalogString(this.getFieldName());
    },

    /**
     * Escapes the field pattern for use in Datalog queries.
     * @returns {string} Escaped field pattern safe for Datalog
     */
    getEscapedFieldPattern: function () {
        return DiscourseGraphToolkit.escapeDatalogString(this.getFieldPattern());
    }
};




// --- MODULE: src/core/export.js ---

// ============================================================================
// CORE: Exportación
// ============================================================================


DiscourseGraphToolkit.transformToNativeFormat = function (pullData, depth = 0, visited = new Set(), includeContent = true) {
    if (!pullData) return null;
    if (depth > this.FILES.MAX_DEPTH) {
        console.warn(`⚠️ Profundidad máxima alcanzada (${depth}) en nodo ${pullData[':block/uid']}`);
        return { 'uid': pullData[':block/uid'], '_truncated': true, '_truncated_at_depth': depth };
    }

    const uid = pullData[':block/uid'];
    if (uid && visited.has(uid)) return { 'uid': uid, '_circular_ref': true };

    const newVisited = new Set(visited);
    if (uid) newVisited.add(uid);

    const transformed = {};
    // FIX: Check for undefined to allow empty strings
    if (pullData[':block/string'] !== undefined) transformed['string'] = pullData[':block/string'];
    if (pullData[':block/uid']) transformed['uid'] = pullData[':block/uid'];
    if (pullData[':node/title']) transformed['title'] = pullData[':node/title'];
    if (pullData[':edit/time']) transformed['edit-time'] = this.convertTimestamp(pullData[':edit/time']);
    if (pullData[':create/time']) transformed['create-time'] = this.convertTimestamp(pullData[':create/time']);
    if (pullData[':block/order'] !== undefined) transformed['order'] = pullData[':block/order'];

    if (pullData[':block/refs'] && Array.isArray(pullData[':block/refs'])) {
        transformed[':block/refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { ':block/uid': ref[':block/uid'] } : ref
        );
        transformed['refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { uid: ref[':block/uid'] } : ref
        );
    }

    if (pullData[':create/user']) transformed[':create/user'] = { ':user/uid': pullData[':create/user'][':user/uid'] };
    if (pullData[':edit/user']) transformed[':edit/user'] = { ':user/uid': pullData[':edit/user'][':user/uid'] };

    // Extraer metadatos de proyecto en el nivel raíz (página)
    if (depth === 0) {
        transformed['project_metadata'] = {};
        const children = pullData[':block/children'];
        if (Array.isArray(children)) {
            const PM = DiscourseGraphToolkit.ProjectManager;
            const projectFieldName = PM.getFieldName();
            const projRegex = new RegExp(projectFieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?::|::)\\s*(?:\\[\\[)?([^\\]\\n:]+)(?:\\]\\])?", 'i');
            const seccionRegex = /Secci[oó]n\s+Narrativa(?::|::)\s*(?:\[\[)?([^\#\]\n:]+)(?:\\]\\])?/i;

            for (const child of children) {
                const str = child[':block/string'] || "";
                if (!str) continue;

                const projMatch = str.match(projRegex);
                if (projMatch && !transformed['project_metadata']['proyecto_asociado']) {
                    transformed['project_metadata']['proyecto_asociado'] = projMatch[1].trim();
                }

                const seccionMatch = str.match(seccionRegex);
                if (seccionMatch && !transformed['project_metadata']['seccion_tesis']) {
                    transformed['project_metadata']['seccion_tesis'] = seccionMatch[1].trim();
                }
            }
        }
    }

    // Solo procesar hijos si includeContent es true O si es el nivel raíz (depth 0 es la página, sus hijos son los bloques)
    // Pero espera, si depth 0 es la página, sus hijos son el contenido.
    // Si includeContent es false, queremos la página (título, uid) pero NO sus hijos.
    if (includeContent && pullData[':block/children'] && Array.isArray(pullData[':block/children'])) {
        // SORTING FIX: Ensure children are processed in visual order
        const sortedChildren = [...pullData[':block/children']].sort((a, b) => {
            const orderA = a[':block/order'] !== undefined ? a[':block/order'] : 9999;
            const orderB = b[':block/order'] !== undefined ? b[':block/order'] : 9999;
            return orderA - orderB;
        });

        transformed['children'] = sortedChildren.map(child =>
            this.transformToNativeFormat(child, depth + 1, newVisited, includeContent)
        );
    }
    return transformed;
};

// --- Lógica de Exportación Nativa Robusta ---
DiscourseGraphToolkit.exportPagesNative = async function (pageUids, filename, onProgress, includeContent = true, download = true) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
    report(`Iniciando exportación de ${pageUids.length} páginas (Incluir contenido: ${includeContent})...`);

    const eids = pageUids.map(uid => [':block/uid', uid]);

    try {
        // Si no incluimos contenido, el patrón de pull podría ser más simple, pero usaremos el mismo y filtraremos en transform
        // Esto es menos eficiente en red pero más simple en código.
        // Opcional: Usar un patrón diferente si includeContent es false.
        const pattern = includeContent ? this.ROAM_PULL_PATTERN : `[:block/uid :node/title :edit/time :create/time :block/string]`;

        const rawData = await window.roamAlphaAPI.data.async.pull_many(pattern, eids);

        const exportData = rawData
            .filter(d => d !== null)
            .map((d, i) => {
                if ((i + 1) % 5 === 0) report(`Procesando ${i + 1}/${rawData.length}...`);
                return this.transformToNativeFormat(d, 0, new Set(), includeContent);
            });

        if (download) {
            this.downloadJSON(exportData, filename);
        }

        // Check for truncated nodes and warn
        const truncatedCount = JSON.stringify(exportData).split('"_truncated":true').length - 1;
        if (truncatedCount > 0) {
            console.warn(`⚠️ ${truncatedCount} nodo(s) fueron truncados por profundidad > ${this.FILES.MAX_DEPTH}. Considera usar "Exportar sin contenido" si necesitas estructuras más profundas.`);
        }

        return { count: exportData.length, data: exportData };
    } catch (e) {
        console.error("Error exportando:", e);
        throw e;
    }
};




// --- MODULE: src/core/import.js ---
// ============================================================================
// CORE: Importación
// ============================================================================

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };

    report(`Leyendo archivo (${jsonContent.length} bytes)...`);

    let data;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("El archivo no es un JSON válido: " + e.message);
    }

    if (!Array.isArray(data)) {
        throw new Error("El formato del JSON no es válido (debe ser un array de páginas).");
    }

    console.log("Import Data Length:", data.length);
    if (data.length === 0) {
        throw new Error("El archivo JSON contiene un array vacío (0 ítems).");
    }

    report(`Iniciando importación de ${data.length} ítems...`);
    let createdPages = 0;
    let skippedPages = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
        const pageData = data[i];
        // Normalizar claves (Soporte para exportaciones antiguas o raw)
        const title = pageData.title || pageData[':node/title'] || pageData[':title'];
        const uid = pageData.uid || pageData[':block/uid'] || pageData[':uid'];
        const children = pageData.children || pageData[':block/children'] || pageData['children'];

        if (!title) {
            console.warn("Item sin título saltado:", pageData);
            skippedPages++;
            continue;
        }

        report(`Procesando página ${i + 1}/${data.length}: ${title}`);

        try {
            await this.importPage({ ...pageData, title, uid, children });
            createdPages++;
        } catch (e) {
            console.error(`Error importando página ${title}:`, e);
            errors.push(`${title}: ${e.message}`);
            report(`❌ Error en página ${title}: ${e.message}`);
        }
    }

    // 3. Log en Daily Note
    if (createdPages > 0) {
        const importedTitles = data.map(p => p.title || p[':node/title'] || p[':title']).filter(t => t);
        await this.logImportToDailyNote(importedTitles);
    }

    return { pages: createdPages, skipped: skippedPages, errors: errors };
};

DiscourseGraphToolkit.logImportToDailyNote = async function (importedTitles) {
    if (!importedTitles || importedTitles.length === 0) return;

    const today = new Date();
    const dailyNoteUid = window.roamAlphaAPI.util.dateToPageUid(today);
    const dailyNoteTitle = window.roamAlphaAPI.util.dateToPageTitle(today);

    // 1. Asegurar que la Daily Note existe
    let page = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", dailyNoteTitle]);
    if (!page) {
        await window.roamAlphaAPI.data.page.create({ "page": { "title": dailyNoteTitle, "uid": dailyNoteUid } });
    }

    // 2. Crear bloque padre #import
    const importBlockUid = window.roamAlphaAPI.util.generateUID();
    const timestamp = today.toLocaleTimeString();
    await window.roamAlphaAPI.data.block.create({
        "location": { "parent-uid": dailyNoteUid, "order": "last" },
        "block": { "uid": importBlockUid, "string": `#import (${timestamp})` }
    });

    // 3. Crear hijos con los títulos
    for (let i = 0; i < importedTitles.length; i++) {
        const title = importedTitles[i];
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": importBlockUid, "order": i },
            "block": { "string": `[[${title}]]` }
        });
    }
};

DiscourseGraphToolkit.importPage = async function (pageData) {
    if (!pageData.title) return;

    // 1. Verificar si la página existe usando PULL (más robusto que Q)
    let pageUid = pageData.uid;
    // pull devuelve null si no encuentra la entidad
    let existingPage = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);

    if (existingPage && existingPage[':block/uid']) {
        // La página existe, usamos su UID real
        pageUid = existingPage[':block/uid'];
    } else {
        // La página no existe, la creamos
        if (!pageUid) pageUid = window.roamAlphaAPI.util.generateUID();

        try {
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": pageData.title, "uid": pageUid }
            });
        } catch (e) {
            console.warn(`Falló creación de página "${pageData.title}", intentando recuperar UID...`, e);
            // Si falla, intentamos ver si existe ahora (race condition?)
            let retry = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);
            if (retry && retry[':block/uid']) {
                pageUid = retry[':block/uid'];
            } else {
                throw e;
            }
        }
    }

    // 2. Importar hijos (Bloques)
    if (pageData.children && pageData.children.length > 0) {
        await this.importChildren(pageUid, pageData.children);
    }
};

DiscourseGraphToolkit.importChildren = async function (parentUid, children) {
    // Ordenar por 'order' si existe, para mantener la estructura
    const sortedChildren = [...children].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Optimización: Importar hijos en paralelo usando Promise.all
    // Roam API maneja el ordenamiento mediante la propiedad 'order', por lo que es seguro lanzarlos juntos.
    const promises = sortedChildren.map((child, i) =>
        DiscourseGraphToolkit.importBlock(parentUid, child, i)
    );

    await Promise.all(promises);
};

DiscourseGraphToolkit.importBlock = async function (parentUid, blockData, order) {
    // Normalizar claves de bloque
    const blockUid = blockData.uid || blockData[':block/uid'] || blockData[':uid'] || window.roamAlphaAPI.util.generateUID();
    const content = blockData.string || blockData[':block/string'] || blockData[':string'] || "";
    const children = blockData.children || blockData[':block/children'] || blockData['children'];

    // Verificar si el bloque ya existe (por UID) usando PULL
    let exists = false;
    if (blockData.uid || blockData[':block/uid']) {
        const check = window.roamAlphaAPI.data.pull("[:block/uid]", [":block/uid", blockUid]);
        exists = (check && check[':block/uid']);
    }

    if (!exists) {
        // Crear bloque
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": parentUid, "order": order },
            "block": { "uid": blockUid, "string": content }
        });
    } else {
        // El bloque existe.
        // ESTRATEGIA: NO SOBRESCRIBIR contenido.
    }

    // Recursión para hijos del bloque
    if (children && children.length > 0) {
        await DiscourseGraphToolkit.importChildren(blockUid, children);
    }
};




// --- MODULE: src/core/contentProcessor.js ---
// ============================================================================
// CORE: Content Processor
// Extracción de contenido de bloques para uso dentro del plugin.
//
// ⚠️ DUPLICACIÓN INTENCIONAL: Este módulo replica la lógica de MarkdownCore
// (markdownCore.js). MarkdownCore es una copia standalone que se inyecta en
// los HTML exportados y NO puede depender de DiscourseGraphToolkit.
// Si modificas la lógica de extracción aquí, asegúrate de replicar el cambio
// en markdownCore.js y viceversa.
// ============================================================================

DiscourseGraphToolkit.ContentProcessor = {
    MAX_RECURSION_DEPTH: 20,

    extractBlockContent: function (block, indentLevel = 0, skipMetadata = true, visitedBlocks = null, maxDepth = this.MAX_RECURSION_DEPTH, excludeBitacora = true, flatMode = false, nodeType = null) {
        let content = "";

        if (!visitedBlocks) visitedBlocks = new Set();

        if (indentLevel > maxDepth) {
            console.warn(`⚠ Profundidad máxima alcanzada (${maxDepth}), deteniendo recursión`);
            return content;
        }

        try {
            if (!block || typeof block !== 'object') return content;

            const blockUid = block.uid || block[':block/uid'] || "";
            const blockString = block.string || block[':block/string'] || "";

            // Identificador simple para JS (UID es suficiente en Roam)
            const blockIdentifier = blockUid;

            if (blockIdentifier && visitedBlocks.has(blockIdentifier)) {
                // console.warn(`⚠ Ciclo detectado en bloque: ${blockString.substring(0, 30)}..., saltando`);
                return content;
            }

            if (blockIdentifier) visitedBlocks.add(blockIdentifier);

            // Excluir bloque de bitácora y sus hijos SI la opción está activada
            if (excludeBitacora && blockString.toLowerCase().includes('[[bitácora]]')) {
                return "";
            }

            // Lógica de metadatos
            const structuralMarkers = ["#SupportedBy", "#RespondedBy", "#RelatedTo", "#Contains"];
            const isStructural = structuralMarkers.includes(blockString);

            if (skipMetadata && (!blockString || isStructural)) {
                // Pass
            } else {
                if (blockString) {
                    if (flatMode) {
                        // En flatMode, primer nivel usa estilo de marcador (excepto EVD)
                        if (indentLevel === 0) {
                            if (nodeType === 'EVD') {
                                // EVD: texto normal (contenido sustantivo extenso)
                                content += `${blockString}\n\n`;
                            } else {
                                // QUE/CLM: cursiva con marcador (metadatos/estructura)
                                content += `*— ${blockString} —*\n\n`;
                            }
                        } else {
                            content += `${blockString}\n\n`;
                        }
                    } else {
                        if (indentLevel === 0) {
                            if (nodeType === 'EVD') {
                                // EVD: texto normal
                                content += `${blockString}\n\n`;
                            } else {
                                // Marcador de primer nivel (cursiva con guiones largos)
                                content += `*— ${blockString} —*\n\n`;
                            }
                        } else {
                            const indent = "  ".repeat(indentLevel);
                            content += `${indent}- ${blockString}\n`;
                        }
                    }
                }
            }

            const children = block.children || block[':block/children'] || [];
            if (Array.isArray(children)) {
                for (const child of children) {
                    const childContent = this.extractBlockContent(child, indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType);
                    if (childContent) content += childContent;
                }
            }

            if (blockIdentifier) visitedBlocks.delete(blockIdentifier);

        } catch (e) {
            console.warn(`⚠ Error extrayendo contenido de bloque: ${e}`);
        }

        return content;
    },

    extractNodeContent: function (nodeData, extractAdditionalContent = false, nodeType = "EVD", excludeBitacora = true, flatMode = false) {
        let detailedContent = "";

        try {
            if (!nodeData) return detailedContent;

            const children = nodeData.children || nodeData[':block/children'] || [];
            if (Array.isArray(children) && children.length > 0) {
                for (const child of children) {
                    const childString = child.string || child[':block/string'] || "";
                    const structuralMetadata = ["#SupportedBy", "#RespondedBy", "#RelatedTo", "#Contains"];
                    const isStructuralMetadata = structuralMetadata.some(meta => childString.startsWith(meta));

                    // FIX: Always exclude structural metadata blocks from text content to avoid duplicates,
                    // as these relationships are rendered structurally (e.g. headers/sub-sections).
                    if (!isStructuralMetadata) {
                        // Normal content block
                        if (childString) {
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType);
                            if (childContent) detailedContent += childContent;
                        } else {
                            // Empty block with children (e.g. indentation wrapper) -> recurse?
                            // extractBlockContent handles recursion.
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType);
                            if (childContent) detailedContent += childContent;
                        }
                    } else if (childString === "#RelatedTo" && (child.children || child[':block/children'])) {
                        // Only for RelatedTo, we might want to peek inside if it contains non-structural text?
                        // But usually RelatedTo contains links. If we treat it as structural, we skip it.
                        // Given the user instruction "only appear once", skipping structural blocks is safer.
                    }
                }
            }

            if (!detailedContent) {
                // Fallback: contenido directo o título
                const mainString = nodeData.string || nodeData[':block/string'] || "";
                if (mainString) {
                    detailedContent += flatMode ? `${mainString}\n\n` : `- ${mainString}\n`;
                } else {
                    const title = nodeData.title || nodeData[':node/title'] || "";
                    if (title) {
                        const prefix = `[[${nodeType}]] - `;
                        const cleanTitle = title.replace(prefix, "").trim();
                        if (cleanTitle) detailedContent += flatMode ? `${cleanTitle}\n\n` : `- ${cleanTitle}\n`;
                    }
                }
            }

        } catch (e) {
            console.error(`❌ Error extrayendo contenido ${nodeType}: ${e}`);
        }

        return detailedContent;
    }
};




// --- MODULE: src/core/relationshipMapper.js ---
// ============================================================================
// CORE: Relationship Mapper
// Ported from roamMap/core/relationship_mapper.py
// ============================================================================

DiscourseGraphToolkit.RelationshipMapper = {
    mapRelationships: function (allNodes) {
        console.log("Mapeando relaciones entre nodos...");

        // Paso 1: Crear mapas de búsqueda
        const { clmTitleMap, evdTitleMap, griTitleMap, queTitleMap } = this._createTitleMaps(allNodes);

        // Paso 2: Mapear QUE -> CLM/EVD (respuestas directas)
        this._mapQueRelationships(allNodes, clmTitleMap, evdTitleMap);

        // Paso 3: Mapear CLM -> EVD/CLM (estructura estándar y relaciones laterales)
        this._mapClmRelationships(allNodes, evdTitleMap, clmTitleMap);

        // Paso 4: Mapear relaciones CLM-CLM y CLM-EVD vía #RelatedTo
        this._mapClmRelatedToRelationships(allNodes, clmTitleMap, evdTitleMap);

        // Paso 5: Mapear GRI -> QUE/CLM/GRI vía #Contains
        this._mapGriRelationships(allNodes, queTitleMap, clmTitleMap, griTitleMap, evdTitleMap);

        // Resumen de diagnóstico
        let queClmLinks = 0, clmSuppLinks = 0, clmEvdLinks = 0, clmConnLinks = 0;
        for (const uid in allNodes) {
            const n = allNodes[uid];
            if (n.type === 'QUE') queClmLinks += (n.related_clms || []).length;
            if (n.type === 'CLM') {
                clmSuppLinks += (n.supporting_clms || []).length;
                clmEvdLinks += (n.related_evds || []).length;
                clmConnLinks += (n.connected_clms || []).length;
            }
        }
        console.log(`📊 Relaciones mapeadas: QUE→CLM: ${queClmLinks}, CLM→CLM(supporting): ${clmSuppLinks}, CLM→EVD: ${clmEvdLinks}, CLM→CLM(connected): ${clmConnLinks}`);
    },

    _createTitleMaps: function (allNodes) {
        const clmTitleMap = {};
        const evdTitleMap = {};
        const griTitleMap = {};
        const queTitleMap = {};

        for (const uid in allNodes) {
            const node = allNodes[uid];
            try {
                if (node.type === "CLM") {
                    this._addToTitleMap(clmTitleMap, node, uid, "[[CLM]] - ");
                } else if (node.type === "EVD") {
                    this._addToTitleMap(evdTitleMap, node, uid, "[[EVD]] - ");
                } else if (node.type === "GRI") {
                    this._addToTitleMap(griTitleMap, node, uid, "[[GRI]] - ");
                } else if (node.type === "QUE") {
                    this._addToTitleMap(queTitleMap, node, uid, "[[QUE]] - ");
                }
            } catch (e) {
                console.warn(`⚠ Error creando mapa para nodo ${uid}: ${e}`);
            }
        }

        console.log(`Mapas creados: ${Object.keys(griTitleMap).length} GRIs, ${Object.keys(queTitleMap).length} QUEs, ${Object.keys(clmTitleMap).length} CLMs, ${Object.keys(evdTitleMap).length} EVDs`);
        return { clmTitleMap, evdTitleMap, griTitleMap, queTitleMap };
    },

    _addToTitleMap: function (titleMap, node, uid, prefix) {
        const title = node.title || "";
        if (!title) return;

        // Guardar tanto el título completo como una versión limpia
        titleMap[title] = uid;
        const cleanTitle = DiscourseGraphToolkit.cleanText(title.replace(prefix, ""));
        titleMap[cleanTitle] = uid;
    },

    // Traverse the block tree recursively, executing a callback on each block
    _traverseBlocks: function (blocks, callback) {
        if (!blocks || !Array.isArray(blocks)) return;
        for (const block of blocks) {
            callback(block);
            if (block.children && block.children.length > 0) {
                this._traverseBlocks(block.children, callback);
            }
        }
    },

    _mapQueRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "QUE") continue;

            if (!node.related_clms) node.related_clms = [];
            if (!node.direct_evds) node.direct_evds = [];

            try {
                const data = node.data;
                const children = data.children || []; // Sorted by export.js

                // Recorrer todo el árbol de bloques buscando #RespondedBy
                this._traverseBlocks(children, (child) => {
                    const str = child.string || "";
                    if (str.includes("#RespondedBy")) {
                        // Case 1: The block ITSELF is the response (e.g. "[[CLM]] - Title #RespondedBy")
                        this._extractRelationshipsFromBlock(child, node, uid, allNodes, clmTitleMap, evdTitleMap, "related_clms", "direct_evds");

                        // Case 2: The block is a header/container (e.g. "#RespondedBy" -> children are responses)
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractRelationshipsFromBlock(subChild, node, uid, allNodes, clmTitleMap, evdTitleMap, "related_clms", "direct_evds");
                            }
                        }
                    }

                    // Novedad: Si encontramos un CLM anidado directamente en la pregunta (sin #RespondedBy explicit),
                    // O si ese CLM a su vez tiene #SupportedBy dentro del árbol de la QUE.
                    // Esto se maneja mejor delegando el procesamiento de sub-relaciones cuando encontramos una ref.
                    this._processInlineSubRelationships(child, uid, allNodes, clmTitleMap, evdTitleMap);
                });
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para QUE ${uid}: ${e}`);
            }
        }
    },

    // Busca si un bloque hace referencia a un nodo y luego escanea sus HILOS (hijos) 
    // para encontrar conectores (ej: #SupportedBy) que le pertenezcan
    _processInlineSubRelationships: function (block, rootUid, allNodes, clmTitleMap, evdTitleMap) {
        const refsToCheck = this._getRefsFromBlockAndText(block, allNodes, clmTitleMap, evdTitleMap);
        if (refsToCheck.length === 0) return;

        for (const refUid of refsToCheck) {
            const referencedNode = allNodes[refUid];
            if (!referencedNode) continue;

            // Si el bloque referencia a un CLM, buscar entre sus hijos si hay #SupportedBy o #RelatedTo
            if (referencedNode.type === "CLM") {
                if (!referencedNode.connected_clms) referencedNode.connected_clms = [];
                if (!referencedNode.supporting_clms) referencedNode.supporting_clms = [];
                if (!referencedNode.related_evds) referencedNode.related_evds = [];

                const children = block.children || [];
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#SupportedBy")) {
                        // Similar a _mapClmRelationships pero ejecutado sobre el bloque anidado
                        this._extractRelationshipsFromBlock(child, referencedNode, refUid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractRelationshipsFromBlock(subChild, referencedNode, refUid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");
                            }
                        }
                    }
                    if (str.includes("#RelatedTo")) {
                        this._processRelatedToChildren(child, referencedNode, refUid, allNodes, clmTitleMap, evdTitleMap);
                    }
                }
            }
        }
    },

    // Extrae todos los UIDs de referencias de un bloque (tanto links explícitos como [[texto]])
    _getRefsFromBlockAndText: function (block, allNodes, clmTitleMap, evdTitleMap) {
        const uids = new Set();

        // Refs (ROAM native)
        if (block.refs) block.refs.forEach(r => uids.add(r.uid));
        if (block[':block/refs']) {
            block[':block/refs'].forEach(r => {
                if (r[':block/uid']) uids.add(r[':block/uid']);
            });
        }

        // Inline Title Refs
        const str = block.string || "";
        const pattern = /\[\[([^\]]+)\]\]/g;
        let match;
        while ((match = pattern.exec(str)) !== null) {
            const refContent = match[1];
            // Match exacto en los mapas de títulos (O(1))
            if (clmTitleMap[refContent]) uids.add(clmTitleMap[refContent]);
            if (evdTitleMap[refContent]) uids.add(evdTitleMap[refContent]);
        }
        return Array.from(uids);
    },

    // Helper genérico para extraer relaciones de un bloque (refs o texto)
    _extractRelationshipsFromBlock: function (block, node, sourceUid, allNodes, clmTitleMap, evdTitleMap, clmTargetField, evdTargetField) {
        try {
            const responseText = block.string || "";

            // A. Relaciones por Referencias (Direct UID refs)
            const refsToCheck = [];
            if (block.refs) refsToCheck.push(...block.refs);
            if (block[':block/refs']) {
                for (const ref of block[':block/refs']) {
                    if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                }
            }

            for (const ref of refsToCheck) {
                const refUid = ref.uid || "";
                if (allNodes[refUid]) {
                    if (allNodes[refUid].type === "CLM") {
                        if (!node[clmTargetField].includes(refUid)) {
                            node[clmTargetField].push(refUid);
                        }
                    } else if (allNodes[refUid].type === "EVD") {
                        if (node[evdTargetField] && !node[evdTargetField].includes(refUid)) {
                            node[evdTargetField].push(refUid);
                        }
                    }
                }
            }

            // B. Relaciones por Texto ([[WikiLinks]])
            this._findEmbeddedRelationships(responseText, node, sourceUid, clmTitleMap, evdTitleMap, clmTargetField, evdTargetField);

        } catch (e) {
            console.warn(`⚠ Error processing block relationships: ${e}`);
        }
    },

    _findEmbeddedRelationships: function (responseText, node, uid, clmTitleMap, evdTitleMap, clmField, evdField) {
        try {
            // Extraer todas las referencias [[...]] del texto
            const pattern = /\[\[([^\]]+)\]\]/g;
            const references = [];
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                references.push(match[1]); // match[1] es el contenido dentro de los corchetes
            }

            if (references.length === 0) return;

            // Buscar CLMs y EVDs usando match exacto (O(1))
            for (const ref of references) {
                if (ref.includes('CLM') && clmTitleMap[ref]) {
                    const clmUid = clmTitleMap[ref];
                    if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                        node[clmField].push(clmUid);
                    }
                } else if (ref.includes('EVD') && evdTitleMap[ref]) {
                    const evdUid = evdTitleMap[ref];
                    if (!node[evdField].includes(evdUid) && evdUid !== uid) {
                        node[evdField].push(evdUid);
                    }
                }
            }

        } catch (e) {
            console.warn(`⚠ Error buscando relaciones incrustadas: ${e}`);
        }
    },

    _mapClmRelationships: function (allNodes, evdTitleMap, clmTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            if (!node.related_evds) node.related_evds = [];
            if (!node.connected_clms) node.connected_clms = [];
            if (!node.supporting_clms) node.supporting_clms = [];

            try {
                const data = node.data;
                const children = data.children || []; // Sorted

                this._traverseBlocks(children, (child) => {
                    const str = child.string || "";
                    if (str.includes("#SupportedBy")) {
                        // Case 1: Direct #SupportedBy on the node line
                        this._extractRelationshipsFromBlock(child, node, uid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");

                        // Case 2: Container #SupportedBy
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractRelationshipsFromBlock(subChild, node, uid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");
                            }
                        }
                    }

                    this._processInlineSubRelationships(child, uid, allNodes, clmTitleMap, evdTitleMap);
                });
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para CLM ${uid}: ${e}`);
            }
        }
    },

    // _processSupportedByChildren removed as it is replaced by generic helper logic above

    _mapClmRelatedToRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            try {
                const data = node.data;
                const children = data.children || [];

                this._traverseBlocks(children, (child) => {
                    const str = child.string || "";
                    if (str.includes("#RelatedTo")) {
                        this._processRelatedToChildren(child, node, uid, allNodes, clmTitleMap, evdTitleMap);
                    }
                });
            } catch (e) {
                console.error(`❌ Error mapeando relaciones #RelatedTo para CLM ${uid}: ${e}`);
            }
        }
    },

    _processRelatedToChildren: function (parentChild, node, uid, allNodes, clmTitleMap, evdTitleMap) {
        const children = parentChild.children || [];
        for (const relatedItem of children) {
            try {
                const refsToCheck = [];
                if (relatedItem.refs) refsToCheck.push(...relatedItem.refs);
                if (relatedItem[':block/refs']) {
                    for (const ref of relatedItem[':block/refs']) {
                        if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                    }
                }

                for (const ref of refsToCheck) {
                    const refUid = ref.uid || "";
                    if (allNodes[refUid] && refUid !== uid) {
                        const referencedNode = allNodes[refUid];
                        if (referencedNode.type === "CLM") {
                            if (!node.connected_clms.includes(refUid)) {
                                node.connected_clms.push(refUid);
                            }
                        } else if (referencedNode.type === "EVD") {
                            if (!node.related_evds.includes(refUid)) {
                                node.related_evds.push(refUid);
                            }
                        }
                    }
                }

                const relatedText = relatedItem.string || "";
                this._findEmbeddedRelationships(relatedText, node, uid, clmTitleMap, evdTitleMap, "connected_clms", "related_evds");

            } catch (e) {
                console.warn(`⚠ Error procesando item #RelatedTo en CLM ${uid}: ${e}`);
            }
        }
    },

    // --- GRI: Mapear relaciones GRI -> QUE/CLM/GRI vía #Contains ---
    _mapGriRelationships: function (allNodes, queTitleMap, clmTitleMap, griTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "GRI") continue;

            if (!node.contained_nodes) node.contained_nodes = [];

            try {
                const data = node.data;
                const children = data.children || [];

                this._traverseBlocks(children, (child) => {
                    const str = child.string || "";
                    if (str.includes("#Contains")) {
                        // Case 1: Inline (el bloque mismo puede tener una referencia)
                        this._extractContainedNodes(child, node, uid, allNodes, queTitleMap, clmTitleMap, griTitleMap, evdTitleMap);

                        // Case 2: Container (#Contains -> hijos son las referencias)
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractContainedNodes(subChild, node, uid, allNodes, queTitleMap, clmTitleMap, griTitleMap, evdTitleMap);
                            }
                        }
                    }
                });
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para GRI ${uid}: ${e}`);
            }
        }
    },

    // Helper: Extrae nodos contenidos (QUE, CLM, GRI) de un bloque bajo #Contains
    _extractContainedNodes: function (block, node, sourceUid, allNodes, queTitleMap, clmTitleMap, griTitleMap, evdTitleMap) {
        try {
            const refsToCheck = [];
            if (block.refs) refsToCheck.push(...block.refs);
            if (block[':block/refs']) {
                for (const ref of block[':block/refs']) {
                    if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                }
            }

            for (const ref of refsToCheck) {
                const refUid = ref.uid || "";
                if (allNodes[refUid] && refUid !== sourceUid) {
                    const refType = allNodes[refUid].type;
                    // GRI puede contener QUE, CLM, GRI, o EVD
                    if (refType === "QUE" || refType === "CLM" || refType === "GRI" || refType === "EVD") {
                        if (!node.contained_nodes.includes(refUid)) {
                            node.contained_nodes.push(refUid);
                        }
                    }
                }
            }

            // Buscar también referencias [[...]] en el texto
            const blockText = block.string || "";
            const pattern = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = pattern.exec(blockText)) !== null) {
                const refContent = match[1];
                // Intentar encontrar en los mapas existentes (O(1))
                const nUid = (queTitleMap && queTitleMap[refContent]) || 
                             (clmTitleMap && clmTitleMap[refContent]) || 
                             (griTitleMap && griTitleMap[refContent]) || 
                             (evdTitleMap && evdTitleMap[refContent]);
                
                if (nUid && nUid !== sourceUid) {
                    if (!node.contained_nodes.includes(nUid)) {
                        node.contained_nodes.push(nUid);
                    }
                }
            }
        } catch (e) {
            console.warn(`⚠ Error extrayendo nodos contenidos en GRI ${sourceUid}: ${e}`);
        }
    },

    collectDependencies: function (nodes) {
        const dependencies = new Set();

        for (const node of nodes) {
            try {
                const data = node.data;
                const children = data.children || [];

                this._traverseBlocks(children, (child) => {
                    const str = child.string || "";
                    if (
                        str.includes("#RespondedBy") ||
                        str.includes("#SupportedBy") ||
                        str.includes("#RelatedTo") ||
                        str.includes("#Contains")
                    ) {
                        this._collectRefsFromBlock(child, dependencies);
                    }
                    // Extract refs from the text as well unconditionally to make sure inline nesting works
                    if (str.includes("[[CLM") || str.includes("[[EVD") || str.includes("[[QUE") || str.includes("[[GRI")) {
                        this._collectRefsFromBlock(child, dependencies, true);
                    }
                });
            } catch (e) {
                console.warn(`Error collecting dependencies for ${node.uid}:`, e);
            }
        }
        return dependencies;
    },

    _collectRefsFromBlock: function (block, dependencies, directOnly = false) {
        // Direct refs of the current block
        if (block.refs) block.refs.forEach(r => dependencies.add(r.uid));
        if (block[':block/refs']) {
            block[':block/refs'].forEach(r => {
                if (r[':block/uid']) dependencies.add(r[':block/uid']);
            });
        }

        if (!directOnly) {
            const children = block.children || [];
            for (const child of children) {
                // Direct refs
                if (child.refs) child.refs.forEach(r => dependencies.add(r.uid));
                if (child[':block/refs']) {
                    child[':block/refs'].forEach(r => {
                        if (r[':block/uid']) dependencies.add(r[':block/uid']);
                    });
                }
                // Embedded refs [[UID]] - we can't easily parse UID from text unless we have a map.
                // But usually structural links use block refs or page refs which show up in metadata.
                // For now, rely on explicit refs.
            }
        }
    }
};




// --- MODULE: src/core/markdownCore.js ---
// ============================================================================
// CORE: Markdown Core
// Funciones standalone de generación de Markdown.
// Se inyecta en el HTML exportado — NO puede depender de DiscourseGraphToolkit.
//
// ⚠️ DUPLICACIÓN INTENCIONAL: extractBlockContent y extractNodeContent replican
// la lógica de ContentProcessor (contentProcessor.js). Si modificas estos
// métodos, asegúrate de replicar el cambio en contentProcessor.js y viceversa.
// ============================================================================

var MarkdownCore = {
    MAX_RECURSION_DEPTH: 20,

    // --- Limpieza de texto ---
    cleanText: function (text) {
        if (!text || typeof text !== 'string') return "";
        return text.replace(/\s+/g, ' ').trim();
    },

    // --- Extracción de contenido de bloque ---
    extractBlockContent: function (block, indentLevel, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType, formatOptions) {
        var content = '';
        if (!visitedBlocks) visitedBlocks = {};
        if (indentLevel === undefined) indentLevel = 0;
        if (maxDepth === undefined) maxDepth = this.MAX_RECURSION_DEPTH;
        if (nodeType === undefined) nodeType = null;
        if (indentLevel > maxDepth) return content;
        if (!block || typeof block !== 'object') return content;

        var blockUid = block.uid || block[':block/uid'] || '';
        var blockString = block.string || block[':block/string'] || '';

        if (blockUid && visitedBlocks[blockUid]) return content;
        if (blockUid) visitedBlocks[blockUid] = true;

        // Excluir bitácora
        if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) {
            return '';
        }

        var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo', '#Contains'];
        var isStructural = structuralMarkers.indexOf(blockString) !== -1;

        if (skipMetadata && (!blockString || isStructural)) {
            // Skip
        } else {
            if (blockString) {
                if (flatMode) {
                    // En flatMode, primer nivel usa estilo de marcador (excepto EVD)
                    if (indentLevel === 0) {
                        if (nodeType === 'EVD') {
                            // EVD: texto normal (contenido sustantivo extenso)
                            content += blockString + '\n\n';
                        } else {
                            // QUE/CLM: cursiva con marcador (metadatos/estructura)
                            content += '*— ' + blockString + ' —*\n\n';
                        }
                    } else {
                        content += blockString + '\n\n';
                    }
                } else {
                    if (indentLevel === 0) {
                        if (nodeType === 'EVD') {
                            // EVD: texto normal
                            content += blockString + '\n\n';
                        } else {
                            // Marcador de primer nivel (cursiva con guiones largos)
                            content += '*— ' + blockString + ' —*\n\n';
                        }
                    } else {
                        var indent = '';
                        var indentStr = '  '; // 2 espacios estandar
                        for (var i = 0; i < indentLevel; i++) indent += indentStr;
                        content += indent + '- ' + blockString + '\n';
                    }
                }
            }
        }

        var children = block.children || block[':block/children'] || [];
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var childContent = this.extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType, formatOptions);
                if (childContent) content += childContent;
            }
        }

        if (blockUid) delete visitedBlocks[blockUid];
        return content;
    },

    // --- Extracción de contenido de nodo ---
    extractNodeContent: function (nodeData, includeContent, nodeType, excludeBitacora, flatMode, formatOptions) {
        var detailedContent = '';
        if (!nodeData) return detailedContent;

        var children = nodeData.children || nodeData[':block/children'] || [];
        if (Array.isArray(children) && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var childString = child.string || child[':block/string'] || '';
                var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo', '#Contains'];
                var isStructuralMetadata = false;
                for (var j = 0; j < structuralMetadata.length; j++) {
                    if (childString.indexOf(structuralMetadata[j]) === 0) {
                        isStructuralMetadata = true;
                        break;
                    }
                }

                if (!isStructuralMetadata) {
                    var childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType, formatOptions);
                    if (childContent) detailedContent += childContent;
                }
            }
        }

        if (!detailedContent) {
            var mainString = nodeData.string || nodeData[':block/string'] || '';
            if (mainString) {
                detailedContent += flatMode ? mainString + '\n\n' : '- ' + mainString + '\n';
            } else {
                var title = nodeData.title || nodeData[':node/title'] || '';
                if (title) {
                    var prefix = '[[' + nodeType + ']] - ';
                    var cleanTitle = title.replace(prefix, '').trim();
                    if (cleanTitle) detailedContent += flatMode ? cleanTitle + '\n\n' : '- ' + cleanTitle + '\n';
                }
            }
        }

        return detailedContent;
    },

    // --- Límite de profundidad para recursión de nodos (seguridad) ---
    MAX_NODE_DEPTH: 10,

    // --- Helper: renderizar metadata de un nodo ---
    renderMetadata: function (metadata, flatMode) {
        var result = '';
        if (!metadata) return result;
        if (metadata.proyecto_asociado || metadata.seccion_tesis) {
            if (flatMode) {
                if (metadata.proyecto_asociado) result += 'Proyecto Asociado: ' + metadata.proyecto_asociado + '\n\n';
                if (metadata.seccion_tesis) result += 'Sección Narrativa: ' + metadata.seccion_tesis + '\n\n';
            } else {
                result += '**Información del proyecto:**\n';
                if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\n';
                if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\n';
                result += '\n';
            }
        }
        return result;
    },

    // --- Recursión genérica para renderizar un nodo CLM o EVD y sus hijos ---
    renderNodeTree: function (nodeUid, allNodes, headingLevel, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, numberingPath) {
        if (!nodeUid || !allNodes[nodeUid]) return '';
        if (headingLevel > this.MAX_NODE_DEPTH + 2) return ''; // +2 porque QUE empieza en nivel 2
        if (visited[nodeUid]) return ''; // Evitar ciclos
        visited[nodeUid] = true;

        var node = allNodes[nodeUid];
        var type = node.type; // 'CLM' o 'EVD'
        var result = '';

        // Generar heading dinámico (###, ####, #####, etc.)
        var hashes = '';
        for (var h = 0; h < headingLevel; h++) hashes += '#';
        
        var title = this.cleanText((node.title || '').replace('[[' + type + ']] - ', ''));
        var displayTitle = title;
        if (!(formatOptions && formatOptions.hideNodeLabels)) {
            displayTitle = '[[' + type + ']] - ' + displayTitle;
        }
        if (formatOptions && formatOptions.useAcademicNumbering && numberingPath && numberingPath.length > 0) {
            displayTitle = numberingPath.join('.') + '. ' + displayTitle;
        }

        result += hashes + ' ' + displayTitle + '\n\n';

        // Metadata — SKIP en modo esqueleto
        var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
        if (includeProj) {
            result += this.renderMetadata(node.project_metadata || {}, flatMode);
        }

        // Contenido del nodo — SKIP en modo esqueleto
        if (config[type] && !skeletonMode) {
            var content = this.extractNodeContent(node.data, true, type, excludeBitacora, flatMode, formatOptions);
            if (content) {
                result += content + '\n';
            } else if (type === 'EVD' && !skeletonMode) {
                result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
            }
        }

        var childCounter = 1;

        // Hijos: CLMs de soporte (recursión)
        var hasSupportingClms = node.supporting_clms && node.supporting_clms.length > 0;
        if (hasSupportingClms) {
            for (var s = 0; s < node.supporting_clms.length; s++) {
                var childNum = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.supporting_clms[s], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNum);
            }
        }

        // Hijos: EVDs relacionados (hojas, pero usan recursión por uniformidad)
        var hasRelatedEvds = node.related_evds && node.related_evds.length > 0;
        if (hasRelatedEvds) {
            for (var e = 0; e < node.related_evds.length; e++) {
                var childNumE = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.related_evds[e], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumE);
            }
        }

        // Mensaje — SKIP en modo esqueleto
        if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds && !skeletonMode) {
            result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n';
        }

        // Hijos: Nodos contenidos (para GRI vía #Contains)
        if (node.contained_nodes && node.contained_nodes.length > 0) {
            for (var cn = 0; cn < node.contained_nodes.length; cn++) {
                var childNumCN = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.contained_nodes[cn], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumCN);
            }
        }

        // Hijos: CLMs relacionados (para QUE)
        var hasRelatedClms = node.related_clms && node.related_clms.length > 0;
        if (hasRelatedClms) {
            for (var c = 0; c < node.related_clms.length; c++) {
                var childNumC = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.related_clms[c], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumC);
            }
        }

        // Hijos: EVDs directos (para QUE)
        var hasDirectEvds = node.direct_evds && node.direct_evds.length > 0;
        if (hasDirectEvds) {
            for (var d = 0; d < node.direct_evds.length; d++) {
                var childNumD = (formatOptions && formatOptions.useAcademicNumbering) ? (numberingPath || []).concat([childCounter++]) : [];
                result += this.renderNodeTree(node.direct_evds[d], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited, skeletonMode, formatOptions, childNumD);
            }
        }

        // Mensaje — SKIP en modo esqueleto
        if (type === 'QUE' && !hasRelatedClms && !hasDirectEvds && !skeletonMode) {
            result += '*No se encontraron respuestas relacionadas con esta pregunta.*\n\n';
        }

        visited[nodeUid] = false; // Liberar para ramas paralelas
        return result;
    },

    // --- Generación de Markdown completo ---
    // rootNodes: array de nodos raíz (GRI y/o QUE)
    generateMarkdown: function (rootNodes, allNodes, config, excludeBitacora, flatMode, skeletonMode, formatOptions) {
        var self = this;

        // Compatibilidad: si config es booleano, convertir a objeto
        if (typeof config === 'boolean') {
            config = { GRI: config, QUE: config, CLM: config, EVD: config };
        }
        if (!config) config = { GRI: true, QUE: true, CLM: true, EVD: true };

        var result = '';
        // En modo esqueleto, omitir el título principal
        if (!skeletonMode) {
            result = '# Estructura de Investigación\n\n';
        }

        var lastNamespace = null;
        var rootCounter = 1;

        for (var q = 0; q < rootNodes.length; q++) {
            var rootNode = rootNodes[q];
            
            // --- Lógica de Agrupamiento por Namespace ---
            if (formatOptions && formatOptions.groupNamespaces && rootNode._project) {
                var projectParts = rootNode._project.split('/');
                var lastParts = lastNamespace ? lastNamespace.split('/') : [];
                
                var diffIndex = 0;
                while (diffIndex < projectParts.length && diffIndex < lastParts.length && projectParts[diffIndex] === lastParts[diffIndex]) {
                    diffIndex++;
                }
                
                // Empezar a imprimir desde la primera diferencia, pero SIEMPRE omitir el índice 0 (proyecto raíz)
                var startIndex = Math.max(diffIndex, 1);
                
                for (var i = startIndex; i < projectParts.length; i++) {
                    var currentPart = projectParts[i];
                    if (currentPart) {
                        var capitalizedPart = currentPart.charAt(0).toUpperCase() + currentPart.slice(1);
                        result += '# ' + capitalizedPart + '\n\n';
                    }
                }
                
                lastNamespace = rootNode._project;
            }
            // ------------------------------------------

            try {
                var nodeType = rootNode.type || self.getNodeType(rootNode.title);
                var numberingPath = (formatOptions && formatOptions.useAcademicNumbering) ? [rootCounter++] : [];

                if (nodeType === 'QUE') {
                    // Renderizado específico de QUE
                    var qTitle = self.cleanText((rootNode.title || '').replace('[[QUE]] - ', ''));
                    var displayTitleQ = qTitle;
                    if (!(formatOptions && formatOptions.hideNodeLabels)) displayTitleQ = '[[QUE]] - ' + displayTitleQ;
                    if (formatOptions && formatOptions.useAcademicNumbering) displayTitleQ = numberingPath.join('.') + '. ' + displayTitleQ;
                    
                    result += '## ' + displayTitleQ + '\n\n';

                    // Metadata — SKIP en modo esqueleto
                    var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
                    if (includeProj) {
                        result += self.renderMetadata(rootNode.project_metadata || {}, flatMode);
                    }

                    // Contenido QUE — SKIP en modo esqueleto
                    if (config.QUE && !skeletonMode) {
                        var queContent = self.extractNodeContent(rootNode.data || rootNode, true, 'QUE', excludeBitacora, flatMode, formatOptions);
                        if (queContent) result += queContent + '\n';
                    }

                    var hasClms = rootNode.related_clms && rootNode.related_clms.length > 0;
                    var hasDirectEvds = rootNode.direct_evds && rootNode.direct_evds.length > 0;

                    // Mensaje informativo — SKIP en modo esqueleto
                    if (!hasClms && !hasDirectEvds) {
                        if (!skeletonMode) {
                            result += '*No se encontraron respuestas relacionadas con esta pregunta.*\n\n';
                        }
                        continue;
                    }

                    var childCounter = 1;
                    
                    // CLMs respondidos (recursión desde nivel 3)
                    if (rootNode.related_clms) {
                        for (var c = 0; c < rootNode.related_clms.length; c++) {
                            var childNumC = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounter++]) : [];
                            result += self.renderNodeTree(rootNode.related_clms[c], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumC);
                        }
                    }

                    // EVDs directos de la pregunta (nivel 3)
                    if (rootNode.direct_evds) {
                        for (var d = 0; d < rootNode.direct_evds.length; d++) {
                            var childNumD = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounter++]) : [];
                            result += self.renderNodeTree(rootNode.direct_evds[d], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumD);
                        }
                    }

                } else if (nodeType === 'GRI') {
                    // Renderizado de GRI como nodo raíz
                    var gTitle = self.cleanText((rootNode.title || '').replace('[[GRI]] - ', ''));
                    var displayTitleG = gTitle;
                    if (!(formatOptions && formatOptions.hideNodeLabels)) displayTitleG = '[[GRI]] - ' + displayTitleG;
                    if (formatOptions && formatOptions.useAcademicNumbering) displayTitleG = numberingPath.join('.') + '. ' + displayTitleG;

                    result += '## ' + displayTitleG + '\n\n';

                    // Metadata — SKIP en modo esqueleto
                    var includeProj = (formatOptions && formatOptions.includeProjectMetadata !== undefined) ? formatOptions.includeProjectMetadata : !skeletonMode;
                    if (includeProj) {
                        result += self.renderMetadata(rootNode.project_metadata || {}, flatMode);
                    }

                    // Contenido GRI — SKIP en modo esqueleto
                    if (config.GRI && !skeletonMode) {
                        var griContent = self.extractNodeContent(rootNode.data || rootNode, true, 'GRI', excludeBitacora, flatMode, formatOptions);
                        if (griContent) result += griContent + '\n';
                    }

                    var childCounterG = 1;
                    
                    // Nodos contenidos (recursión desde nivel 3)
                    if (rootNode.contained_nodes && rootNode.contained_nodes.length > 0) {
                        for (var cn = 0; cn < rootNode.contained_nodes.length; cn++) {
                            var childNumCN = (formatOptions && formatOptions.useAcademicNumbering) ? numberingPath.concat([childCounterG++]) : [];
                            result += self.renderNodeTree(rootNode.contained_nodes[cn], allNodes, 3, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, childNumCN);
                        }
                    } else if (!skeletonMode) {
                        result += '*No se encontraron nodos contenidos en este grupo.*\n\n';
                    }

                } else {
                    // Fallback: renderizar con renderNodeTree genérico
                    result += self.renderNodeTree(rootNode.uid, allNodes, 2, config, excludeBitacora, flatMode, {}, skeletonMode, formatOptions, numberingPath);
                }

            } catch (err) {
                if (!skeletonMode) {
                    result += '*Error procesando nodo: ' + err + '*\n\n';
                }
            }
        }

        return result;
    },

    // --- Generación de Markdown para una sola pregunta ---
    generateQuestionMarkdown: function (question, allNodes, config, excludeBitacora) {
        // Reutilizar generateMarkdown con un array de una sola pregunta
        var result = this.generateMarkdown([question], allNodes, config, excludeBitacora, false);
        // Quitar el header principal ya que es una sola pregunta
        return result.replace('# Estructura de Investigación\n\n', '');
    }
};


// --- MODULE: src/core/html/htmlStyles.js ---
// ============================================================================
// HTML: Styles
// CSS embebido para el HTML exportado
// ============================================================================

DiscourseGraphToolkit.HtmlStyles = {
    getCSS: function () {
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
    }
};


// --- MODULE: src/ui/styles.js ---
// ============================================================================
// UI: Base Styles (Claude-Inspired Minimalism)
// ============================================================================

DiscourseGraphToolkit.injectBaseStyles = function () {
    const styleId = 'dgt-base-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        :root {
            /* Color palette - Claude-inspired Minimalist */
            --dgt-bg-primary: #fbfaf8;
            --dgt-bg-secondary: #f3f1eb;
            --dgt-bg-tertiary: #ebe8e0;
            --dgt-border-color: #e5e3dc;
            --dgt-border-focus: #b5b3ad;

            /* Text colors */
            --dgt-text-primary: #2d2c2b;
            --dgt-text-secondary: #6b6a68;
            --dgt-text-muted: #999793;

            /* Accent colors */
            --dgt-accent-blue: #000000;
            --dgt-accent-green: #377d61;
            --dgt-accent-red: #bb4f43;
            --dgt-accent-yellow: #a87e27;
            --dgt-accent-purple: #6c5c99;

            /* Shadows */
            --dgt-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.02);
            --dgt-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.04);
            --dgt-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.06);

            /* Spacing */
            --dgt-spacing-xs: 6px;
            --dgt-spacing-sm: 12px;
            --dgt-spacing-md: 20px;
            --dgt-spacing-lg: 32px;

            /* Border radius */
            --dgt-radius-sm: 6px;
            --dgt-radius-md: 8px;
            --dgt-radius-lg: 12px;

            /* Transitions */
            --dgt-transition-fast: 150ms ease;
            --dgt-transition-normal: 250ms ease;
        }

        /* Modal Container Override */
        #discourse-graph-toolkit-modal > div > div {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: var(--dgt-bg-primary) !important;
            color: var(--dgt-text-primary) !important;
            box-shadow: var(--dgt-shadow-lg) !important;
            border: 1px solid var(--dgt-border-color) !important;
        }

        #discourse-graph-toolkit-modal h2, 
        #discourse-graph-toolkit-modal h3, 
        #discourse-graph-toolkit-modal h4 {
            font-family: 'Lora', 'Georgia', serif !important;
            font-weight: 500 !important;
            color: var(--dgt-text-primary) !important;
        }

        /* Buttons */
        .dgt-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--dgt-spacing-sm);
            padding: 8px 16px;
            font-size: 0.8125rem;
            font-weight: 500;
            border: 1px solid transparent;
            border-radius: var(--dgt-radius-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            font-family: inherit;
        }
        .dgt-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .dgt-btn-primary {
            background: var(--dgt-accent-blue);
            color: white;
        }
        .dgt-btn-primary:hover:not(:disabled) {
            background: #2d2c2b;
        }
        .dgt-btn-secondary {
            background: transparent;
            color: var(--dgt-text-primary);
            border: 1px solid var(--dgt-border-color);
        }
        .dgt-btn-secondary:hover:not(:disabled) {
            background: var(--dgt-bg-secondary);
        }
        .dgt-btn-ghost {
            background: transparent;
            color: var(--dgt-text-secondary);
            padding: var(--dgt-spacing-xs) var(--dgt-spacing-sm);
        }
        .dgt-btn-ghost:hover:not(:disabled) {
            color: var(--dgt-text-primary);
            background: var(--dgt-bg-secondary);
        }

        /* Badges */
        .dgt-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            border-radius: 12px;
            border: 1px solid transparent;
            cursor: default;
        }
        .dgt-badge.clickable { cursor: pointer; }
        .dgt-badge.active { border-color: currentColor; }
        
        .dgt-badge-success {
            background: rgba(55, 125, 97, 0.1);
            color: var(--dgt-accent-green);
        }
        .dgt-badge-error {
            background: rgba(187, 79, 67, 0.1);
            color: var(--dgt-accent-red);
        }
        .dgt-badge-warning {
            background: rgba(168, 126, 39, 0.1);
            color: var(--dgt-accent-yellow);
        }
        .dgt-badge-info {
            background: rgba(108, 92, 153, 0.1);
            color: var(--dgt-accent-purple);
        }
        .dgt-badge-neutral {
            background: var(--dgt-bg-tertiary);
            color: var(--dgt-text-secondary);
            border-color: var(--dgt-border-color);
        }

        /* Accordion / Hierarchy Lists */
        .dgt-accordion-item {
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
            overflow: hidden;
        }
        .dgt-accordion-header {
            padding: 10px 14px;
            background: transparent;
            border-bottom: 1px solid var(--dgt-border-color);
            display: flex;
            align-items: center;
            gap: var(--dgt-spacing-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
        }
        .dgt-accordion-header:hover {
            background: var(--dgt-bg-secondary);
        }
        .dgt-accordion-header.depth-0 {
            background: var(--dgt-bg-primary);
            font-weight: 600;
        }
        .dgt-accordion-header.depth-1, .dgt-accordion-header.depth-odd {
            background: #ffffff;
        }
        .dgt-accordion-header.depth-even {
            background: var(--dgt-bg-primary);
        }

        /* Popovers */
        .dgt-popover {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: var(--dgt-spacing-sm);
            background: #ffffff;
            border-radius: var(--dgt-radius-md);
            box-shadow: var(--dgt-shadow-lg);
            border: 1px solid var(--dgt-border-color);
            z-index: 1000;
            min-width: 20rem;
            max-width: 32rem;
            max-height: 24rem;
            overflow-y: auto;
        }
        .dgt-popover-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--dgt-border-color);
            font-weight: 600;
            font-size: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: #ffffff;
            z-index: 10;
        }
        .dgt-popover-item {
            padding: 10px 12px;
            border-bottom: 1px solid var(--dgt-border-color);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.75rem;
            color: var(--dgt-text-primary);
        }
        .dgt-popover-item:last-child { border-bottom: none; }
        .dgt-popover-item:hover { background: var(--dgt-bg-secondary); }

        /* Forms */
        .dgt-input {
            width: 100%;
            padding: 6px 12px;
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            color: var(--dgt-text-primary);
            font-size: 0.8125rem;
            transition: var(--dgt-transition-fast);
            font-family: inherit;
        }
        .dgt-input:focus {
            outline: none;
            border-color: var(--dgt-border-focus);
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
        }

        /* General Layout */
        .dgt-container { display: flex; flex-direction: column; height: 100%; }

        /* Utility Classes - Layout */
        .dgt-flex-row { display: flex; align-items: center; }
        .dgt-flex-column { display: flex; flex-direction: column; }
        .dgt-flex-between { display: flex; align-items: center; justify-content: space-between; }
        .dgt-flex-wrap { flex-wrap: wrap; }
        .dgt-gap-xs { gap: var(--dgt-spacing-xs); }
        .dgt-gap-sm { gap: var(--dgt-spacing-sm); }
        .dgt-gap-md { gap: var(--dgt-spacing-md); }
        .dgt-gap-lg { gap: var(--dgt-spacing-lg); }

        /* Utility Classes - Spacing */
        .dgt-mb-0 { margin-bottom: 0 !important; }
        .dgt-mb-sm { margin-bottom: var(--dgt-spacing-sm); }
        .dgt-mb-md { margin-bottom: var(--dgt-spacing-md); }
        .dgt-mb-lg { margin-bottom: var(--dgt-spacing-lg); }
        .dgt-mt-sm { margin-top: var(--dgt-spacing-sm); }
        .dgt-mr-xs { margin-right: var(--dgt-spacing-xs); }
        .dgt-p-sm { padding: var(--dgt-spacing-sm); }
        .dgt-p-md { padding: var(--dgt-spacing-md); }

        /* Utility Classes - Typography */
        .dgt-text-sm { font-size: 0.8125rem; }
        .dgt-text-xs { font-size: 0.75rem; }
        .dgt-text-primary { color: var(--dgt-text-primary); }
        .dgt-text-secondary { color: var(--dgt-text-secondary); }
        .dgt-text-muted { color: var(--dgt-text-muted); }
        .dgt-text-success { color: var(--dgt-accent-green); }
        .dgt-text-error { color: var(--dgt-accent-red); }
        .dgt-text-warning { color: var(--dgt-accent-yellow); }
        .dgt-text-bold { font-weight: 600; }
        .dgt-text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Tree View Container */
        .dgt-tree-container {
            height: 100%;
            max-height: 28rem;
            overflow-y: auto;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            background-color: var(--dgt-bg-primary);
        }

        /* Tree Depth Guide Lines */
        .dgt-tree-guide {
            border-left: 2px solid var(--dgt-border-color);
            margin-left: 0.5rem;
            padding-left: 0.5rem;
        }

        /* Summary Bar */
        .dgt-summary-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: var(--dgt-spacing-sm);
            padding: 8px 14px;
            background: var(--dgt-bg-secondary);
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
        }

        /* Form Layout */
        .dgt-form-group {
            display: flex;
            gap: var(--dgt-spacing-sm);
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: var(--dgt-spacing-sm);
        }
        .dgt-form-label {
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--dgt-text-primary);
            white-space: nowrap;
        }

        /* Panels / Cards */
        .dgt-panel {
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            padding: 12px;
            background: #ffffff;
        }
        .dgt-panel-header {
            margin: 0 0 12px 0;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--dgt-text-primary);
        }

        .dgt-card {
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
            box-shadow: var(--dgt-shadow-sm);
            transition: var(--dgt-transition-fast);
        }
        .dgt-card:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
        }
        .dgt-card-body {
            padding: var(--dgt-spacing-sm) var(--dgt-spacing-md);
        }

        .dgt-list-container {
            max-height: 40rem;
            overflow-y: auto;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            background-color: #ffffff;
        }

        /* Panoramic Specific Utilities */
        .dgt-panoramic-root {
            border-left: 3px solid var(--dgt-border-color);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
            background-color: var(--dgt-bg-primary);
            transition: var(--dgt-transition-fast);
            margin-bottom: var(--dgt-spacing-sm);
            padding-left: var(--dgt-spacing-sm);
        }
        .dgt-panoramic-root:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
            background-color: #ffffff;
        }
        .dgt-panoramic-root-que { border-left-color: var(--dgt-accent-blue); }
        .dgt-panoramic-root-gri { border-left-color: var(--dgt-accent-purple); }
        
        .dgt-panoramic-node-row {
            display: flex;
            align-items: flex-start;
            padding: 4px;
            margin-left: -4px;
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            border-radius: var(--dgt-radius-sm);
            line-height: 1.4;
        }
        .dgt-panoramic-node-row.has-children:hover {
            background-color: var(--dgt-bg-secondary);
        }
        
        .dgt-panoramic-branch-line {
            border-left: 1px solid var(--dgt-border-color);
            margin-left: 1rem;
            padding-left: 0.5rem;
            padding-top: 0.125rem;
        }

        /* Panoramic Sub-Project Group */
        .dgt-panoramic-group {
            border: 1px solid var(--dgt-border-color);
            border-left: 3px solid var(--dgt-accent-purple);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
            background-color: var(--dgt-bg-primary);
            transition: var(--dgt-transition-fast);
            margin-bottom: var(--dgt-spacing-sm);
        }
        .dgt-panoramic-group:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
            border-left-color: var(--dgt-accent-purple);
        }
        .dgt-panoramic-group-header {
            display: flex;
            align-items: center;
            padding: 8px 10px;
            cursor: pointer;
            gap: 8px;
            transition: var(--dgt-transition-fast);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
        }
        .dgt-panoramic-group-header:hover {
            background-color: var(--dgt-bg-secondary);
        }
        .dgt-panoramic-group-body {
            border-top: 1px solid var(--dgt-border-color);
            padding: 4px 8px 8px 8px;
            background: #ffffff;
        }
        .dgt-panoramic-group-nav {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 6px;
            font-size: 0.6875rem;
            color: var(--dgt-text-muted);
            background: transparent;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            flex-shrink: 0;
        }
        .dgt-panoramic-group-nav:hover {
            color: var(--dgt-text-primary);
            background: var(--dgt-bg-secondary);
            border-color: var(--dgt-border-focus);
        }

        /* Scrollbars */
        .dgt-scrollable::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .dgt-scrollable::-webkit-scrollbar-track {
            background: transparent;
        }
        .dgt-scrollable::-webkit-scrollbar-thumb {
            background: var(--dgt-border-color);
            border-radius: 4px;
        }
        .dgt-scrollable::-webkit-scrollbar-thumb:hover {
            background: var(--dgt-text-muted);
        }
    `;
    document.head.appendChild(style);
};

// Auto-inyectar al cargar
if (document.readyState === 'complete') {
    DiscourseGraphToolkit.injectBaseStyles();
} else {
    window.addEventListener('load', () => DiscourseGraphToolkit.injectBaseStyles());
}


// --- MODULE: src/core/html/htmlHelpers.js ---
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


// --- MODULE: src/core/html/htmlNodeRenderers.js ---
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

        // Hijos: Nodos contenidos (para GRI vía #Contains)
        if (node.contained_nodes && node.contained_nodes.length > 0) {
            html += '<div class="contained-nodes">';
            for (let cn = 0; cn < node.contained_nodes.length; cn++) {
                const cnId = parentId ? `${parentId}_cn${cn}` : '';
                html += this.renderNode(node.contained_nodes[cn], allNodes, config, excludeBitacora, depth + 1, visited, cnId, skeletonMode, includeProjectMetadata);
            }
            html += '</div>';
        }

        // Mensaje — SKIP en modo esqueleto
        if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds && !skeletonMode) {
            html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
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

        if (!hasClms && !hasDirectEvds) {
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

        // Nodos contenidos (vía #Contains)
        const hasContained = rootNode.contained_nodes && rootNode.contained_nodes.length > 0;

        if (!hasContained) {
            if (!skeletonMode) {
                html += '<p class="error-message">No se encontraron nodos contenidos en este grupo.</p>';
            }
            html += '</div></div>';
            return html;
        }

        // Renderizar cada nodo contenido (recursión desde profundidad 3)
        for (let j = 0; j < rootNode.contained_nodes.length; j++) {
            const cnId = `r${qIndex}_cn${j}`;
            html += this.renderNode(rootNode.contained_nodes[j], allNodes, config, excludeBitacora, 3, {}, cnId, skeletonMode, includeProjectMetadata);
        }

        html += `</div></div>`;
        return html;
    }
};



// --- MODULE: src/core/htmlGenerator.js ---
// ============================================================================
// CORE: HTML Generator
// Orquestador para generación de HTML exportado
// Usa: HtmlStyles, HtmlHelpers, HtmlNodeRenderers
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {

    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", contentConfig = true, excludeBitacora = true, skeletonMode = false, includeProjectMetadata = true) {
        // Compatibilidad legacy: si contentConfig es boolean, convertir a objeto
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { GRI: contentConfig, QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

        const css = DiscourseGraphToolkit.HtmlStyles.getCSS();
        const js = this._getJS();
        const safeTitle = DiscourseGraphToolkit.EpubGenerator.escapeHtml(title);

        // Header del documento
        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    ${css}
</head>
<body>
    <h1>${safeTitle}</h1>
    
    <div class="controls">
        <button id="expandAll" class="btn">Expandir Todo</button>
        <button id="collapseAll" class="btn">Contraer Todo</button>
        <button id="copyAll" class="btn btn-copy">Copiar Texto</button>
        <button id="exportMarkdown" class="btn btn-export">Exportar Markdown</button>
    </div>
`;

        // Renderizar cada nodo raíz (GRI o QUE)
        for (let i = 0; i < questions.length; i++) {
            try {
                const rootNode = questions[i];
                const nodeType = rootNode.type || DiscourseGraphToolkit.getNodeType(rootNode.title);

                if (nodeType === 'GRI') {
                    html += DiscourseGraphToolkit.HtmlNodeRenderers.renderRootNode(
                        rootNode, i, allNodes, config, excludeBitacora, skeletonMode, includeProjectMetadata
                    );
                } else {
                    html += DiscourseGraphToolkit.HtmlNodeRenderers.renderQuestion(
                        rootNode, i, allNodes, config, excludeBitacora, skeletonMode, includeProjectMetadata
                    );
                }
            } catch (e) {
                console.error(`Error procesando nodo raíz ${i}: ${e}`);
                html += `<div class="error-message">Error procesando nodo: ${e}</div>`;
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
                    contained_nodes: node.contained_nodes,
                    related_clms: node.related_clms,
                    direct_evds: node.direct_evds,
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


// --- MODULE: src/core/markdownGenerator.js ---
// ============================================================================
// CORE: Markdown Generator
// Wrapper que usa MarkdownCore para mantener la interfaz pública
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, flatMode = false, skeletonMode = false, formatOptions = {}) {
        // Delegar completamente a MarkdownCore
        return MarkdownCore.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, flatMode, skeletonMode, formatOptions);
    },

    // Convenience wrapper for flat markdown export (EPUB-ready)
    generateFlatMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, skeletonMode = false, formatOptions = {}) {
        return this.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, true, skeletonMode, formatOptions);
    }
};


// --- MODULE: src/core/epubGenerator.js ---
// ============================================================================
// CORE: EPUB Generator
// Generates EPUB files directly in the browser using JSZip
// ============================================================================

DiscourseGraphToolkit.EpubGenerator = {
    // JSZip will be loaded dynamically
    JSZip: null,

    // Shared helper: detect heading level from a markdown line
    _getHeadingLevel: function (line) {
        const match = line.match(/^(#{2,})\s/);
        return match ? match[1].length : 0;
    },

    // Shared helper: increment counters and return hierarchy string (e.g., "1.2.3 ")
    _getHierarchyPrefix: function (counters, level) {
        const index = level - 1;
        counters[index]++;
        for (let i = index + 1; i < counters.length; i++) {
            counters[i] = 0;
        }
        return counters.slice(1, index + 1).join('.') + ' ';
    },

    // Load JSZip from CDN if not already loaded
    loadJSZip: async function () {
        if (this.JSZip) return this.JSZip;
        if (window.JSZip) {
            this.JSZip = window.JSZip;
            return this.JSZip;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                this.JSZip = window.JSZip;
                resolve(this.JSZip);
            };
            script.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(script);
        });
    },

    // Convert flat markdown to EPUB
    generateEpub: async function (flatMarkdown, metadata = {}) {
        const JSZip = await this.loadJSZip();
        const zip = new JSZip();

        const title = metadata.title || 'Discourse Graph Export';
        const author = metadata.author || 'Discourse Graph Toolkit';
        const date = new Date().toISOString().split('T')[0];
        const uuid = 'urn:uuid:' + this.generateUUID();

        // Parse markdown into chapters
        const chapters = this.parseMarkdownToChapters(flatMarkdown);

        // Create EPUB structure
        // 1. mimetype (must be first and uncompressed)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

        // 2. META-INF/container.xml
        zip.file('META-INF/container.xml', this.createContainerXml());

        // 3. OEBPS/content.opf (package file)
        zip.file('OEBPS/content.opf', this.createContentOpf(title, author, date, uuid, chapters));

        // 4. OEBPS/toc.ncx (navigation)
        zip.file('OEBPS/toc.ncx', this.createTocNcx(title, uuid, chapters));

        // 5. OEBPS/nav.xhtml (EPUB3 navigation)
        zip.file('OEBPS/nav.xhtml', this.createNavXhtml(title, chapters));

        // 6. OEBPS/styles.css
        zip.file('OEBPS/styles.css', this.createStylesCss());

        // 7. OEBPS/chapter files
        chapters.forEach((chapter, index) => {
            zip.file(`OEBPS/chapter${index + 1}.xhtml`, this.createChapterXhtml(chapter, index + 1));
        });

        // Generate the zip file
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/epub+zip',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        return blob;
    },

    // Parse flat markdown into chapters based on ## headings (QUE nodes)
    parseMarkdownToChapters: function (markdown) {
        const chapters = [];
        const lines = markdown.split('\n');
        let currentChapter = null;

        // Use a counter tracker exactly like markdownToXhtml to build IDs for ToC
        let counters = new Array(12).fill(0);

        const getHierarchyPrefix = (level) => this._getHierarchyPrefix(counters, level);
        const getHeadingLevel = this._getHeadingLevel;

        for (const line of lines) {
            // H1 is the main title, skip it
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                continue;
            }

            // H2 (##) starts a new chapter (QUE)
            if (line.startsWith('## ')) {
                if (currentChapter) {
                    chapters.push(currentChapter);
                }
                const rawTitle = line.replace(/^##\s*/, '');
                counters[0] = 0; // NOT USED
                counters[1]++; // chapterNum
                for (let i = 2; i < counters.length; i++) counters[i] = 0; // reset lower

                currentChapter = {
                    title: this.cleanTitle(rawTitle),
                    nodeType: this.extractNodeType(rawTitle),
                    level: 2,
                    content: [],
                    id: `node-${counters[1]}`, // H2 anchor
                    numberPrefix: `${counters[1]}. `,
                    subItems: []
                };
            } else if (currentChapter) {
                currentChapter.content.push(line);

                // Track subheadings for ToC (any level >= 3)
                const trimmed = line.trim();
                const headingLevel = getHeadingLevel(trimmed);
                if (headingLevel >= 3) {
                    const prefix = getHierarchyPrefix(headingLevel);
                    const hashPattern = new RegExp('^#{' + headingLevel + '}\\s*');
                    currentChapter.subItems.push({
                        level: headingLevel,
                        title: this.cleanTitle(trimmed.replace(hashPattern, '')),
                        id: `node-${counters.slice(1, headingLevel).join('-')}`,
                        numberPrefix: prefix
                    });
                }
            }
        }

        if (currentChapter) {
            chapters.push(currentChapter);
        }

        return chapters;
    },

    // Detect node type from title
    extractNodeType: function (title) {
        if (title.indexOf('[[QUE]]') !== -1) return 'QUE';
        if (title.indexOf('[[CLM]]') !== -1) return 'CLM';
        if (title.indexOf('[[EVD]]') !== -1) return 'EVD';
        return null;
    },

    // Clean title from Roam markup
    cleanTitle: function (title) {
        return title
            .replace(/\[\[QUE\]\]\s*-\s*/g, '')
            .replace(/\[\[CLM\]\]\s*-\s*/g, '')
            .replace(/\[\[EVD\]\]\s*-\s*/g, '')
            .replace(/\[\[([^\]]+)\]\]/g, '$1')
            .trim();
    },

    // Convert markdown content to XHTML
    markdownToXhtml: function (lines, chapterNum) {
        let html = '';
        let inParagraph = false;

        // Counters array extended to support deep heading levels
        // Index 0 is unused, index 1 is H2, index 2 is H3, etc.
        let counters = new Array(12).fill(0);
        counters[1] = chapterNum;

        const getHierarchyPrefix = (level) => this._getHierarchyPrefix(counters, level);
        const getHeadingLevel = this._getHeadingLevel;

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                if (inParagraph) {
                    html += '</p>\n';
                    inParagraph = false;
                }
                continue;
            }

            // Headers - detect any heading level >= 3 dynamically
            const headingLevel = getHeadingLevel(trimmed);
            if (headingLevel >= 3) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const prefix = getHierarchyPrefix(headingLevel);
                const nodeType = this.extractNodeType(trimmed) || (headingLevel <= 4 ? 'CLM' : 'EVD');
                const hashPattern = new RegExp('^#{' + headingLevel + '}\\s*');
                const cleanText = this.processInlineMarkdown(this.cleanTitle(trimmed.replace(hashPattern, '')));
                const id = `node-${counters.slice(1, headingLevel).join('-')}`;
                // Use h3-h5 for valid XHTML, cap at h5 for deeper levels
                const hTag = `h${Math.min(headingLevel, 5)}`;
                const depthClass = headingLevel > 5 ? ` class="depth-${headingLevel}"` : '';
                html += `<${hTag} id="${id}"${depthClass}>${prefix}[${nodeType}] ${cleanText}</${hTag}>\n`;
            } else {
                // Detectar bloque estructural: *— texto —*
                const isStructuralBlock = /^\*—\s.+\s—\*$/.test(trimmed);
                if (isStructuralBlock) {
                    if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                    html += `<p class="structural-block">${this.processInlineMarkdown(trimmed)}</p>\n`;
                } else {
                    // Regular paragraph
                    const cleanedLine = this.processInlineMarkdown(trimmed);
                    if (!inParagraph) {
                        html += '<p>';
                        inParagraph = true;
                    } else {
                        html += '<br/>\n';
                    }
                    html += cleanedLine;
                }
            }
        }

        if (inParagraph) {
            html += '</p>\n';
        }

        return html;
    },

    // Process inline markdown (bold, links, etc.)
    processInlineMarkdown: function (text) {
        let result = this.escapeHtml(text);
        // Bold **text**
        result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic *text*
        result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Clean Roam references [[text]]
        result = result.replace(/\[\[([^\]]+)\]\]/g, '$1');
        // Clean Roam block references ((uid))
        result = result.replace(/\(\([a-zA-Z0-9_-]+\)\)/g, '');
        return result;
    },

    escapeHtml: function (text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Strip markdown formatting for plain text contexts (titles, TOC)
    stripMarkdown: function (text) {
        return text
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text** → text
            .replace(/\*([^*]+)\*/g, '$1')       // Remove italic *text* → text
            .replace(/\[\[([^\]]+)\]\]/g, '$1'); // Remove [[links]] → links
    },

    generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // EPUB Structure Files
    createContainerXml: function () {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    },

    createContentOpf: function (title, author, date, uuid, chapters) {
        const manifestItems = chapters.map((_, i) =>
            `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
        ).join('\n');

        const spineItems = chapters.map((_, i) =>
            `    <itemref idref="chapter${i + 1}"/>`
        ).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${this.escapeHtml(title)}</dc:title>
    <dc:creator>${this.escapeHtml(author)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
${spineItems}
  </spine>
</package>`;
    },

    createTocNcx: function (title, uuid, chapters) {
        let playOrder = 1;

        const tocNavPoint = `
    <navPoint id="navpoint${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Tabla de Contenidos</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>`;
        playOrder++;

        let navPointsMarkup = '';
        chapters.forEach((chapter, i) => {
            const chapId = `navpoint${playOrder}`;
            const chapOrder = playOrder++;
            const chapTitle = this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)));
            const chapSrc = `chapter${i + 1}.xhtml`;

            navPointsMarkup += `
    <navPoint id="${chapId}" playOrder="${chapOrder}">
      <navLabel><text>${chapTitle}</text></navLabel>
      <content src="${chapSrc}"/>`;

            if (chapter.subItems && chapter.subItems.length > 0) {
                chapter.subItems.forEach((subItem) => {
                    const subId = `navpoint${playOrder}`;
                    const subOrder = playOrder++;
                    const subTitle = this.escapeHtml(this.stripMarkdown(subItem.title.substring(0, 80)));
                    navPointsMarkup += `
      <navPoint id="${subId}" playOrder="${subOrder}">
        <navLabel><text>${subItem.numberPrefix}${subTitle}</text></navLabel>
        <content src="${chapSrc}#${subItem.id}"/>
      </navPoint>`;
                });
            }

            navPointsMarkup += `
    </navPoint>`;
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeHtml(title)}</text></docTitle>
  <navMap>
${tocNavPoint}${navPointsMarkup}
  </navMap>
</ncx>`;
    },

    createNavXhtml: function (title, chapters) {
        const navItems = chapters.map((chapter, i) => {
            let itemHtml = `        <li><a href="chapter${i + 1}.xhtml">${chapter.numberPrefix}${this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)))}</a>`;
            if (chapter.subItems && chapter.subItems.length > 0) {
                itemHtml += `\n          <ol>\n`;
                chapter.subItems.forEach((subItem) => {
                    itemHtml += `            <li><a href="chapter${i + 1}.xhtml#${subItem.id}">${subItem.numberPrefix}${this.escapeHtml(this.stripMarkdown(subItem.title.substring(0, 80)))}</a></li>\n`;
                });
                itemHtml += `          </ol>\n        `;
            }
            itemHtml += `</li>`;
            return itemHtml;
        }).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Tabla de Contenidos</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
    },

    createStylesCss: function () {
        return `body {
  font-family: Georgia, "Times New Roman", serif;
  margin: 1em;
  line-height: 1.6;
}

h1, h2, h3, h4, h5 {
  font-family: Helvetica, Arial, sans-serif;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; color: #2196F3; }
h3 { font-size: 1.3em; color: #4CAF50; }
h4 { font-size: 1.1em; color: #FF9800; }
h5 { font-size: 1em; color: #666; }

p {
  margin: 0.5em 0;
  text-align: justify;
}

strong { font-weight: bold; }
em { font-style: italic; }

.structural-block {
  margin-top: 1.2em;
  margin-bottom: 1.2em;
}

nav ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}

nav li {
  margin: 0.3em 0;
}`;
    },

    createChapterXhtml: function (chapter, chapterNum) {
        const content = this.markdownToXhtml(chapter.content, chapterNum);

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeHtml(this.stripMarkdown(chapter.title))}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2 id="node-${chapterNum}">${chapterNum}. [QUE] ${this.processInlineMarkdown(chapter.title)}</h2>
${content}
</body>
</html>`;
    }
};


// --- MODULE: src/ui/components/ProjectTreeView.js ---
// ============================================================================
// UI: ProjectTreeView Component
// Componente reutilizable para renderizar árboles jerárquicos de proyectos
// Usado por BranchesTab y ExportTab
// ============================================================================

DiscourseGraphToolkit.ProjectTreeView = function (props) {
    const React = window.React;
    const {
        tree,                    // Objeto { [key]: { project, children, ... } }
        renderNodeHeader,        // (node, key, depth, isExpanded, toggleFn) => React.Element
        renderNodeContent,       // (node, depth) => React.Element | null
        defaultExpanded = true   // Si los nodos inician expandidos
    } = props;

    // --- Estado de nodos expandidos ---
    const [expandedNodes, setExpandedNodes] = React.useState({});

    // --- Toggle expand/collapse ---
    const toggleExpand = (nodePath) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodePath]: prev[nodePath] === undefined ? !defaultExpanded : !prev[nodePath]
        }));
    };

    const handleExpandAll = () => {
        const newExpanded = {};
        const traverse = (node) => {
            if (Object.keys(node.children || {}).length > 0) {
                newExpanded[node.project || node.project === null ? node.project : '(sin proyecto)'] = true;
                Object.values(node.children).forEach(traverse);
            }
        };
        Object.values(tree).forEach(traverse);
        setExpandedNodes(newExpanded);
    };

    const handleCollapseAll = () => {
        const newExpanded = {};
        const traverse = (node) => {
            if (Object.keys(node.children || {}).length > 0) {
                newExpanded[node.project || node.project === null ? node.project : '(sin proyecto)'] = false;
                Object.values(node.children).forEach(traverse);
            }
        };
        Object.values(tree).forEach(traverse);
        setExpandedNodes(newExpanded);
    };

    // --- Determinar si un nodo está expandido ---
    const isNodeExpanded = (nodePath) => {
        return expandedNodes[nodePath] === undefined ? defaultExpanded : expandedNodes[nodePath];
    };

    // --- Helper para ordenar las carpetas según el orden de la panorámica ---
    const sortKeys = (keys, parentProject, children) => {
        if (!parentProject) {
            return [...keys].sort();
        }
        const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(parentProject);
        if (savedGroupOrder && savedGroupOrder.length > 0) {
            return [...keys].sort((a, b) => {
                const pathA = children[a].project;
                const pathB = children[b].project;
                const indexA = savedGroupOrder.indexOf(pathA);
                const indexB = savedGroupOrder.indexOf(pathB);

                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;

                return a.localeCompare(b);
            });
        }
        return [...keys].sort();
    };

    // --- Render recursivo de nodo ---
    const renderNode = (node, key, depth) => {
        const isExpanded = isNodeExpanded(node.project);
        const hasChildren = Object.keys(node.children || {}).length > 0;

        return React.createElement('div', {
            key: key,
            style: { marginLeft: depth > 0 ? '1rem' : 0 }
        },
            // Header del nodo (personalizado por el tab)
            renderNodeHeader(node, key, depth, isExpanded, () => toggleExpand(node.project)),

            // Contenido cuando está expandido (con guía visual de profundidad)
            isExpanded && React.createElement('div', depth > 0 ? { className: 'dgt-tree-guide' } : null,
                // Contenido específico del nodo (preguntas, etc.)
                renderNodeContent && renderNodeContent(node, depth),
                // Hijos recursivos
                hasChildren && sortKeys(Object.keys(node.children), node.project, node.children).map(childKey =>
                    renderNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render principal ---
    return React.createElement('div', null,
        Object.keys(tree).length > 0 && React.createElement('div', { className: 'dgt-flex-row dgt-mb-xs', style: { justifyContent: 'flex-end', gap: '0.375rem', paddingBottom: '0.25rem' } },
            React.createElement('button', {
                onClick: handleExpandAll,
                className: 'dgt-btn dgt-btn-secondary dgt-text-xs',
                style: { padding: '2px 6px', fontSize: '0.6875rem' }
            }, '➕ Expandir Todo'),
            React.createElement('button', {
                onClick: handleCollapseAll,
                className: 'dgt-btn dgt-btn-secondary dgt-text-xs',
                style: { padding: '2px 6px', fontSize: '0.6875rem' }
            }, '➖ Colapsar Todo')
        ),
        sortKeys(Object.keys(tree), null, tree).map(projectKey =>
            renderNode(tree[projectKey], projectKey, 0)
        )
    );
};



// --- MODULE: src/ui/tabs/ProjectsTab.js ---
// ============================================================================
// UI: Projects Tab Component
// ============================================================================

DiscourseGraphToolkit.ProjectsTab = function () {
    const React = window.React;
    const {
        projects, setProjects,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        config, setConfig,
        templates, setTemplates,
        newProject, setNewProject,
        dismissedProjects, setDismissedProjects
    } = DiscourseGraphToolkit.useProjects();

    // Estado local para status de operaciones de proyectos (no compartido con ExportTab)
    const [projectsStatus, setProjectsStatus] = React.useState('');

    // --- Estado local para vista de árbol de proyectos ---
    const [expandedProjects, setExpandedProjects] = React.useState({});

    // --- Árbol jerárquico de proyectos (calculado) ---
    const projectTree = React.useMemo(() => {
        if (projects.length === 0) return {};
        return DiscourseGraphToolkit.buildSimpleProjectTree(projects);
    }, [projects]);

    // --- Toggle expandir/colapsar proyecto ---
    const toggleProjectExpand = (projectPath) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectPath]: !prev[projectPath]
        }));
    };

    const handleExpandAll = () => {
        setExpandedProjects({});
    };

    const handleCollapseAll = () => {
        const newExpanded = {};
        const traverse = (node) => {
            if (Object.keys(node.children).length > 0) {
                newExpanded[node.project] = false;
                Object.values(node.children).forEach(traverse);
            }
        };
        Object.values(projectTree).forEach(traverse);
        setExpandedProjects(newExpanded);
    };

    // --- Handlers Config ---
    const handleSaveConfig = async () => {
        try {
            DiscourseGraphToolkit.saveConfig(config);
            DiscourseGraphToolkit.saveTemplates(templates);
            DiscourseGraphToolkit.saveProjects(projects);

            const syncResult = await DiscourseGraphToolkit.syncProjectsToRoam(projects);
            const saveResult = await DiscourseGraphToolkit.saveConfigToRoam(config, templates);

            if (syncResult && syncResult.success !== false && saveResult) {
                DiscourseGraphToolkit.showToast('Configuración guardada y sincronizada en Roam.', 'success');
            } else {
                console.warn("Sync result:", syncResult, "Save result:", saveResult);
                DiscourseGraphToolkit.showToast('Guardado localmente, pero hubo advertencias al sincronizar con Roam.', 'warning');
            }
        } catch (e) {
            console.error("Error saving config:", e);
            DiscourseGraphToolkit.showToast('Error al guardar configuración: ' + e.message, 'error');
        }
    };

    const handleExportConfig = () => {
        DiscourseGraphToolkit.exportConfig();
        DiscourseGraphToolkit.showToast('Configuración exportada.', 'success');
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (DiscourseGraphToolkit.importConfig(event.target.result)) {
                        setConfig(DiscourseGraphToolkit.getConfig());
                        setTemplates(DiscourseGraphToolkit.getTemplates());
                        setProjects(DiscourseGraphToolkit.getProjects());
                        DiscourseGraphToolkit.showToast('Configuración importada correctamente.', 'success');
                    } else {
                        DiscourseGraphToolkit.showToast('Error al importar configuración.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Handlers Proyectos ---
    const handleAddProject = async () => {
        if (newProject && !projects.includes(newProject)) {
            const updated = [...projects, newProject].sort();
            setProjects(updated);
            setNewProject('');
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleRemoveProject = async (p) => {
        const updated = projects.filter(x => x !== p);
        setProjects(updated);
        DiscourseGraphToolkit.saveProjects(updated);

        // Agregar a ignorados para que initializeProjectsSync no lo re-agregue
        DiscourseGraphToolkit.addToDismissedProjects([p]);
        setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());

        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const handleBulkDeleteProjects = async () => {
        const toDelete = Object.keys(selectedProjectsForDelete).filter(k => selectedProjectsForDelete[k]);
        if (toDelete.length === 0) return;

        const updated = projects.filter(p => !selectedProjectsForDelete[p]);
        setProjects(updated);
        setSelectedProjectsForDelete({});
        DiscourseGraphToolkit.saveProjects(updated);

        // Agregar a ignorados para que initializeProjectsSync no los re-agregue
        DiscourseGraphToolkit.addToDismissedProjects(toDelete);
        setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());

        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const toggleSelectAllProjects = () => {
        const allSelected = projects.every(p => selectedProjectsForDelete[p]);
        const newSelection = {};
        projects.forEach(p => newSelection[p] = !allSelected);
        setSelectedProjectsForDelete(newSelection);
    };

    const handleValidate = async () => {
        setProjectsStatus("Validando proyectos...");
        try {
            const val = await DiscourseGraphToolkit.validateProjectsInGraph(projects);
            setValidation(val);
            const notFoundCount = Object.values(val).filter(v => v === false).length;
            if (notFoundCount > 0) {
                DiscourseGraphToolkit.showToast(`Validación completada. ${notFoundCount} proyecto(s) no encontrados.`, 'warning');
            } else {
                DiscourseGraphToolkit.showToast('Validación completada. Todos los proyectos encontrados.', 'success');
            }
        } catch (e) {
            console.error('Error validating projects:', e);
            DiscourseGraphToolkit.showToast('Error al validar proyectos: ' + e.message, 'error');
        } finally {
            setProjectsStatus('');
        }
    };

    const handleScanProjects = async () => {
        setIsScanning(true);
        try {
            const found = await DiscourseGraphToolkit.discoverProjectsInGraph();
            const newSuggestions = found.filter(p => !projects.includes(p));
            setSuggestions(newSuggestions);
            if (newSuggestions.length === 0) {
                DiscourseGraphToolkit.showToast("No se encontraron nuevos proyectos.", "info");
            } else {
                DiscourseGraphToolkit.showToast(`Se encontraron ${newSuggestions.length} proyectos nuevos.`, "success");
            }
        } catch (e) {
            console.error(e);
            DiscourseGraphToolkit.showToast("Error al buscar proyectos.", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleForceSync = async () => {
        setProjectsStatus("Sincronizando...");
        try {
            await DiscourseGraphToolkit.initializeProjectsSync();
            setProjects(DiscourseGraphToolkit.getProjects());
            DiscourseGraphToolkit.showToast("Sincronización completada.", "success");
        } catch (e) {
            DiscourseGraphToolkit.showToast("Error en sincronización.", "error");
        } finally {
            setProjectsStatus('');
        }
    };

    const handleAddSuggestion = async (proj) => {
        if (!projects.includes(proj)) {
            const updated = [...projects, proj].sort();
            setProjects(updated);
            setSuggestions(suggestions.filter(s => s !== proj));
            
            // Si estaba en ignorados, lo sacamos
            if (dismissedProjects.includes(proj)) {
                DiscourseGraphToolkit.removeFromDismissedProjects(proj);
                setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());
            }

            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleAddAllSuggestions = async () => {
        if (suggestions.length === 0) return;
        const toAdd = suggestions.filter(s => !projects.includes(s));
        if (toAdd.length === 0) return;
        const updated = [...new Set([...projects, ...toAdd])].sort();
        setProjects(updated);
        setSuggestions([]);
        
        // Limpiar de ignorados los añadidos
        const newlyAdded = toAdd.filter(p => dismissedProjects.includes(p));
        if (newlyAdded.length > 0) {
            newlyAdded.forEach(p => DiscourseGraphToolkit.removeFromDismissedProjects(p));
            setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());
        }

        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        DiscourseGraphToolkit.showToast(`Se añadieron ${toAdd.length} proyectos.`, 'success');
    };

    const handleSelectNotFound = () => {
        const notFound = projects.filter(p => validation[p] === false);
        if (notFound.length === 0) return;
        const newSelection = { ...selectedProjectsForDelete };
        notFound.forEach(p => newSelection[p] = true);
        setSelectedProjectsForDelete(newSelection);
        DiscourseGraphToolkit.showToast(`Se seleccionaron ${notFound.length} proyectos no encontrados.`, 'info');
    };

    // --- Render de nodo del árbol de proyectos (recursivo) ---
    const renderProjectTreeNode = (node, key, depth) => {
        const isExpanded = expandedProjects[node.project] !== false;
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjectsForDelete[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        // Obtener estado de validación: para hojas, mostrar directamente;
        // para nodos padre (namespaces), agregar estado de hijos descendientes
        let validationStatus = '';
        if (node.isLeaf && validation[node.project] !== undefined) {
            validationStatus = validation[node.project] ? '✅' : '⚠️';
        } else if (hasChildren && Object.keys(validation).length > 0) {
            // Para nodos padre: verificar si algún descendiente hoja no fue encontrado
            const leafDescendants = descendants.filter(p => validation[p] !== undefined);
            if (leafDescendants.length > 0) {
                const allFound = leafDescendants.every(p => validation[p] === true);
                const anyNotFound = leafDescendants.some(p => validation[p] === false);
                if (anyNotFound) validationStatus = '⚠️';
                else if (allFound) validationStatus = '✅';
            }
        }

        return React.createElement('div', { key: key, style: { marginLeft: depth > 0 ? '1rem' : 0 } },
            React.createElement('div', {
                className: 'dgt-flex-row dgt-text-sm',
                style: {
                    gap: '0.375rem',
                    padding: '0.375rem 0.5rem',
                    borderBottom: '1px solid var(--dgt-border-color)',
                    backgroundColor: depth === 0 ? 'var(--dgt-bg-secondary)' : 'transparent'
                }
            },
                // Expand/collapse toggle
                hasChildren && React.createElement('span', {
                    onClick: (e) => {
                        e.stopPropagation();
                        toggleProjectExpand(node.project);
                    },
                    style: { 
                        cursor: 'pointer', 
                        color: '#666', 
                        fontSize: '0.75rem', 
                        width: '1.5rem', 
                        height: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                    }
                }, isExpanded ? '▼' : '▶'),
                !hasChildren && React.createElement('span', { style: { width: '1.5rem', height: '1.5rem', display: 'inline-block' } }),
                // Checkbox para selección
                React.createElement('input', {
                    type: 'checkbox',
                    checked: allSelected,
                    ref: (el) => { if (el) el.indeterminate = someSelected; },
                    onChange: (e) => {
                        const newSelection = { ...selectedProjectsForDelete };
                        for (const proj of descendants) {
                            newSelection[proj] = e.target.checked;
                        }
                        setSelectedProjectsForDelete(newSelection);
                    },
                    style: { margin: 0 }
                }),
                // Nombre del proyecto
                React.createElement('span', { style: { flex: 1 } },
                    hasChildren ? `${key}` : key,
                    validationStatus && React.createElement('span', { style: { marginLeft: '0.375rem' } }, validationStatus)
                ),
                // Botón eliminar solo para hojas
                node.isLeaf && React.createElement('button', {
                    onClick: () => handleRemoveProject(node.project),
                    style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0' }
                }, '✕')
            ),
            // Hijos recursivos
            hasChildren && isExpanded && React.createElement('div', null,
                Object.keys(node.children).sort().map(childKey =>
                    renderProjectTreeNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render ---
    return React.createElement('div', null,
        // === SECCIÓN 1: LISTA DE PROYECTOS ===
        React.createElement('h3', { style: { marginTop: 0 } }, 'Lista de Proyectos'),
        React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm dgt-mb-sm dgt-flex-wrap' },
            React.createElement('button', { onClick: handleValidate, className: 'dgt-btn dgt-btn-secondary' }, "Validar Existencia"),
            React.createElement('button', { onClick: handleScanProjects, className: 'dgt-btn', style: { backgroundColor: 'var(--dgt-bg-tertiary)', color: 'var(--dgt-accent-yellow)', borderColor: 'var(--dgt-accent-yellow)' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
            (() => {
                const notFoundCount = projects.filter(p => validation[p] === false).length;
                return notFoundCount > 0
                    ? React.createElement('button', {
                        onClick: handleSelectNotFound,
                        className: 'dgt-btn',
                        style: { backgroundColor: 'var(--dgt-bg-tertiary)', border: '1px solid var(--dgt-accent-red)', color: 'var(--dgt-accent-red)', fontWeight: 'bold' }
                    }, `☑️ Seleccionar No Encontrados (${notFoundCount})`)
                    : null;
            })(),
            React.createElement('button', { onClick: handleForceSync, className: 'dgt-btn dgt-btn-secondary', style: { marginLeft: 'auto' } }, "🔄 Sincronizar")
        ),

        suggestions.length > 0 && React.createElement('div', { className: 'dgt-card dgt-card-body dgt-mb-md', style: { borderColor: 'var(--dgt-accent-yellow)', backgroundColor: 'var(--dgt-bg-tertiary)' } },
            React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm' },
                React.createElement('strong', { className: 'dgt-text-warning' }, `Sugerencias encontradas (${suggestions.length}):`),
                React.createElement('button', {
                    onClick: handleAddAllSuggestions,
                    className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '4px 10px', backgroundColor: 'var(--dgt-accent-green)' }
                }, `✅ Añadir Todos (${suggestions.length})`)
            ),
            React.createElement('div', { className: 'dgt-list-container', style: { maxHeight: '18.75rem' } },
                suggestions.map(s =>
                    React.createElement('div', { key: s, className: 'dgt-flex-between dgt-p-sm', style: { borderBottom: '1px solid var(--dgt-border-color)' } },
                        React.createElement('span', null, s),
                        React.createElement('button', { onClick: () => handleAddSuggestion(s), className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '4px 8px', backgroundColor: 'var(--dgt-accent-green)' } }, '+ Añadir')
                    )
                )
            )
        ),

        // Sección de Proyectos Ignorados
        dismissedProjects.length > 0 && React.createElement('div', { className: 'dgt-card dgt-card-body dgt-mb-md', style: { borderColor: 'var(--dgt-border-color)', backgroundColor: 'var(--dgt-bg-secondary)' } },
            React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm' },
                React.createElement('strong', { className: 'dgt-text-neutral' }, `Ocultos de la alerta automática (${dismissedProjects.length}):`),
                React.createElement('button', {
                    onClick: () => {
                        DiscourseGraphToolkit.clearDismissedProjects();
                        setDismissedProjects([]);
                        DiscourseGraphToolkit.showToast('Lista de ignorados limpiada.', 'info');
                    },
                    style: { padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid var(--dgt-border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--dgt-text-neutral)' }
                }, `🧹 Limpiar Todos`)
            ),
            React.createElement('div', { className: 'dgt-list-container', style: { maxHeight: '12.5rem', overflowY: 'auto', paddingRight: '0.5rem' } },
                dismissedProjects.map(s =>
                    React.createElement('div', { key: s, className: 'dgt-flex-between dgt-p-sm', style: { borderBottom: '1px dotted var(--dgt-border-color)' } },
                        React.createElement('span', { style: { color: 'var(--dgt-text-neutral)', fontStyle: 'italic', fontSize: '0.8125rem' } }, s),
                        React.createElement('button', {
                            onClick: () => {
                                DiscourseGraphToolkit.removeFromDismissedProjects(s);
                                setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());
                                DiscourseGraphToolkit.showToast('Proyecto restaurado y en vigilancia de nuevo.', 'success');
                            },
                            style: { padding: '2px 6px', backgroundColor: 'transparent', border: '1px solid var(--dgt-accent-green)', color: 'var(--dgt-accent-green)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }
                        }, 'Restaurar')
                    )
                )
            )
        ),

        React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm' },
            React.createElement('div', { className: 'dgt-flex-row dgt-align-center', style: { gap: '1rem' } },
                React.createElement('label', { style: { display: 'flex', alignItems: 'center', margin: 0 } },
                    React.createElement('input', {
                        type: 'checkbox',
                        checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                        onChange: toggleSelectAllProjects,
                        className: 'dgt-mr-xs',
                        style: { margin: '0 0.375rem 0 0' }
                    }),
                    'Seleccionar Todo'
                ),
                React.createElement('div', { className: 'dgt-flex-row', style: { gap: '0.5rem' } },
                    React.createElement('button', {
                        onClick: handleExpandAll,
                        className: 'dgt-btn dgt-btn-secondary',
                        style: { padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }
                    }, '➕ Expandir Todo'),
                    React.createElement('button', {
                        onClick: handleCollapseAll,
                        className: 'dgt-btn dgt-btn-secondary',
                        style: { padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }
                    }, '➖ Colapsar Todo')
                )
            ),
            React.createElement('button', {
                onClick: handleBulkDeleteProjects,
                disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                className: 'dgt-btn dgt-btn-primary',
                style: {
                    backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? 'var(--dgt-accent-red)' : 'var(--dgt-text-muted)'
                }
            }, 'Eliminar Seleccionados')
        ),

        React.createElement('div', { className: 'dgt-tree-container', style: { maxHeight: '25rem' } },
            projects.length === 0 ? React.createElement('div', { className: 'dgt-p-md dgt-text-muted' }, 'No hay proyectos.') :
                Object.keys(projectTree).sort().map(projectKey =>
                    renderProjectTreeNode(projectTree[projectKey], projectKey, 0)
                )
        )
    );
};


// --- MODULE: src/ui/tabs/BranchesTab.js ---
// ============================================================================
// UI: Branches Tab Component
// ============================================================================

DiscourseGraphToolkit.BranchesTab = function () {
    const React = window.React;
    const {
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        selectedProjects, setSelectedProjects,
        verificationProgress, setVerificationProgress
    } = DiscourseGraphToolkit.useBranches();

    // --- Favorites ---
    const [favorites, setFavorites] = React.useState([]);

    // Cargar favoritos al montar
    React.useEffect(() => {
        setFavorites(DiscourseGraphToolkit.FavoritesService.getAll('branches'));
    }, []);

    const handleSaveFavorite = () => {
        const data = {
            selectedProjects: Array.from(selectedProjects)
        };
        // El nombre se genera automáticamente desde selectedProjects (por namespace)
        const updated = DiscourseGraphToolkit.FavoritesService.add('branches', null, data);
        setFavorites(updated);
        // Mostrar toast con el nombre generado
        const name = DiscourseGraphToolkit.computeFavoriteName(selectedProjects);
        DiscourseGraphToolkit.showToast('Favorito guardado: ' + name, 'success');
    };

    const handleApplyFavorite = (fav) => {
        const data = fav.data;
        if (data.selectedProjects && Array.isArray(data.selectedProjects)) {
            setSelectedProjects(new Set(data.selectedProjects));
        }
        DiscourseGraphToolkit.showToast('Favorito aplicado: ' + fav.name, 'success');
    };

    const handleDeleteFavorite = (favId, favName, e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar favorito "' + favName + '"?')) return;
        const updated = DiscourseGraphToolkit.FavoritesService.remove('branches', favId);
        setFavorites(updated);
    };

    const handleRenameFavorite = (favId, currentName) => {
        const newName = prompt('Nuevo nombre:', currentName);
        if (!newName || newName.trim() === currentName) return;
        const updated = DiscourseGraphToolkit.FavoritesService.rename('branches', favId, newName.trim());
        setFavorites(updated);
    };

    const isFavoriteActive = (fav) => {
        const current = Array.from(selectedProjects).sort();
        const saved = (fav.data.selectedProjects || []).sort();
        if (current.length !== saved.length) return false;
        return current.every((v, i) => v === saved[i]);
    };

    // --- Estado para popover (mantener para resumen) y Filtro de Árbol ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | 'container' | null
    const [activeFilter, setActiveFilter] = React.useState(null); // 'different' | 'missing' | null
    const [showProjectFilter, setShowProjectFilter] = React.useState(false);

    const allProjects = React.useMemo(() => DiscourseGraphToolkit.getProjects(), []);
    
    // Generar caché de todos los paths (incluyendo intermedios) para selecciones correctas
    const allProjectsPathsSet = React.useMemo(() => {
        const paths = new Set(['(sin proyecto)']);
        for (const proj of allProjects) {
            const parts = proj.split('/');
            let currentPath = '';
            for (const part of parts) {
                currentPath = currentPath ? currentPath + '/' + part : part;
                paths.add(currentPath);
            }
        }
        return paths;
    }, [allProjects]);
    
    // Función para alternar la selección de un proyecto individual y sus subproyectos
    const handleToggleProjectSelect = (project, isSelected) => {
        const newSelected = new Set(selectedProjects);
        const toggleRecursive = (proj, select) => {
            if (select) newSelected.add(proj);
            else newSelected.delete(proj);
            
            // Alternar también todos los subproyectos e intermedios
            const prefix = proj + '/';
            for (const p of allProjectsPathsSet) {
                if (p.startsWith(prefix)) {
                    if (select) newSelected.add(p);
                    else newSelected.delete(p);
                }
            }
        };

        toggleRecursive(project, isSelected);
        setSelectedProjects(newSelected);
    };

    const handleToggleSelectAll = () => {
        if (selectedProjects.size >= allProjectsPathsSet.size) { 
            setSelectedProjects(new Set());
        } else {
            setSelectedProjects(new Set(allProjectsPathsSet));
        }
    };

    // --- Árbol jerárquico (calculado y filtrado) ---
    const projectTree = React.useMemo(() => {
        const baseTree = {};
        const noProject = { project: null, questions: [], children: {}, aggregatedStatus: 'missing', issueCount: 0 };
        
        // 1. Inicializar estructura con todos los proyectos disponibles
        for (const project of allProjects) {
            const parts = project.split('/');
            let currentLevel = baseTree;
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = currentPath ? currentPath + '/' + part : part;

                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        project: currentPath,
                        questions: [],
                        children: {},
                        aggregatedStatus: 'coherent',
                        issueCount: 0
                    };
                }
                currentLevel = currentLevel[part].children;
            }
        }
        
        baseTree['(sin proyecto)'] = noProject;
        
        // 2. Insertar resultados
        for (const result of bulkVerificationResults) {
            const project = result.coherence.rootProject;

            if (!project) {
                if (baseTree['(sin proyecto)']) baseTree['(sin proyecto)'].questions.push(result);
                continue;
            }

            const parts = project.split('/');
            let currentLevel = baseTree;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (currentLevel[part]) {
                    if (i === parts.length - 1) {
                        currentLevel[part].questions.push(result);
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        }
        
        // 3. Recalcular contadores
        DiscourseGraphToolkit._calculateAggregatedStatus(baseTree);

        // Función auxiliar para verificar si un nodo o sus hijos tienen un error específico
        const nodeHasErrorStatus = (node, targetStatus) => {
            if (node.questions && node.questions.some(q => q.status === targetStatus)) {
                return true;
            }
            if (node.children) {
                for (const childKey in node.children) {
                    if (nodeHasErrorStatus(node.children[childKey], targetStatus)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // Función para filtrar el árbol manteniendo la estructura según los filtros activos de estatus (diferente, missing)
        const filterTreeRecursive = (treeNodes) => {
            const filtered = {};
            for (const key in treeNodes) {
                const node = treeNodes[key];
                const hasError = nodeHasErrorStatus(node, activeFilter);

                if (hasError) {
                    filtered[key] = { ...node };
                    if (node.children) {
                        const filteredChildren = filterTreeRecursive(node.children);
                        filtered[key].children = Object.keys(filteredChildren).length > 0 ? filteredChildren : {};
                    }
                }
            }
            return filtered;
        };

        if (!activeFilter) {
            return baseTree;
        }

        return filterTreeRecursive(baseTree);

    }, [bulkVerificationResults, activeFilter, allProjects]);

    // Calcular estatus globales de un nodo (para el encabezado de carpetas)
    const getProjectErrorCounts = React.useCallback((node) => {
        let diff = 0;
        let miss = 0;

        const countErrors = (n) => {
            if (n.questions) {
                n.questions.forEach(q => {
                    if (q.status === 'different') diff++;
                    if (q.status === 'missing') miss++;
                });
            }
            if (n.children) {
                for (const k in n.children) {
                    countErrors(n.children[k]);
                }
            }
        };
        countErrors(node);
        return { diff, miss };
    }, []);

    // --- Contadores ---
    const counts = React.useMemo(() => ({
        coherent: bulkVerificationResults.filter(r => r.status === 'coherent' || r.status === 'specialized').length,
        different: bulkVerificationResults.flatMap(r => r.coherence.different).length,
        missing: bulkVerificationResults.flatMap(r => r.coherence.missing).length,
        containerMismatch: bulkVerificationResults.filter(r =>
            r.containerPage?.containerStatus === 'mismatched' ||
            r.containerPage?.containerStatus === 'no_project'
        ).length
    }), [bulkVerificationResults]);

    // --- Helpers (shared) ---
    const parseMarkdownBold = DiscourseGraphToolkit.parseMarkdownBold;
    const handleNavigateToPage = DiscourseGraphToolkit.navigateToPage.bind(DiscourseGraphToolkit);

    // --- Handlers ---
    const handleBulkVerifyAll = async () => {
        setIsBulkVerifying(true);
        setBulkVerifyStatus('⏳ Cargando ramas y preguntas...');
        setBulkVerificationResults([]);
        setSelectedBulkQuestion(null);
        setVerificationProgress({ current: 0, total: 0, currentQuestion: '' });

        try {
            const allQuestions = await DiscourseGraphToolkit.getAllRootNodes();
            const results = [];

            // Filtrar preguntas por proyectos seleccionados de manera eficiente
            // Primero obtenemos los proyectos de todas las preguntas en una sola consulta
            const PM = DiscourseGraphToolkit.ProjectManager;
            const escapedPattern = PM.getEscapedFieldPattern();
            const allUids = allQuestions.map(q => q.pageUid);
            const query = `[:find ?page-uid ?string
                       :in $ [?page-uid ...]
                       :where 
                       [?page :block/uid ?page-uid]
                       [?page :block/children ?block]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "${escapedPattern}")]]`;
            
            const rawProjectResults = await window.roamAlphaAPI.data.async.q(query, allUids);
            const projectMap = new Map();
            const regex = PM.getFieldRegex();
            const fieldPattern = PM.getFieldPattern();
            
            if (rawProjectResults) {
                rawProjectResults.forEach(r => {
                    const pageUid = r[0];
                    const blockString = r[1];
                    if (!DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                        const match = blockString.match(regex);
                        if (match) {
                            projectMap.set(pageUid, match[1].trim());
                        }
                    }
                });
            }

            // Obtener páginas contenedoras para todas las preguntas en lote antes de filtrar
            setBulkVerifyStatus('⏳ Buscando páginas contenedoras...');
            const containerPageMap = await DiscourseGraphToolkit.getContainerPagesForNodes(allUids);

            // Aplicar el filtro: incluir si su propio proyecto coincide o si el proyecto de su contenedor coincide
            const filteredQuestions = allQuestions.filter(q => {
                const proj = projectMap.get(q.pageUid) || '(sin proyecto)';
                if (selectedProjects.has(proj)) {
                    return true;
                }
                const containerInfo = containerPageMap.get(q.pageUid);
                const containerProj = containerInfo ? (containerInfo.project || '(sin proyecto)') : null;
                if (containerProj && selectedProjects.has(containerProj)) {
                    return true;
                }
                return false;
            });

            if (filteredQuestions.length === 0) {
                setBulkVerifyStatus('⚠️ No hay preguntas en los proyectos seleccionados.');
                setIsBulkVerifying(false);
                return;
            }

            setVerificationProgress({ current: 0, total: filteredQuestions.length, currentQuestion: '' });

            for (let i = 0; i < filteredQuestions.length; i++) {
                // Cedemos control brevemente para permitir que el frontend repinte la UI
                await new Promise(r => setTimeout(r, 10));

                const q = filteredQuestions[i];
                const cleanTitle = q.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '');
                
                setVerificationProgress({ current: i, total: filteredQuestions.length, currentQuestion: cleanTitle });
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${filteredQuestions.length}...`);

                const branchNodes = await DiscourseGraphToolkit.getBranchNodes(q.pageUid);
                const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(q.pageUid, branchNodes);

                let status = 'coherent';
                if (cohResult.missing.length > 0) status = 'missing';
                else if (cohResult.different.length > 0) status = 'different';
                else if (cohResult.specialized.length > 0) status = 'specialized';

                const rawContainerInfo = containerPageMap.get(q.pageUid) || null;
                const containerStatus = DiscourseGraphToolkit.calcContainerStatus(cohResult.rootProject, rawContainerInfo);
                const containerPage = rawContainerInfo ? { ...rawContainerInfo, containerStatus } : null;

                results.push({
                    question: q,
                    branchNodes,
                    coherence: cohResult,
                    status,
                    containerPage
                });
            }

            setVerificationProgress({ current: filteredQuestions.length, total: filteredQuestions.length, currentQuestion: '¡Completado!' });

            setBulkVerificationResults(results);
            const coherent = results.filter(r => r.status === 'coherent' || r.status === 'specialized').length;
            const different = results.filter(r => r.status === 'different').length;
            const missing = results.filter(r => r.status === 'missing').length;
            const statusMsg = `✅ ${coherent} coherentes, ${different} dif., ${missing} sin proy.`;
            setBulkVerifyStatus(statusMsg);
            DiscourseGraphToolkit.saveVerificationCache(results, statusMsg);
        } catch (e) {
            console.error('Bulk verification error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsBulkVerifying(false);
        }
    };



    const handleBulkSelectQuestion = (result) => {
        setSelectedBulkQuestion(result);
        setEditableProject(result.coherence.rootProject || '');
    };

    const handlePropagate = async () => {
        if (!selectedBulkQuestion || !editableProject.trim()) {
            return;
        }

        const exactChanges = [
            ...selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization'),
            ...selectedBulkQuestion.coherence.missing
        ];
        
        const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
        
        const totalNodes = exactChanges.length + generalizations.length;
        if (totalNodes === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Propagando proyecto a ${totalNodes} nodos...`);

        try {
            let success = true;
            
            // 1. Propagar proyecto raíz a diferentes exactos y faltantes
            if (exactChanges.length > 0) {
                const resultExact = await DiscourseGraphToolkit.propagateProjectToBranch(
                    selectedBulkQuestion.question.pageUid,
                    editableProject.trim(),
                    exactChanges
                );
                if (!resultExact.success) success = false;
            }
            
            // 2. Heredar proyecto del padre directo para generalizaciones
            if (generalizations.length > 0) {
                const resultGen = await DiscourseGraphToolkit.propagateFromParents(generalizations);
                if (!resultGen.success) success = false;
            }

            if (success) {
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
                // Forzar refresco para ver lo que se arregló
                await refreshSelectedQuestion();
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const refreshQuestionByUid = async (rootUid) => {
        setBulkVerifyStatus(`✅ Sincronizando con Roam...`);
        await new Promise(resolve => setTimeout(resolve, 550));

        setBulkVerifyStatus(`✅ Refrescando datos...`);
        const branchNodes = await DiscourseGraphToolkit.getBranchNodes(rootUid);
        const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(rootUid, branchNodes);

        let status = 'coherent';
        if (cohResult.missing.length > 0) status = 'missing';
        else if (cohResult.different.length > 0) status = 'different';
        else if (cohResult.specialized.length > 0) status = 'specialized';

        // Re-obtener página contenedora para esta pregunta
        const singleContainerMap = await DiscourseGraphToolkit.getContainerPagesForNodes([rootUid]);
        const rawContainerInfo = singleContainerMap.get(rootUid) || null;
        const containerStatus = DiscourseGraphToolkit.calcContainerStatus(cohResult.rootProject, rawContainerInfo);
        const containerPage = rawContainerInfo ? { ...rawContainerInfo, containerStatus } : null;

        const existingResult = bulkVerificationResults.find(r => r.question.pageUid === rootUid);
        const updatedResult = { ...existingResult, question: existingResult?.question || { pageUid: rootUid }, branchNodes, coherence: cohResult, status, containerPage };
        
        const updatedResults = bulkVerificationResults.map(r =>
            r.question.pageUid === rootUid ? updatedResult : r
        );
        setBulkVerificationResults(updatedResults);
        if (selectedBulkQuestion?.question.pageUid === rootUid) {
            setSelectedBulkQuestion(updatedResult);
            setEditableProject(cohResult.rootProject || '');
        }
        const statusMsg = `✅ Sincronización completada.`;
        setBulkVerifyStatus(statusMsg);
        DiscourseGraphToolkit.saveVerificationCache(updatedResults, statusMsg);
    };

    const refreshSelectedQuestion = async () => {
        if (!selectedBulkQuestion) return;
        await refreshQuestionByUid(selectedBulkQuestion.question.pageUid);
    };

    const handleFixContainerAlignment = async (queUid, targetUid, newProject, promptMessage, isQue) => {
        if (promptMessage && !window.confirm(promptMessage)) {
            return;
        }

        setIsPropagating(true);
        setBulkVerifyStatus('⏳ Alineando proyectos...');

        try {
            const res = await DiscourseGraphToolkit.fixContainerAlignment(targetUid, newProject);
            if (res.success) {
                // Si el contenedor fue modificado, múltiples QUEs en ese contenedor podrían haberse visto afectadas.
                const affectedResults = bulkVerificationResults.filter(r => r.containerPage && r.containerPage.uid === targetUid);
                if (!isQue && affectedResults.length > 1) {
                    setBulkVerifyStatus('⏳ Refrescando ramas afectadas...');
                    for (const r of affectedResults) {
                        await refreshQuestionByUid(r.question.pageUid);
                    }
                } else {
                    await refreshQuestionByUid(queUid);
                }
                DiscourseGraphToolkit.showToast('Proyecto alineado con éxito', 'success');
            } else {
                setBulkVerifyStatus('❌ Error al alinear: ' + (res.error || 'error desconocido'));
                DiscourseGraphToolkit.showToast('Error al alinear proyecto: ' + (res.error || ''), 'error');
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
            DiscourseGraphToolkit.showToast('Error: ' + e.message, 'error');
        } finally {
            setIsPropagating(false);
        }
    };

    // --- Callbacks para ProjectTreeView ---
    const renderBranchesNodeHeader = (node, key, depth, isExpanded, toggleFn) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const totalQuestions = DiscourseGraphToolkit.countTreeQuestions(node);

        const depthClass = depth === 0 ? 'depth-0' : (depth % 2 !== 0 ? 'depth-odd' : 'depth-even');

        const { diff, miss } = getProjectErrorCounts(node);

        return React.createElement('div', {
            onClick: toggleFn,
            className: `dgt-accordion-header ${depthClass}`
        },
            React.createElement('span', { className: 'dgt-text-muted dgt-text-xs', style: { width: '16px', textAlign: 'center' } },
                hasChildren ? (isExpanded ? '▼' : '▶') : '•'),
            React.createElement('div', { className: 'dgt-flex-row', style: { flex: 1, gap: '0.75rem', alignItems: 'center' } },
                // Checkbox de selección (solo hasta nivel 1)
                (depth <= 1) && React.createElement('input', {
                    type: 'checkbox',
                    checked: selectedProjects.has(node.project || '(sin proyecto)'),
                    onChange: (e) => {
                        e.stopPropagation();
                        handleToggleProjectSelect(node.project || '(sin proyecto)', e.target.checked);
                    },
                    onClick: (e) => e.stopPropagation(),
                    style: { cursor: 'pointer', margin: 0 }
                }),
                React.createElement('span', { title: node.project },
                    node.project ? node.project.split('/').pop() : '(sin proyecto)'
                ),
                // Indicador de error minimalista (punto rojo)
                (miss > 0 || diff > 0) && React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center' } },
                    React.createElement('div', {
                        title: `${miss} sin proyecto, ${diff} con proyecto diferente`,
                        style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }
                    })
                ),
                // Contador total
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral'
                }, `${totalQuestions} rama${totalQuestions !== 1 ? 's' : ''}`)
            )
        );
    };

    // Helper: título corto de la página contenedora (segmento antes de /grafoDeDiscurso)
    const getContainerShortTitle = (title) => {
        if (!title) return '(sin página contenedora)';
        const suffix = DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX;
        const base = title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
        return base.split('/').pop() || base;
    };

    // Helper: icono y color según containerStatus
    const CONTAINER_STATUS_META = {
        coherent:    { icon: '🏛️', label: 'Proyecto coherente con página contenedora', color: 'var(--dgt-text-success)' },
        mismatched:  { icon: '⚠️', label: 'Proyecto desalineado respecto a página contenedora', color: 'var(--dgt-text-warning)' },
        no_project:  { icon: '❓', label: 'Página contenedora sin proyecto definido', color: 'var(--dgt-text-muted)' },
        no_container:{ icon: '📄', label: 'Sin página contenedora encontrada', color: 'var(--dgt-text-muted)' }
    };

    // Render de una fila de QUE individual
    const renderQueRow = (result, depth) => {
        const isSelected = selectedBulkQuestion?.question.pageUid === result.question.pageUid;
        const hasError = result.status === 'different' || result.status === 'missing';

        return React.createElement('div', {
            key: result.question.pageUid,
            className: 'dgt-flex-column',
            style: {
                borderBottom: '1px solid var(--dgt-border-color)',
                backgroundColor: isSelected ? 'var(--dgt-bg-secondary)' : 'transparent'
            }
        },
            // Fila cliqueable
            React.createElement('div', {
                onClick: (e) => { e.stopPropagation(); handleBulkSelectQuestion(result); },
                className: 'dgt-flex-row dgt-text-sm',
                style: {
                    padding: '0.6rem 0.75rem',
                    paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: '0.75rem'
                }
            },
                // Punto rojo sutil para errores, o nada para coherentes
                React.createElement('div', {
                    style: {
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: hasError ? '#ef4444' : 'transparent',
                        flexShrink: 0
                    },
                    title: result.status
                }),
                React.createElement('div', { className: 'dgt-flex-column', style: { flex: 1, gap: '0.15rem' } },
                    React.createElement('div', { className: 'dgt-text-primary', style: { lineHeight: '1.4' } },
                        parseMarkdownBold(result.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, ''))),
                    React.createElement('span', { className: 'dgt-text-secondary', style: { fontSize: '0.6875rem' } },
                        `${result.branchNodes.length} nodos`)
                )
            )
        );
    };

    // Render del overlay de resolución para la QUE seleccionada (Overlay Sheet)
    const renderQueResolutionOverlay = () => {
        if (!selectedBulkQuestion) return null;

        const result = selectedBulkQuestion;
        const totalProblematic = result.coherence.different.length + result.coherence.missing.length;
        const hasContainerMismatch = result.containerPage && (result.containerPage.containerStatus === 'mismatched' || result.containerPage.containerStatus === 'no_project');

        const renderContainerMismatchRow = () => {
            const cp = result.containerPage;
            const shortTitle = getContainerShortTitle(cp.title);
            const queProject = result.coherence.rootProject;
            const containerProject = cp.project;

            return React.createElement('div', {
                key: 'container-mismatch-' + cp.uid,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--dgt-radius-md)',
                    gap: '0.6rem'
                }
            },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                background: '#b45309',
                                color: '#fff',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }
                        }, 'CONT'),
                        React.createElement('span', { style: { fontWeight: 600, fontSize: '0.8125rem', color: '#b45309' } }, shortTitle)
                    ),
                    React.createElement('button', {
                        onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' },
                        title: `Ir a: ${cp.title}`
                    }, '→')
                ),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--dgt-text-primary)' } },
                    React.createElement('div', null, 'Desalineación de proyecto con la página contenedora:'),
                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem', color: 'var(--dgt-text-muted)' } },
                        React.createElement('span', { style: { textDecoration: 'line-through', wordBreak: 'break-all' } }, containerProject || '(sin proyecto)'),
                        React.createElement('span', null, '→'),
                        React.createElement('span', { style: { color: 'var(--dgt-text-success)', fontWeight: 'bold', wordBreak: 'break-all' } }, queProject || '(sin proyecto en QUE)')
                    )
                ),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' } },
                    // Botón: Propagar al contenedor
                    (cp.containerStatus === 'no_project' && queProject) && React.createElement('button', {
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        disabled: isPropagating,
                        style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                        onClick: () => {
                            handleFixContainerAlignment(
                                result.question.pageUid,
                                cp.uid,
                                queProject,
                                `¿Asignar el proyecto "${queProject}" de la QUE a la página contenedora?`,
                                false
                            );
                        }
                    }, 'Propagar proyecto al contenedor'),

                    // Botón: Heredar del contenedor (cuando la QUE no tiene proyecto)
                    (cp.containerStatus === 'mismatched' && !queProject && containerProject) && React.createElement('button', {
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        disabled: isPropagating,
                        style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                        onClick: () => {
                            handleFixContainerAlignment(
                                result.question.pageUid,
                                result.question.pageUid,
                                containerProject,
                                `¿Asignar el proyecto del contenedor ("${containerProject}") a esta QUE?`,
                                true
                            );
                        }
                    }, 'Heredar proyecto del contenedor'),

                    // Botones bidireccionales cuando ambos tienen proyecto pero son diferentes
                    (cp.containerStatus === 'mismatched' && queProject && containerProject) && React.createElement(React.Fragment, null,
                        React.createElement('button', {
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            disabled: isPropagating,
                            style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                            onClick: () => {
                                handleFixContainerAlignment(
                                    result.question.pageUid,
                                    result.question.pageUid,
                                    containerProject,
                                    `¿Cambiar el proyecto de la QUE de "${queProject}" a "${containerProject}"?\nEsto afectará a toda la rama y sus nodos hijos podrían necesitar re-sincronización.`,
                                    true
                                );
                            }
                        }, 'Alinear QUE al contenedor (cambia rama)'),
                        React.createElement('button', {
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            disabled: isPropagating,
                            style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                            onClick: () => {
                                const sharedCount = bulkVerificationResults.filter(res => res.containerPage && res.containerPage.uid === cp.uid).length;
                                handleFixContainerAlignment(
                                    result.question.pageUid,
                                    cp.uid,
                                    queProject,
                                    `¿Cambiar el proyecto del contenedor de "${containerProject}" a "${queProject}"?\nAdvertencia: Este contenedor es compartido por ${sharedCount} QUE(s) en la vista de verificación.`,
                                    false
                                );
                            }
                        }, 'Alinear contenedor a la QUE')
                    )
                )
            );
        };

        const renderDiscrepancyRow = (node, errorType) => {
            const badgeColor = errorType === 'different' ? '#fef3c7' : '#fee2e2';
            const textColor = errorType === 'different' ? '#92400e' : '#991b1b';
            const borderColor = errorType === 'different' ? '#fde68a' : '#fca5a5';
            const oldProject = errorType === 'different' ? (node.project || '(sin proyecto)') : '(sin proyecto)';
            const newProject = errorType === 'different' ? node.parentProject : (node.parentProject || editableProject);

            return React.createElement('div', {
                key: node.uid,
                style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: 'var(--dgt-text-primary)',
                    borderBottom: '1px solid var(--dgt-border-color)',
                    paddingBottom: '0.6rem',
                    gap: '0.75rem'
                }
            },
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'flex-start' } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.65rem',
                                padding: '1px 4px',
                                background: badgeColor,
                                color: textColor,
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                border: `1px solid ${borderColor}`,
                                marginTop: '2px',
                                flexShrink: 0
                            }
                        }, node.type),
                        React.createElement('span', { style: { fontWeight: 500, lineHeight: '1.4', wordBreak: 'break-word' }, title: node.title }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')))
                    ),
                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--dgt-text-muted)', fontSize: '0.75rem', alignItems: 'center' } },
                        React.createElement('span', { style: { textDecoration: 'line-through', wordBreak: 'break-all' } }, oldProject),
                        React.createElement('span', null, '→'),
                        React.createElement('span', { style: { color: 'var(--dgt-text-success)', fontWeight: 'bold', wordBreak: 'break-all' } }, newProject)
                    )
                ),
                React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); },
                    className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                    title: `Ir a: ${node.title || ''}`,
                    style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' }
                }, '→')
            );
        };

        return React.createElement('div', {
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)'
            },
            onClick: () => setSelectedBulkQuestion(null)
        },
            React.createElement('div', {
                style: {
                    width: '90%',
                    maxWidth: '1100px',
                    maxHeight: '85vh',
                    backgroundColor: 'var(--dgt-bg-primary)',
                    borderRadius: 'var(--dgt-radius-lg)',
                    boxShadow: 'var(--dgt-shadow-lg)',
                    border: '1px solid var(--dgt-border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                },
                onClick: (e) => e.stopPropagation()
            },
                // Cabecera
                React.createElement('div', {
                    style: {
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--dgt-border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        backgroundColor: 'var(--dgt-bg-secondary)'
                    }
                },
                    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                color: 'var(--dgt-text-muted)',
                                letterSpacing: '0.05em'
                            }
                        }, 'Coherencia de Rama'),
                        React.createElement('h4', {
                            style: {
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--dgt-text-primary)',
                                lineHeight: '1.4'
                            }
                        }, parseMarkdownBold(result.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '')))
                    ),
                    React.createElement('button', {
                        onClick: () => setSelectedBulkQuestion(null),
                        style: {
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            color: 'var(--dgt-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                        },
                        title: 'Cerrar'
                    }, '✕')
                ),
                // Cuerpo
                React.createElement('div', {
                    className: 'dgt-scrollable',
                    style: {
                        padding: '1.25rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        flex: 1
                    }
                },
                    // Stats del proyecto
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--dgt-bg-secondary)',
                            borderRadius: 'var(--dgt-radius-md)',
                            border: '1px solid var(--dgt-border-color)'
                        }
                    },
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--dgt-text-secondary)' } },
                            React.createElement('span', null, `Nodos en la rama: ${result.branchNodes.length}`),
                            React.createElement('span', null, `Errores: ${totalProblematic + (hasContainerMismatch ? 1 : 0)}`)
                        ),
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.8125rem',
                                marginTop: '0.25rem'
                            }
                        },
                            React.createElement('span', { style: { fontWeight: '600', color: 'var(--dgt-text-primary)', whiteSpace: 'nowrap' } }, 'Proyecto de la Rama:'),
                            React.createElement('input', {
                                type: 'text',
                                value: editableProject,
                                onChange: (e) => setEditableProject(e.target.value),
                                placeholder: '(sin proyecto)',
                                style: {
                                    padding: '6px 10px',
                                    fontSize: '0.75rem',
                                    border: '1px solid var(--dgt-border-color)',
                                    borderRadius: 'var(--dgt-radius-sm)',
                                    flex: 1,
                                    backgroundColor: '#fff'
                                }
                            })
                        )
                    ),
                    // Lista de discrepancias
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }
                    },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: 'var(--dgt-text-secondary)',
                                borderBottom: '1px solid var(--dgt-border-color)',
                                paddingBottom: '0.25rem'
                            }
                        }, 'Discrepancias identificadas'),
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }
                        },
                            hasContainerMismatch && renderContainerMismatchRow(),
                            result.coherence.different.map(node => renderDiscrepancyRow(node, 'different')),
                            result.coherence.missing.map(node => renderDiscrepancyRow(node, 'missing'))
                        )
                    )
                ),
                // Pie / Footer
                React.createElement('div', {
                    style: {
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid var(--dgt-border-color)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        backgroundColor: 'var(--dgt-bg-secondary)'
                    }
                },
                    React.createElement('button', {
                        onClick: () => setSelectedBulkQuestion(null),
                        className: 'dgt-btn dgt-btn-secondary',
                        style: { padding: '6px 12px', fontSize: '0.8125rem', cursor: 'pointer' }
                    }, 'Cerrar'),
                    totalProblematic > 0 && React.createElement('button', {
                        onClick: (e) => { e.stopPropagation(); handlePropagate(); },
                        disabled: isPropagating || !editableProject.trim(),
                        className: 'dgt-btn dgt-btn-primary',
                        style: {
                            backgroundColor: (isPropagating || !editableProject.trim()) ? 'var(--dgt-text-muted)' : 'var(--dgt-accent-green)',
                            padding: '6px 16px',
                            fontSize: '0.8125rem',
                            cursor: 'pointer'
                        }
                    }, isPropagating ? '⏳ Sincronizando...' : `Sincronizar Rama (${totalProblematic})`)
                )
            )
        );
    };

    const renderBranchesNodeContent = (node, depth) => {
        if (!node.questions || node.questions.length === 0) return null;

        // Agrupar QUEs por página contenedora
        const groupMap = new Map();
        for (const result of node.questions) {
            const key = result.containerPage?.uid || '(sin página contenedora)';
            if (!groupMap.has(key)) {
                groupMap.set(key, { containerPage: result.containerPage || null, questions: [] });
            }
            groupMap.get(key).questions.push(result);
        }

        return React.createElement('div', null,
            Array.from(groupMap.entries()).map(([key, group]) => {
                const cp = group.containerPage;
                const cStatus = cp?.containerStatus || 'no_container';
                const meta = CONTAINER_STATUS_META[cStatus] || CONTAINER_STATUS_META.no_container;
                const shortTitle = cp ? getContainerShortTitle(cp.title) : '(sin página contenedora)';
                const projLabel = cp?.project ? `  ·  ${cp.project}` : '';
                const leftPad = `${0.75 + (depth + 1) * 0.75}rem`;

                return React.createElement('div', { key },
                    // Cabecera de la página contenedora
                    React.createElement('div', {
                        style: {
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: `0.35rem 0.75rem 0.35rem ${leftPad}`,
                            borderBottom: '1px solid var(--dgt-border-color)',
                            backgroundColor: 'var(--dgt-bg-secondary)',
                            borderLeft: `3px solid ${meta.color}`
                        },
                        title: `${meta.label}${cp ? '\n' + cp.title : ''}`
                    },
                        React.createElement('span', { style: { fontSize: '0.8rem' } }, meta.icon),
                        React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--dgt-text-primary)' } }, shortTitle),
                        React.createElement('span', { style: { fontSize: '0.65rem', color: 'var(--dgt-text-muted)', flex: 1 } }, projLabel),
                        React.createElement('span', { className: 'dgt-badge dgt-badge-neutral', style: { fontSize: '0.65rem' } },
                            `${group.questions.length} QUE${group.questions.length !== 1 ? 's' : ''}`),
                        cp && React.createElement('button', {
                            onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            title: `Ir a: ${cp.title}`,
                            style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' }
                        }, '→')
                    ),
                    // Filas de QUEs dentro de este grupo
                    group.questions.map(result => renderQueRow(result, depth))
                );
            })
        );
    };

    // --- Badge Component ---
    const Badge = ({ emoji, count, label, type = 'neutral', onClick, isActive, title }) => {
        const baseClass = `dgt-badge dgt-badge-${type}`;
        const activeClass = isActive ? 'active' : '';
        const clickableClass = onClick ? 'clickable' : '';
        return React.createElement('span', {
            onClick: onClick,
            title: title || label,
            className: `${baseClass} ${activeClass} ${clickableClass}`.trim()
        }, `${emoji} ${count}`);
    };

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header: título + botón procesar
        React.createElement('div', {
            className: 'dgt-flex-row dgt-gap-sm dgt-mb-sm',
            style: { alignItems: 'center' }
        },
            React.createElement('h3', { className: 'dgt-mb-0', style: { fontSize: '1.125rem' } }, 'Coherencia de Ramas'),
            React.createElement('button', {
                onClick: handleBulkVerifyAll,
                title: 'Procesar y verificar coherencia de todas las ramas',
                disabled: isBulkVerifying,
                style: { minWidth: '120px' },
                className: 'dgt-btn dgt-btn-primary'
            }, isBulkVerifying ? (verificationProgress.total > 0 ? `⏳ (${verificationProgress.current}/${verificationProgress.total})` : '⏳ Iniciando...') : '🔄 Procesar')
        ),

        // --- Favorites Bar ---
        React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: 'var(--dgt-bg-secondary)',
                border: '1px solid var(--dgt-border-color)',
                borderRadius: 'var(--dgt-radius-md)',
                flexWrap: 'wrap',
                fontSize: '0.8125rem'
            }
        },
            React.createElement('span', { style: { fontWeight: 600, fontSize: '0.75rem', color: 'var(--dgt-text-secondary)', whiteSpace: 'nowrap' } }, '⭐ Favoritos:'),
            favorites.length === 0 && React.createElement('span', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-muted)' } }, '(guarda tu selección actual)'),
            favorites.map(function (fav) {
                var isActive = isFavoriteActive(fav);
                return React.createElement('span', {
                    key: fav.id,
                    onClick: function () { handleApplyFavorite(fav); },
                    title: fav.name + (isActive ? ' (activo)' : ''),
                    style: {
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: isActive ? 'var(--dgt-accent-green)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--dgt-text-primary)',
                        border: '1px solid ' + (isActive ? 'var(--dgt-accent-green)' : 'var(--dgt-border-color)'),
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                    }
                },
                    React.createElement('span', { style: { fontWeight: isActive ? 600 : 400 } }, '🔖'),
                    React.createElement('span', {
                        style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        title: fav.name
                    }, fav.name),
                    React.createElement('span', {
                        onClick: function (e) { handleDeleteFavorite(fav.id, fav.name, e); },
                        style: { cursor: 'pointer', opacity: 0.6, marginLeft: '2px', fontSize: '0.65rem', color: isActive ? '#fff' : 'var(--dgt-text-muted)' },
                        title: 'Eliminar favorito'
                    }, '✕')
                );
            }),
            React.createElement('button', {
                onClick: handleSaveFavorite,
                title: 'Guardar selección actual como favorito (nombre generado por namespace)',
                style: {
                    background: 'transparent', border: '1px dashed var(--dgt-border-color)',
                    borderRadius: '12px', padding: '2px 10px', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--dgt-text-secondary)'
                }
            }, '+ Guardar')
        ),

        // Barra de resumen con badges y status
        (bulkVerificationResults.length > 0 || bulkVerifyStatus) && React.createElement('div', { className: 'dgt-summary-bar' },
            // Badges — cada uno en su propio wrapper
            bulkVerificationResults.length > 0 && React.createElement('div', {
                className: 'dgt-flex-row dgt-gap-xs dgt-flex-wrap'
            },
                React.createElement(Badge, { emoji: '✅', count: counts.coherent, type: 'success', title: 'Nodos Coherentes' }),
                // 🏛️ Desalineamiento de página contenedora — wrapper con popover
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '🏛️', count: counts.containerMismatch, type: 'warning',
                        title: 'Clic para ver QUEs con proyecto desalineado respecto a su página contenedora',
                        onClick: counts.containerMismatch > 0 ? () => setOpenPopover(openPopover === 'container' ? null : 'container') : undefined,
                        className: counts.containerMismatch > 0 ? 'clickable' : ''
                    }),
                    openPopover === 'container' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `🏛️ ${counts.containerMismatch} con página contenedora desalineada`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults
                            .filter(r => r.containerPage?.containerStatus === 'mismatched' || r.containerPage?.containerStatus === 'no_project')
                            .map(r => {
                                const cp = r.containerPage;
                                const suffix = DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX;
                                const base = cp.title && cp.title.endsWith(suffix) ? cp.title.slice(0, -suffix.length) : (cp.title || '');
                                const shortName = base.split('/').pop() || base;
                                const queTitle = r.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '');
                                const statusLabel = cp.containerStatus === 'no_project' ? '(sin proyecto en contenedor)' : `(contenedor: ${cp.project || '?'})`;
                                
                                const queUid = r.question.pageUid;
                                const queProject = r.coherence.rootProject;
                                const containerProject = cp.project;
                                const containerUid = cp.uid;
                                const sharedCount = bulkVerificationResults.filter(res => res.containerPage && res.containerPage.uid === containerUid).length;

                                return React.createElement('div', { key: r.question.pageUid, className: 'dgt-popover-item', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '6px' } },
                                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%' } },
                                        React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { flexShrink: 0 } }, '🏛️'),
                                        React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, fontWeight: 600 }, title: queTitle }, queTitle),
                                        React.createElement('button', {
                                            onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                                            style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' },
                                            title: `Ir a: ${cp.title}`
                                        }, '→')
                                    ),
                                    React.createElement('span', { className: 'dgt-text-muted', style: { fontSize: '0.65rem', paddingLeft: '2px' } },
                                        `${shortName} ${statusLabel} · QUE: ${queProject || '(sin proyecto)'}`
                                    ),
                                    React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs dgt-flex-wrap', style: { width: '100%', marginTop: '6px', gap: '6px', display: 'flex' } },
                                        // Botón: Propagar al contenedor
                                        (cp.containerStatus === 'no_project' && queProject) && React.createElement('button', {
                                            className: 'dgt-btn dgt-text-xs',
                                            disabled: isPropagating,
                                            style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                            title: `Asignar el proyecto de la QUE ("${queProject}") al contenedor.`,
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleFixContainerAlignment(
                                                    queUid,
                                                    containerUid,
                                                    queProject,
                                                    `¿Asignar el proyecto "${queProject}" de la QUE a la página contenedora?`,
                                                    false
                                                );
                                            }
                                        }, 'Propagar al contenedor'),

                                        // Botón: Heredar del contenedor (cuando la QUE no tiene proyecto)
                                        (cp.containerStatus === 'mismatched' && !queProject && containerProject) && React.createElement('button', {
                                            className: 'dgt-btn dgt-text-xs',
                                            disabled: isPropagating,
                                            style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                            title: `Asignar el proyecto del contenedor ("${containerProject}") a la QUE.`,
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleFixContainerAlignment(
                                                    queUid,
                                                    queUid,
                                                    containerProject,
                                                    `¿Asignar el proyecto del contenedor ("${containerProject}") a esta QUE?`,
                                                    true
                                                 );
                                            }
                                        }, 'Heredar del contenedor'),

                                        // Botones bidireccionales cuando ambos tienen proyecto pero son diferentes
                                        (cp.containerStatus === 'mismatched' && queProject && containerProject) && React.createElement(React.Fragment, null,
                                            React.createElement('button', {
                                                className: 'dgt-btn dgt-text-xs',
                                                disabled: isPropagating,
                                                style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                                title: `Cambiar el proyecto de la QUE a "${containerProject}" (contenedor). Esto cambia el proyecto raíz de toda la rama.`,
                                                onClick: (e) => {
                                                     e.stopPropagation();
                                                     handleFixContainerAlignment(
                                                         queUid,
                                                         queUid,
                                                         containerProject,
                                                         `¿Cambiar el proyecto de la QUE de "${queProject}" a "${containerProject}"?\nEsto afectará a toda la rama y sus nodos hijos podrían necesitar re-sincronización.`,
                                                         true
                                                     );
                                                }
                                            }, 'QUE ← Contenedor'),
                                            React.createElement('button', {
                                                className: 'dgt-btn dgt-text-xs',
                                                disabled: isPropagating,
                                                style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                                title: `Cambiar el proyecto del contenedor a "${queProject}" (QUE). Este contenedor es compartido por ${sharedCount} QUE(s).`,
                                                onClick: (e) => {
                                                     e.stopPropagation();
                                                     handleFixContainerAlignment(
                                                         queUid,
                                                         containerUid,
                                                         queProject,
                                                         `¿Cambiar el proyecto del contenedor de "${containerProject}" a "${queProject}"?\nAdvertencia: Este contenedor es compartido por ${sharedCount} QUE(s) en la vista de verificación.`,
                                                         false
                                                     );
                                                }
                                            }, 'Contenedor ← QUE')
                                         )
                                     )
                                 );
                             })
                    )
                ),
                // ⚠️ Diferente — wrapper propio con popover
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '⚠️', count: counts.different, type: 'warning', title: 'Clic para filtrar árbol | Doble clic popover',
                        onClick: () => setActiveFilter(activeFilter === 'different' ? null : 'different'),
                        isActive: activeFilter === 'different'
                    }),
                    openPopover === 'different' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `⚠️ ${counts.different} con proyecto diferente`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults.flatMap(r => r.coherence.different.map(node =>
                            React.createElement('div', { key: node.uid, className: 'dgt-popover-item', title: node.title },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { flexShrink: 0 } }, node.type),
                                React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, display: 'block' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1')),
                                React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 } }, '→')
                            )
                        ))
                    )
                ),
                // ❌ Sin proyecto — wrapper propio con popover (hermano, no anidado)
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '❌', count: counts.missing, type: 'error', title: 'Clic para filtrar árbol | Doble clic popover',
                        onClick: () => setActiveFilter(activeFilter === 'missing' ? null : 'missing'),
                        isActive: activeFilter === 'missing'
                    }),
                    openPopover === 'missing' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `❌ ${counts.missing} sin proyecto`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults.flatMap(r => r.coherence.missing.map(node =>
                            React.createElement('div', { key: node.uid, className: 'dgt-popover-item', title: node.title },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-error', style: { flexShrink: 0 } }, node.type),
                                React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, display: 'block' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1')),
                                React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 } }, '→')
                            )
                        ))
                    )
                )
            ),
            // Status text
            bulkVerifyStatus && React.createElement('span', {
                className: `dgt-text-xs dgt-text-bold ${bulkVerifyStatus.includes('✅') ? 'dgt-text-success' :
                    bulkVerifyStatus.includes('⚠️') ? 'dgt-text-warning' :
                        bulkVerifyStatus.includes('❌') ? 'dgt-text-error' : 'dgt-text-muted'
                    }`,
                title: 'Estatus'
            }, bulkVerifyStatus)
        ),

        // Vista de árbol jerárquico por proyectos (siempre visible para poder filtrar)
        React.createElement('div', { className: 'dgt-mb-sm dgt-flex-column', style: { flex: 1, minHeight: 0, border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-md)', overflow: 'hidden' } },
            // Checkbox "Seleccionar todos"
            React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm', style: { alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--dgt-border-color)', backgroundColor: 'var(--dgt-bg-secondary)' } },
                React.createElement('input', {
                    type: 'checkbox',
                    id: 'selectAllProjectsBranches',
                    checked: selectedProjects.size >= allProjectsPathsSet.size,
                    onChange: handleToggleSelectAll,
                    style: { margin: 0, cursor: 'pointer' }
                }),
                React.createElement('label', { htmlFor: 'selectAllProjectsBranches', style: { cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, margin: 0, userSelect: 'none', color: 'var(--dgt-text-primary)' } }, 'Seleccionar / Deseleccionar todos los proyectos')
            ),
            React.createElement('div', {
                className: 'dgt-tree-container',
                style: { border: 'none', borderRadius: 0, flex: 1 }
            },
                React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                    tree: projectTree,
                    renderNodeHeader: renderBranchesNodeHeader,
                    renderNodeContent: renderBranchesNodeContent,
                    defaultExpanded: activeFilter !== null // Auto expandir si hay un filtro
                })
            )
        ),
        
        // Nuevo Overlay Flotante
        selectedBulkQuestion && renderQueResolutionOverlay()
    );
};


// --- MODULE: src/ui/tabs/NodesTab.js ---
// ============================================================================
// UI: Nodes Tab Component
// ============================================================================

DiscourseGraphToolkit.NodesTab = function () {
    const React = window.React;

    // Estado local — este tab no necesita compartir estado con otros tabs
    const [orphanResults, setOrphanResults] = React.useState([]);
    const [isSearchingOrphans, setIsSearchingOrphans] = React.useState(false);

    // --- Helpers (shared) ---
    const parseMarkdownBold = DiscourseGraphToolkit.parseMarkdownBold;
    const handleNavigateToPage = DiscourseGraphToolkit.navigateToPage.bind(DiscourseGraphToolkit);

    // --- Handlers ---
    const handleFindOrphans = async () => {
        setIsSearchingOrphans(true);
        try {
            const orphans = await DiscourseGraphToolkit.findOrphanNodes();
            setOrphanResults(orphans);
            DiscourseGraphToolkit.showToast(`Encontrados ${orphans.length} huérfanos.`, 'success');
        } catch (e) {
            console.error('Orphan search error:', e);
            DiscourseGraphToolkit.showToast('Error al buscar huérfanos: ' + e.message, 'error');
        } finally {
            setIsSearchingOrphans(false);
        }
    };

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header
        React.createElement('div', {
            className: 'dgt-flex-between dgt-flex-wrap dgt-gap-md dgt-mb-sm',
            style: { alignItems: 'flex-start' }
        },
            // Left side: Title and search button
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-sm' },
                React.createElement('h3', { className: 'dgt-mb-0', style: { fontSize: '1.125rem' } }, 'Nodos Huérfanos'),
                React.createElement('div', { className: 'dgt-text-secondary dgt-text-sm dgt-mb-xs' },
                    'Nodos (GRI, QUE, CLM, EVD) que no pertenecen a ningún proyecto y no están conectados a otros nodos.'
                ),
                React.createElement('button', {
                    onClick: handleFindOrphans,
                    title: 'Buscar ramas o nodos que no tienen un proyecto asignado ni conexiones',
                    disabled: isSearchingOrphans,
                    className: 'dgt-btn dgt-btn-primary'
                }, isSearchingOrphans ? '⏳ Buscando...' : '👻 Buscar Huérfanos')
            ),

            // Right side: Counter badge
            orphanResults.length > 0 &&
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-xs', style: { alignItems: 'flex-end' } },
                React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { fontSize: '0.875rem' } },
                    `👻 ${orphanResults.length} Encontrados`
                )
            )
        ),

        // Result List Content
        orphanResults.length > 0 ? (
            React.createElement('div', { className: 'dgt-card', style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none', background: 'transparent' } },
                React.createElement('div', { className: 'dgt-list-container dgt-scrollable dgt-p-sm', style: { flex: 1, maxHeight: 'none', border: '1px solid var(--dgt-border-color)' } },
                    orphanResults.map(node =>
                        React.createElement('div', { key: node.uid, className: 'dgt-popover-item', style: { padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-md)', background: '#fff' } },
                            React.createElement('span', { className: 'dgt-text-warning dgt-text-sm', style: { fontSize: '1.25rem', flexShrink: 0 } }, '👻'),
                            React.createElement('div', { style: { flex: 1, lineHeight: '1.5', padding: '0 0.5rem' } },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-neutral dgt-mr-xs' }, node.type),
                                React.createElement('div', { className: 'dgt-text-sm dgt-text-primary dgt-text-bold', style: { fontSize: '0.9375rem', marginBottom: '4px' } }, parseMarkdownBold((node.title || '').replace(/\[\[(GRI|CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1'))),
                                React.createElement('div', { className: 'dgt-text-secondary', style: { fontSize: '0.75rem', opacity: 0.8 } },
                                    `Referencias de Discourse: ${node.refCount || 0}`
                                )
                            ),
                            React.createElement('button', {
                                onClick: () => handleNavigateToPage(node.uid),
                                className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '6px 12px', flexShrink: 0 }
                            }, '→ Ir al Nodo')
                        )
                    )
                )
            )
        ) : (
            !isSearchingOrphans && orphanResults.length === 0 && React.createElement('div', { className: 'dgt-flex-column', style: { alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--dgt-text-muted)' } },
                React.createElement('span', { style: { fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 } }, '📝'),
                React.createElement('p', null, 'Haz clic en "Buscar Huérfanos" para analizar el grafo.')
            )
        )
    );
};


// --- MODULE: src/ui/tabs/PanoramicTab.js ---
// ============================================================================
// UI: Panoramic Tab Component
// Vista sintética de todas las ramas del grafo de discurso
// ============================================================================

DiscourseGraphToolkit.PanoramicTab = function () {
    const React = window.React;

    // Desestructurar de los contextos específicos
    const { projects } = DiscourseGraphToolkit.useProjects();
    const {
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions: expandedQuestions, setPanoramicExpandedQuestions: setExpandedQuestions,
        panoramicLoadStatus: loadStatus, setPanoramicLoadStatus: setLoadStatus,
        panoramicSelectedProject: selectedProject, setPanoramicSelectedProject: setSelectedProject
    } = DiscourseGraphToolkit.usePanoramic();

    // Estado de carga (local, no necesita persistir)
    const [isLoading, setIsLoading] = React.useState(false);

    // Estados para selector de proyectos colapsable
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
    const [expandedProjectFolders, setExpandedProjectFolders] = React.useState({});
    const projectDropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Orden de nodos (solo lectura — se edita en Exportación › Paso 3)
    const [orderedQuestionUIDs, setOrderedQuestionUIDs] = React.useState([]);
    const [orderedGroupKeys, setOrderedGroupKeys] = React.useState([]);

    // Estado para tracking del timestamp del cache
    const [cacheTimestamp, setCacheTimestamp] = React.useState(null);

    // --- Estado D&D ---
    const [dragType, setDragType] = React.useState(null); // 'group' | 'node'
    const [dragGroupKey, setDragGroupKey] = React.useState(null);
    const [dragIdx, setDragIdx] = React.useState(null);
    const [dragOverIdx, setDragOverIdx] = React.useState(null);

    // --- D&D handlers para grupos ---
    const handleGroupDragStart = (e, idx) => { setDragType('group'); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleGroupDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleGroupDragOver = (e) => { e.preventDefault(); };
    const handleGroupDragEnd = () => { setDragType(null); setDragIdx(null); setDragOverIdx(null); };
    const handleGroupDrop = (e, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) { handleGroupDragEnd(); return; }
        const newGroups = [...orderedGroupKeys];
        const [item] = newGroups.splice(dragIdx, 1);
        newGroups.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        setOrderedGroupKeys(newGroups);
        DiscourseGraphToolkit.saveGroupOrder(selectedProject, newGroups);
        handleGroupDragEnd();
    };

    // --- D&D handlers para nodos ---
    const handleNodeDragStart = (e, groupKey, idx) => { setDragType('node'); setDragGroupKey(groupKey); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleNodeDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleNodeDragOver = (e) => { e.preventDefault(); };
    const handleNodeDragEnd = () => { setDragType(null); setDragGroupKey(null); setDragIdx(null); setDragOverIdx(null); };
    const handleNodeDrop = (e, groupKey, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx || dragGroupKey !== groupKey) { handleNodeDragEnd(); return; }
        
        let targetList = groupKey ? orderedQuestionUIDsForGroup(groupKey) : [...orderedQuestionUIDs];
        
        const [item] = targetList.splice(dragIdx, 1);
        targetList.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        
        if (groupKey) {
            DiscourseGraphToolkit.saveQuestionOrder(groupKey, targetList);
            // We force a re-render of this specific group by updating a dummy state or relying on the fact that we can just update the group Nodes in cache. Wait.
            // In grouped mode, we don't have a single orderedQuestionUIDs array. Let's just save it to localStorage and trigger a re-render by updating a timestamp.
            setCacheTimestamp(Date.now());
        } else {
            setOrderedQuestionUIDs(targetList);
            DiscourseGraphToolkit.saveQuestionOrder(selectedProject, targetList);
        }
        handleNodeDragEnd();
    };

    const orderedQuestionUIDsForGroup = (groupKey) => {
        const groupNodes = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === groupKey || q.project.startsWith(groupKey + '/');
        });
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(groupKey);
        if (savedOrder && savedOrder.length > 0) {
            const validSaved = savedOrder.filter(uid => groupNodes.some(q => q.uid === uid));
            const newUids = groupNodes.filter(q => !savedOrder.includes(q.uid)).map(q=>q.uid);
            return [...validSaved, ...newUids];
        }
        return groupNodes.map(q=>q.uid);
    };


    // --- Computar sub-proyectos inmediatos y modo agrupado ---
    const immediateSubProjects = React.useMemo(() => {
        if (!panoramicData || !selectedProject) return [];
        const selectedDepth = selectedProject.split('/').length;
        const subProjects = new Set();
        Object.values(panoramicData.allNodes).forEach(node => {
            if (node.project && node.project.startsWith(selectedProject + '/')) {
                const parts = node.project.split('/');
                if (parts.length > selectedDepth) {
                    const immediateChild = parts.slice(0, selectedDepth + 1).join('/');
                    subProjects.add(immediateChild);
                }
            }
        });
        return Array.from(subProjects).sort();
    }, [panoramicData, selectedProject]);

    const isGroupedMode = selectedProject && immediateSubProjects.length > 0;

    // Cargar orden guardado (escrito por ExportTab › Paso 3) cuando cambia el proyecto
    React.useEffect(() => {
        if (!panoramicData || !selectedProject) {
            setOrderedQuestionUIDs([]);
            setOrderedGroupKeys([]);
            return;
        }
        if (isGroupedMode) {
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(selectedProject);
            if (savedGroupOrder && savedGroupOrder.length > 0) {
                const valid = savedGroupOrder.filter(g => immediateSubProjects.includes(g));
                const newOnes = immediateSubProjects.filter(g => !savedGroupOrder.includes(g));
                setOrderedGroupKeys([...valid, ...newOnes]);
            } else {
                setOrderedGroupKeys([...immediateSubProjects]);
            }
            setOrderedQuestionUIDs([]);
        } else {
            const projectQuestions = panoramicData.questions.filter(q => {
                if (!q.project) return false;
                return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
            });
            const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(selectedProject);
            if (savedOrder && savedOrder.length > 0) {
                const ordered = savedOrder.filter(uid => projectQuestions.some(q => q.uid === uid));
                const unseen = projectQuestions.filter(q => !savedOrder.includes(q.uid)).map(q => q.uid);
                setOrderedQuestionUIDs([...ordered, ...unseen]);
            } else {
                setOrderedQuestionUIDs(projectQuestions.map(q => q.uid));
            }
            setOrderedGroupKeys([]);
        }
    }, [panoramicData, selectedProject, isGroupedMode, immediateSubProjects.length]);


    // --- Helpers ---
    const cleanTitle = (title, type) => {
        return (title || '').replace(new RegExp(`\\[\\[${type}\\]\\]\\s*-\\s*`), '');
    };

    const renderMarkdownTitle = (text) => {
        if (!text) return null;
        // Divide el texto por secuencias de negrita (**texto** o __texto__)
        const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
        return parts.map((part, index) => {
            if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
                return React.createElement('strong', { key: index }, part.slice(2, -2));
            }
            return part; // Texto normal (String)
        });
    };

    const formatTimeAgo = (timestamp) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'menos de 1 minuto';
        if (mins < 60) return `${mins} minuto${mins !== 1 ? 's' : ''}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''}`;
        const days = Math.floor(hours / 24);
        return `${days} día${days !== 1 ? 's' : ''}`;
    };

    // Efecto para restaurar cache al montar (solo si no hay datos)
    React.useEffect(() => {
        if (!panoramicData) {
            const cached = DiscourseGraphToolkit.loadPanoramicCache();
            if (cached && cached.panoramicData) {
                setPanoramicData(cached.panoramicData);
                setCacheTimestamp(cached.timestamp);
                setLoadStatus(`📦 Datos restaurados del cache.`);
            }
        }
    }, []); // Solo al montar

    // --- Helpers de Relevancia del Proyecto ---
    const relevanceCache = React.useMemo(() => new Map(), [panoramicData, selectedProject]);

    const isNodeRelevant = React.useCallback((uid, allNodes, targetProject, visited = new Set()) => {
        if (!targetProject) return true;
        if (relevanceCache.has(uid)) return relevanceCache.get(uid);
        if (visited.has(uid)) return false;

        visited.add(uid);
        const node = allNodes[uid];
        if (!node) return false;

        // Is it a direct match?
        if (node.project && (node.project === targetProject || node.project.startsWith(targetProject + '/'))) {
            relevanceCache.set(uid, true);
            return true;
        }

        // Check descendants
        const nodeType = node.type || DiscourseGraphToolkit.getNodeType(node.title);
        let childrenUids = [];
        if (nodeType === 'GRI') childrenUids = node.contained_nodes || [];
        else if (nodeType === 'QUE') childrenUids = [...(node.related_clms || []), ...(node.direct_evds || [])];
        else if (nodeType === 'CLM') childrenUids = [...(node.related_evds || []), ...(node.supporting_clms || [])];

        for (const childUid of childrenUids) {
            if (isNodeRelevant(childUid, allNodes, targetProject, new Set(visited))) {
                relevanceCache.set(uid, true);
                return true;
            }
        }

        relevanceCache.set(uid, false);
        return false;
    }, [relevanceCache]);

    // --- Cargar datos panorámicos ---
    const handleLoadPanoramic = async () => {
        setIsLoading(true);
        setLoadStatus('⏳ Buscando nodos raíz (GRI + QUE)...');
        setPanoramicData(null);

        try {
            // 1. Obtener todos los nodos raíz (GRI y QUE) del grafo
            const rootNodes = await DiscourseGraphToolkit.getAllRootNodes();
            setLoadStatus(`⏳ Encontrados ${rootNodes.length} nodos raíz. Cargando datos...`);

            // 2. Obtener datos completos de los nodos raíz
            const uids = rootNodes.map(q => q.pageUid);
            const result = await DiscourseGraphToolkit.exportPagesNative(
                uids, null, (msg) => setLoadStatus(`⏳ ${msg}`), true, false
            );

            // 3. Construir mapa de nodos
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });

            // 4. Analizar dependencias y cargar nodos faltantes RECURSIVAMENTE
            setLoadStatus('⏳ Analizando relaciones...');

            let missingUids = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            missingUids = [...missingUids].filter(uid => !allNodes[uid]);

            let depth = 0;
            const maxDepth = 5; // Evitar loops infinitos en caso de referencias circulares muy complejas

            while (missingUids.length > 0 && depth < maxDepth) {
                setLoadStatus(`⏳ Cargando ${missingUids.length} nodos relacionados (nively ${depth + 1})...`);
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, true, false);

                const newNodesFetched = [];
                extraData.data.forEach(node => {
                    if (node.uid && !allNodes[node.uid]) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                        newNodesFetched.push(node);
                    }
                });

                // Buscar si los nuevos nodos traen más dependencias
                const newDependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(newNodesFetched);
                missingUids = [...newDependencies].filter(uid => !allNodes[uid]);
                depth++;
            }

            if (depth === maxDepth && missingUids.length > 0) {
                console.warn(`Vista Panorámica: Se alcanzó la profundidad máxima de relaciones anidadas, faltan ${missingUids.length} referencias.`);
            }

            // 5. Mapear relaciones
            console.log(`📊 Vista Panorámica (v${DiscourseGraphToolkit.VERSION}): ${Object.keys(allNodes).length} nodos en allNodes antes de mapear relaciones.`);
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // 5.1 Debug: Verificar que las relaciones se mapearon correctamente
            const clmsWithSupporting = Object.values(allNodes).filter(n => n.type === 'CLM' && (n.supporting_clms || []).length > 0);
            const clmsWithEvds = Object.values(allNodes).filter(n => n.type === 'CLM' && (n.related_evds || []).length > 0);
            console.log(`📊 CLMs con supporting_clms: ${clmsWithSupporting.length}, CLMs con related_evds: ${clmsWithEvds.length}`);

            // 5.5 Construir set de nodos que son hijos de algún GRI (para excluirlos como raíz)
            const childNodeUids = new Set();
            Object.values(allNodes).forEach(node => {
                if (node.type === 'GRI' && node.contained_nodes) {
                    node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                }
            });

            // 6. Obtener proyectos de *todos* los nodos cargados en allNodes
            setLoadStatus('⏳ Obteniendo proyectos...');
            const allNodeUids = Object.keys(allNodes);

            // Usar query en bloque para mayor eficiencia
            const PM = DiscourseGraphToolkit.ProjectManager;
            const escapedPattern = PM.getEscapedFieldPattern();
            const projectQuery = `[:find ?page-uid ?string
                                   :in $ [?page-uid ...]
                                   :where 
                                   [?page :block/uid ?page-uid]
                                   [?page :block/children ?block]
                                   [?block :block/string ?string]
                                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            try {
                const projectResults = await window.roamAlphaAPI.data.async.q(projectQuery, allNodeUids);
                const fieldPattern = PM.getFieldPattern();
                const regex = PM.getFieldRegex();

                projectResults.forEach(r => {
                    const docUid = r[0];
                    const blockString = r[1];
                    if (!DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                        const match = blockString.match(regex);
                        if (match && allNodes[docUid]) {
                            allNodes[docUid].project = match[1].trim();
                        }
                    }
                });
            } catch (e) {
                console.warn("No se pudieron obtener los proyectos en bulk:", e);
                // Fallback: procesar uno a uno los rootNodes
                for (const q of rootNodes) {
                    const project = await DiscourseGraphToolkit.getProjectFromNode(q.pageUid);
                    if (allNodes[q.pageUid]) {
                        allNodes[q.pageUid].project = project;
                    }
                }
            }

            // 7. Filtrar GRI y QUE del resultado como nodos raíz (excluyendo hijos de otro GRI)
            const rootNodeResults = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
            }).map(node => ({
                ...node,
                project: allNodes[node.uid]?.project || null
            }));

            setPanoramicData({ questions: rootNodeResults, allNodes });
            // Guardar en cache
            DiscourseGraphToolkit.savePanoramicCache({ questions: rootNodeResults, allNodes });
            setCacheTimestamp(Date.now());
            const griCount = rootNodeResults.filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length;
            const queCount = rootNodeResults.filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'QUE').length;
            setLoadStatus(`✅ Cargados ${rootNodeResults.length} nodos raíz (${griCount} GRI, ${queCount} QUE) con ${Object.keys(allNodes).length} nodos totales.`);

        } catch (e) {
            console.error('Error loading panoramic:', e);
            setLoadStatus('❌ Error: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Renderizar un nodo raíz (QUE o GRI) como fila plana ---
    const renderQuestion = (question, allNodes, showDragHandle = false, qIndex = -1, groupKey = null) => {
        const isNodeDragOver = dragType === 'node' && dragGroupKey === groupKey && dragOverIdx === qIndex;
        const nodeType = DiscourseGraphToolkit.getNodeType(question.title) || 'QUE';
        const badgeClass = nodeType === 'GRI' ? 'dgt-badge-info' : 'dgt-badge-neutral';

        let displayProject = question.project;
        if (selectedProject && question.project && question.project.startsWith(selectedProject)) {
            displayProject = question.project.substring(selectedProject.length).replace(/^\//, '');
        }

        return React.createElement('div', {
            key: question.uid,
            draggable: true,
            onDragStart: e => handleNodeDragStart(e, groupKey, qIndex),
            onDragEnter: e => handleNodeDragEnter(e, qIndex),
            onDragOver: handleNodeDragOver,
            onDragEnd: handleNodeDragEnd,
            onDrop: e => handleNodeDrop(e, groupKey, qIndex),
            style: { 
                borderTop: isNodeDragOver ? '2px dashed var(--dgt-accent-purple)' : '1px solid var(--dgt-border-color)', 
                opacity: dragType === 'node' && dragGroupKey === groupKey && dragIdx === qIndex ? 0.4 : 1,
                cursor: 'grab'
            },
            className: `dgt-panoramic-root dgt-panoramic-root-${nodeType.toLowerCase()}`
        },
            React.createElement('div', {
                className: 'dgt-panoramic-node-row',
                style: { padding: '8px 8px 8px 0', gap: '6px' }
            },
                // Badge de tipo (QUE/GRI)
                React.createElement('span', {
                    className: `dgt-badge ${badgeClass}`,
                    style: { flexShrink: 0, marginTop: '2px' }
                }, nodeType),
                React.createElement('span', {
                    className: 'dgt-text-primary dgt-text-bold',
                    style: { fontSize: '0.8125rem', flex: 1, wordBreak: 'break-word' },
                    title: question.title
                }, renderMarkdownTitle(cleanTitle(question.title, nodeType))),
                displayProject && React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral',
                    style: { fontSize: '0.625rem', backgroundColor: 'transparent', border: '1px solid var(--dgt-border-color)' }
                }, displayProject)
            )
        );
    };

    // --- Obtener nodos ordenados para un sub-proyecto específico ---
    const getOrderedNodesForGroup = (groupKey) => {
        if (!panoramicData) return [];
        // Obtener nodos que pertenecen a este grupo (o a sus sub-sub-proyectos)
        const groupNodes = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === groupKey || q.project.startsWith(groupKey + '/');
        });
        
        // Intentar cargar el orden guardado para este sub-proyecto
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(groupKey);
        if (savedOrder && savedOrder.length > 0) {
            const orderedNodes = savedOrder
                .map(uid => groupNodes.find(q => q.uid === uid))
                .filter(Boolean);
            const newNodes = groupNodes.filter(q => !savedOrder.includes(q.uid));
            return [...orderedNodes, ...newNodes];
        }
        return groupNodes;
    };

    // --- Renderizar un grupo de sub-proyecto (solo lectura) ---
    const renderSubProjectGroup = (groupKey, groupIndex) => {
        const isGroupDragOver = dragType === 'group' && dragOverIdx === groupIndex;
        const groupNodes = getOrderedNodesForGroup(groupKey);
        const groupLabel = groupKey.split('/').pop();
        const isExpanded = expandedQuestions[`group:${groupKey}`] === true;

        return React.createElement('div', {
            key: groupKey,
            draggable: true,
            onDragStart: e => handleGroupDragStart(e, groupIndex),
            onDragEnter: e => handleGroupDragEnter(e, groupIndex),
            onDragOver: handleGroupDragOver,
            onDragEnd: handleGroupDragEnd,
            onDrop: e => handleGroupDrop(e, groupIndex),
            style: { 
                border: isGroupDragOver ? '2px dashed var(--dgt-accent-purple)' : undefined,
                opacity: dragType === 'group' && dragIdx === groupIndex ? 0.4 : 1,
                cursor: 'grab'
            },
            className: 'dgt-panoramic-group'
        },
            // Header del grupo
            React.createElement('div', {
                className: 'dgt-panoramic-group-header',
                onClick: () => {
                    setExpandedQuestions(prev => {
                        const key = `group:${groupKey}`;
                        const newState = { ...prev, [key]: !prev[key] };
                        DiscourseGraphToolkit.savePanoramicExpandedQuestions(newState);
                        return newState;
                    });
                }
            },
                // Flecha de expandir/colapsar
                React.createElement('span', {
                    className: 'dgt-text-muted',
                    style: { fontSize: '0.6rem', width: '0.75rem', display: 'flex', alignItems: 'center', flexShrink: 0 }
                }, isExpanded ? '▼' : '▶'),

                // Nombre del grupo
                React.createElement('span', {
                    className: 'dgt-text-primary dgt-text-bold',
                    style: { fontSize: '0.875rem', flex: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }
                }, groupLabel),

                // Contador de nodos
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral',
                    style: { fontSize: '0.625rem' }
                }, `${groupNodes.length} nodo${groupNodes.length !== 1 ? 's' : ''}`),

                // Botón de navegación al sub-proyecto
                React.createElement('button', {
                    className: 'dgt-panoramic-group-nav',
                    title: `Ir a ${groupKey}`,
                    onClick: (e) => {
                        e.stopPropagation();
                        setSelectedProject(groupKey);
                    }
                }, '→')
            ),

            // Cuerpo expandible con los nodos del grupo
            isExpanded && React.createElement('div', {
                className: 'dgt-panoramic-group-body'
            },
                groupNodes.length > 0
                    ? groupNodes.map((q, idx) => renderQuestion(q, panoramicData.allNodes, false, idx, groupKey))
                    : React.createElement('span', {
                        className: 'dgt-text-muted dgt-text-xs',
                        style: { fontStyle: 'italic', padding: '8px' }
                    }, 'Sin nodos en este sub-proyecto')
            )
        );
    };

    // --- Filtrar preguntas por proyecto (respetando orden) — para modo INDIVIDUAL ---
    const getFilteredQuestions = () => {
        if (!panoramicData) return [];
        if (!selectedProject) return panoramicData.questions;
        // Si hay orden guardado, usarlo
        if (orderedQuestionUIDs.length > 0) {
            return orderedQuestionUIDs
                .map(uid => panoramicData.questions.find(q => q.uid === uid))
                .filter(Boolean)
                .filter(q => isNodeRelevant(q.uid, panoramicData.allNodes, selectedProject));
        }
        return panoramicData.questions.filter(q => isNodeRelevant(q.uid, panoramicData.allNodes, selectedProject));
    };

    // --- Obtener lista jerárquica de proyectos (memoizada, un solo pase) ---
    const hierarchicalProjects = React.useMemo(() => {
        if (!panoramicData) return [];
        const allPrefixes = new Set();
        const leafProjects = new Set();
        // Pre-compute counts in a single pass: O(N) instead of O(prefixes × N)
        const countMap = new Map();

        Object.values(panoramicData.allNodes).forEach(node => {
            if (node.project) {
                // Agregar la rama completa (es una hoja)
                leafProjects.add(node.project);
                allPrefixes.add(node.project);
                // Agregar todos los prefijos intermedios e incrementar contadores
                const parts = node.project.split('/');
                for (let i = 1; i <= parts.length; i++) {
                    const prefix = parts.slice(0, i).join('/');
                    allPrefixes.add(prefix);
                    countMap.set(prefix, (countMap.get(prefix) || 0) + 1);
                }
            }
        });

        // Ordenar y agregar metadata (es grupo o hoja, contador)
        const sorted = Array.from(allPrefixes).sort();
        return sorted.map(prefix => {
            const isLeaf = leafProjects.has(prefix);
            const count = countMap.get(prefix) || 0;
            const depth = prefix.split('/').length - 1;
            return { prefix, isLeaf, count, depth };
        });
    }, [panoramicData]);

    const filteredQuestions = isGroupedMode ? [] : getFilteredQuestions();

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header con layout de dos columnas: título a la izquierda, controles a la derecha
        React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm dgt-gap-md', style: { alignItems: 'flex-start' } },
            // Columna izquierda: título y descripción
            React.createElement('div', { style: { flex: '1' } },
                React.createElement('h3', { className: 'dgt-mb-xs', style: { marginTop: 0 } }, 'Vista Panorámica'),
                React.createElement('p', { className: 'dgt-text-secondary dgt-text-sm dgt-mb-0' },
                    'Vista sintética de todas las ramas del grafo de discurso.')
            ),
            // Columna derecha: controles compactos
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-xs', style: { alignItems: 'flex-end', flexShrink: 0 } },
                // Fila 1: Botón cargar + dropdown
                React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm' },
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        disabled: isLoading,
                        className: 'dgt-btn dgt-btn-primary'
                    }, isLoading ? '⏳...' : '🔄 Cargar'),
                    // Filtro de proyecto (jerárquico custom)
                    panoramicData && hierarchicalProjects.length > 0 && React.createElement('div', {
                        ref: projectDropdownRef,
                        style: { position: 'relative', minWidth: '220px', maxWidth: '300px' }
                    },
                        // Botón Principal
                        React.createElement('div', {
                            className: 'dgt-input dgt-text-xs',
                            onClick: () => setIsProjectDropdownOpen(!isProjectDropdownOpen),
                            style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', userSelect: 'none', backgroundColor: 'var(--dgt-bg-primary, #ffffff)' }
                        },
                            React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' } },
                                selectedProject ? selectedProject.split('/').pop() : `Todos (${panoramicData.questions.length})`
                            ),
                            React.createElement('span', { style: { fontSize: '0.6rem', opacity: 0.6, marginLeft: '8px' } }, isProjectDropdownOpen ? '▲' : '▼')
                        ),
                        
                        // Menú Desplegable
                        isProjectDropdownOpen && React.createElement('div', {
                            style: { position: 'absolute', top: '100%', right: 0, minWidth: '100%', width: 'max-content', maxHeight: '400px', overflowY: 'auto', backgroundColor: 'var(--dgt-bg-primary, white)', border: '1px solid var(--dgt-border-focus, #b5b3ad)', borderRadius: 'var(--dgt-radius-sm, 6px)', zIndex: 1000, boxShadow: 'var(--dgt-shadow-md, 0 4px 12px rgba(0,0,0,0.1))', marginTop: '4px', padding: '4px 0' }
                        },
                            // Opción "Todos"
                            React.createElement('div', {
                                className: 'dgt-text-xs',
                                onClick: () => { setSelectedProject(''); setIsProjectDropdownOpen(false); },
                                style: { display: 'flex', padding: '6px 12px', cursor: 'pointer', backgroundColor: selectedProject === '' ? 'var(--dgt-bg-secondary, #f0f0f0)' : 'transparent', fontWeight: selectedProject === '' ? 'bold' : 'normal', userSelect: 'none' }
                            }, `Todos (${panoramicData.questions.length})`),
                            
                            // Lista Jerárquica de Opciones
                            hierarchicalProjects.map((p, index) => {
                                const parts = p.prefix.split('/');
                                let isVisible = true;
                                // Sólo mostrar si todos los padres están expandidos
                                for(let i = 1; i < parts.length; i++) {
                                    const parentPrefix = parts.slice(0, i).join('/');
                                    if (!expandedProjectFolders[parentPrefix]) isVisible = false;
                                }
                                if (!isVisible) return null;
                                
                                const nextp = hierarchicalProjects[index + 1];
                                const hasChildren = nextp && nextp.prefix.startsWith(p.prefix + '/');
                                const isExpanded = !!expandedProjectFolders[p.prefix];
                                const indent = p.depth * 14;
                                
                                return React.createElement('div', {
                                    key: p.prefix,
                                    className: 'dgt-text-xs',
                                    style: { display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${12 + indent}px`, cursor: 'pointer', backgroundColor: selectedProject === p.prefix ? 'var(--dgt-bg-secondary, #f0f0f0)' : 'transparent', fontWeight: selectedProject === p.prefix ? 'bold' : 'normal', userSelect: 'none' }
                                },
                                    // Flecha Toggle o Espaciador
                                    React.createElement('div', {
                                        style: { width: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: hasChildren ? 'pointer' : 'default', opacity: hasChildren ? 0.6 : 0, transition: 'transform 0.2s' },
                                        onClick: hasChildren ? (e) => {
                                            e.stopPropagation();
                                            setExpandedProjectFolders(prev => ({ ...prev, [p.prefix]: !prev[p.prefix] }));
                                        } : undefined
                                    }, hasChildren ? (isExpanded ? '▼' : '▶') : '•'),
                                    
                                    // Etiqueta del Proyecto
                                    React.createElement('div', {
                                        style: { marginLeft: '4px', whiteSpace: 'nowrap', flex: 1 },
                                        onClick: () => { setSelectedProject(p.prefix); setIsProjectDropdownOpen(false); }
                                    }, p.prefix.split('/').pop(), React.createElement('span', { style: { opacity: 0.6, marginLeft: '4px' } }, `(${p.count})`))
                                );
                            })
                        )
                    )
                ),
                // Fila 2: Botones expandir/colapsar (solo para grupos en modo agrupado)
                panoramicData && React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs' },
                    React.createElement('button', {
                        onClick: () => {
                            const allExpanded = {};
                            // Expandir grupos si modo agrupado
                            if (isGroupedMode) {
                                orderedGroupKeys.forEach(gk => allExpanded[`group:${gk}`] = true);
                            }
                            setExpandedQuestions(allExpanded);
                            DiscourseGraphToolkit.savePanoramicExpandedQuestions(allExpanded);
                        },
                        className: 'dgt-btn-ghost dgt-text-xs',
                        style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', padding: '2px 6px' }
                    }, '➕ Expandir grupos'),
                    React.createElement('button', {
                        onClick: () => {
                            setExpandedQuestions({});
                            DiscourseGraphToolkit.savePanoramicExpandedQuestions({});
                        },
                        className: 'dgt-btn-ghost dgt-text-xs',
                        style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', padding: '2px 6px' }
                    }, '➖ Colapsar todo')
                ),
                // Fila 3: Estadísticas compactas (solo QUE y GRI)
                panoramicData && React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs' },
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `QUE: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => (DiscourseGraphToolkit.getNodeType(n.title) || 'QUE') === 'QUE').length}`),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `GRI: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length}`)
                )
            )
        ),

        // Status (compacto, solo si hay mensajes de carga activa)
        loadStatus && !loadStatus.includes('📦') && React.createElement('div', {
            className: `dgt-p-sm dgt-mb-sm dgt-text-xs dgt-text-bold ${loadStatus.includes('✅') ? 'dgt-text-success' : loadStatus.includes('❌') ? 'dgt-text-error' : 'dgt-text-muted'}`,
            style: { backgroundColor: 'var(--dgt-bg-secondary)', borderRadius: 'var(--dgt-radius-sm)' }
        }, loadStatus),

        // Indicador de modo agrupado
        isGroupedMode && React.createElement('div', {
            className: 'dgt-p-sm dgt-mb-sm dgt-text-xs',
            style: { backgroundColor: 'rgba(108, 92, 153, 0.06)', borderRadius: 'var(--dgt-radius-sm)', border: '1px solid rgba(108, 92, 153, 0.15)', color: 'var(--dgt-accent-purple)' }
        }, `📦 Vista agrupada: ${orderedGroupKeys.length} sub-proyecto${orderedGroupKeys.length !== 1 ? 's' : ''}. Arrastra los bloques para reordenar.`),

        // Lista de contenido principal
        panoramicData && React.createElement('div', { className: 'dgt-list-container dgt-p-sm' },
            isGroupedMode
                // Modo agrupado: renderizar grupos de sub-proyectos
                ? (orderedGroupKeys.length > 0
                    ? orderedGroupKeys.map((gk, index) => renderSubProjectGroup(gk, index))
                    : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                        'No hay sub-proyectos para mostrar.')
                )
                // Modo individual: renderizar nodos planos (comportamiento original)
                : (filteredQuestions.length > 0
                    ? filteredQuestions.map((q, index) => renderQuestion(q, panoramicData.allNodes, true, index, null))
                    : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                        'No hay preguntas para mostrar' + (selectedProject ? ' en este proyecto.' : '.'))
                )
        ),

        // Mensaje inicial
        !panoramicData && !isLoading && React.createElement('div', {
            className: 'dgt-p-md dgt-text-muted dgt-text-center',
            style: {
                backgroundColor: 'var(--dgt-bg-primary)',
                borderRadius: 'var(--dgt-radius-sm)',
                border: '1px dashed var(--dgt-border-focus)'
            }
        },
            React.createElement('p', { style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, ''),
            React.createElement('p', null, 'Haz clic en "Cargar Panorámica" para visualizar todas las ramas del grafo.')
        )
    );
};


// --- MODULE: src/ui/tabs/ExportTab.js ---
// ============================================================================
// UI: Export Tab Component
// ============================================================================

DiscourseGraphToolkit.ExportTab = function () {
    const React = window.React;
    const { projects } = DiscourseGraphToolkit.useProjects();
    const {
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        skeletonMode, setSkeletonMode,
        includeProjectMetadata, setIncludeProjectMetadata,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        groupNamespaces, setGroupNamespaces,
        hideNodeLabels, setHideNodeLabels,
        useAcademicNumbering, setUseAcademicNumbering
    } = DiscourseGraphToolkit.useExport();

    // --- Favorites ---
    const [favorites, setFavorites] = React.useState([]);

    // Cargar favoritos al montar
    React.useEffect(() => {
        setFavorites(DiscourseGraphToolkit.FavoritesService.getAll('export'));
    }, []);

    const handleSaveFavorite = () => {
        const data = {
            selectedProjects: { ...selectedProjects },
            selectedTypes: { ...selectedTypes },
            contentConfig: { ...contentConfig },
            excludeBitacora: excludeBitacora,
            skeletonMode: skeletonMode,
            includeProjectMetadata: includeProjectMetadata,
            groupNamespaces: groupNamespaces,
            hideNodeLabels: hideNodeLabels,
            useAcademicNumbering: useAcademicNumbering
        };
        // El nombre se genera automáticamente desde selectedProjects (por namespace)
        const updated = DiscourseGraphToolkit.FavoritesService.add('export', null, data);
        setFavorites(updated);
        // Mostrar toast con el nombre generado
        const name = DiscourseGraphToolkit.computeFavoriteName(selectedProjects);
        DiscourseGraphToolkit.showToast('Favorito guardado: ' + name, 'success');
    };

    const handleApplyFavorite = (fav) => {
        const data = fav.data;
        if (data.selectedProjects) setSelectedProjects({ ...data.selectedProjects });
        if (data.selectedTypes) setSelectedTypes({ ...data.selectedTypes });
        if (data.contentConfig) setContentConfig({ ...data.contentConfig });
        if (data.excludeBitacora !== undefined) setExcludeBitacora(data.excludeBitacora);
        if (data.skeletonMode !== undefined) setSkeletonMode(data.skeletonMode);
        if (data.includeProjectMetadata !== undefined) setIncludeProjectMetadata(data.includeProjectMetadata);
        if (data.groupNamespaces !== undefined) setGroupNamespaces(data.groupNamespaces);
        if (data.hideNodeLabels !== undefined) setHideNodeLabels(data.hideNodeLabels);
        if (data.useAcademicNumbering !== undefined) setUseAcademicNumbering(data.useAcademicNumbering);
        DiscourseGraphToolkit.showToast('Favorito aplicado: ' + fav.name, 'success');
    };

    const handleDeleteFavorite = (favId, favName, e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar favorito "' + favName + '"?')) return;
        const updated = DiscourseGraphToolkit.FavoritesService.remove('export', favId);
        setFavorites(updated);
    };

    const handleRenameFavorite = (favId, currentName) => {
        const newName = prompt('Nuevo nombre:', currentName);
        if (!newName || newName.trim() === currentName) return;
        const updated = DiscourseGraphToolkit.FavoritesService.rename('export', favId, newName.trim());
        setFavorites(updated);
    };

    const isFavoriteActive = (fav) => {
        const data = fav.data;
        if (!data) return false;
        // Comparar selectedProjects (objeto)
        const currentProjKeys = Object.keys(selectedProjects).filter(k => selectedProjects[k]).sort();
        const savedProjKeys = Object.keys(data.selectedProjects || {}).filter(k => data.selectedProjects[k]).sort();
        if (currentProjKeys.join(',') !== savedProjKeys.join(',')) return false;
        // Comparar selectedTypes
        const typesEqual = data.selectedTypes &&
            Object.keys(data.selectedTypes).every(k => data.selectedTypes[k] === selectedTypes[k]) &&
            Object.keys(selectedTypes).every(k => data.selectedTypes[k] === selectedTypes[k]);
        if (!typesEqual) return false;
        // Comparar contentConfig
        const contentEqual = data.contentConfig &&
            Object.keys(data.contentConfig).every(k => data.contentConfig[k] === contentConfig[k]) &&
            Object.keys(contentConfig).every(k => data.contentConfig[k] === contentConfig[k]);
        if (!contentEqual) return false;
        // Comparar flags
        if (data.excludeBitacora !== undefined && data.excludeBitacora !== excludeBitacora) return false;
        if (data.skeletonMode !== undefined && data.skeletonMode !== skeletonMode) return false;
        if (data.includeProjectMetadata !== undefined && data.includeProjectMetadata !== includeProjectMetadata) return false;
        if (data.groupNamespaces !== undefined && data.groupNamespaces !== groupNamespaces) return false;
        if (data.hideNodeLabels !== undefined && data.hideNodeLabels !== hideNodeLabels) return false;
        if (data.useAcademicNumbering !== undefined && data.useAcademicNumbering !== useAcademicNumbering) return false;
        return true;
    };

    // --- Limpiar preview cuando cambian los proyectos seleccionados ---
    React.useEffect(() => {
        setPreviewPages([]);
    }, [selectedProjects, selectedTypes, contentConfig, excludeBitacora, skeletonMode, includeProjectMetadata, groupNamespaces, hideNodeLabels, useAcademicNumbering]);

    // --- Sincronizar skeletonMode dinámicamente con contentConfig ---
    React.useEffect(() => {
        const anyContent = Object.values(contentConfig).some(x => x);
        setSkeletonMode(!anyContent);
    }, [contentConfig]);

    // --- Árbol jerárquico de proyectos (calculado) ---
    const projectTree = React.useMemo(() => {
        if (projects.length === 0) return {};
        return DiscourseGraphToolkit.buildSimpleProjectTree(projects);
    }, [projects]);

    // --- Selección en cascada ---
    const handleProjectToggle = (node, checked) => {
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const newSelected = { ...selectedProjects };
        for (const proj of descendants) {
            newSelected[proj] = checked;
        }
        setSelectedProjects(newSelected);
    };

    // --- Helper: clave padre común de los proyectos seleccionados ---
    const getParentProjectKey = (projectList) => {
        const pList = projectList || Object.keys(selectedProjects).filter(k => selectedProjects[k]);
        if (pList.length === 0) return '';
        if (pList.length === 1) return pList[0];
        const split = pList.map(p => p.split('/'));
        const minLen = Math.min(...split.map(p => p.length));
        const common = [];
        for (let i = 0; i < minLen; i++) {
            if (split.every(p => p[i] === split[0][i])) common.push(split[0][i]);
            else break;
        }
        return common.length > 0 ? common.join('/') : pList.sort().join('|');
    };

    const cleanTitleForDisplay = (title) => {
        return (title || '').replace(/\[\[(?:QUE|GRI)\]\]\s*-\s*/, '').substring(0, 70);
    };

    // --- Helpers para Seleccionar Todo ---
    const selectAllProjects = () => {
        const allSelected = {};
        projects.forEach(p => allSelected[p] = true);
        setSelectedProjects(allSelected);
    };

    const selectAllTypes = () => {
        setSelectedTypes({ GRI: true, QUE: true, CLM: true, EVD: true });
    };

    
    // --- Fetch Pages ---
    const fetchPagesToExport = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return null;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            const uidToProject = {};
            // Ordenar pNames por longitud descendente para que los sub-proyectos específicos ganen en el mapeo
            const sortedPNames = [...pNames].sort((a, b) => b.length - a.length);
            
            for (let p of sortedPNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                for (const page of pages) {
                    if (!uidToProject[page.pageUid]) {
                        uidToProject[page.pageUid] = p; // proyecto más específico gana
                    }
                }
                allPages = allPages.concat(pages);
            }

            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());
            setPreviewPages(uniquePages);
            return { uniquePages, uidToProject };
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return null;
        }
    };

    const prepareExportData = async (pagesToExport, pNames, uidToProject) => {
        const uids = pagesToExport.map(p => p.pageUid);

        // Nota: Aunque skeletonMode esté activo, necesitamos los datos estructurales (hijos, refs)
        // para que el RelationshipMapper descubra las relaciones entre nodos.
        // El filtrado de contenido se hace en los renderers (markdownCore, htmlNodeRenderers).
        const includeContent = true;

        setExportStatus("Obteniendo datos...");
        const result = await DiscourseGraphToolkit.exportPagesNative(
            uids, null, (msg) => setExportStatus(msg), includeContent, false
        );

        setExportStatus("Procesando relaciones...");
        const allNodes = {};
        result.data.forEach(node => {
            if (node.uid) {
                node.type = DiscourseGraphToolkit.getNodeType(node.title);
                node.data = node;
                allNodes[node.uid] = node;
            }
        });

        setExportStatus("Analizando dependencias...");
        const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
        const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

        if (missingUids.length > 0) {
            setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
            const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, includeContent, false);
            extraData.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });
        }

        DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

        // Construir set de nodos que son hijos de algún GRI (para excluirlos como raíz)
        const childNodeUids = new Set();
        Object.values(allNodes).forEach(node => {
            if (node.type === 'GRI' && node.contained_nodes) {
                node.contained_nodes.forEach(uid => childNodeUids.add(uid));
            }
        });

        let questions = result.data.filter(node => {
            const type = DiscourseGraphToolkit.getNodeType(node.title);
            return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
        });

        // Fallback: si no hay QUE/GRI pero hay CLM/EVD, buscar nodos raíz padre
        if (questions.length === 0 && result.data.length > 0) {
            setExportStatus("Buscando nodos raíz padre...");
            const childUids = result.data.map(n => n.uid);
            const parentRoots = await DiscourseGraphToolkit.findParentRootNodes(childUids);

            if (parentRoots.length > 0) {
                const parentUids = parentRoots.map(p => p.pageUid).filter(uid => !allNodes[uid]);
                if (parentUids.length > 0) {
                    setExportStatus(`Cargando ${parentUids.length} nodos raíz padre...`);
                    const parentData = await DiscourseGraphToolkit.exportPagesNative(parentUids, null, null, includeContent, false);
                    parentData.data.forEach(node => {
                        if (node.uid) {
                            node.type = DiscourseGraphToolkit.getNodeType(node.title);
                            node.data = node;
                            allNodes[node.uid] = node;
                        }
                    });

                    // Re-colectar dependencias de los nuevos padres
                    const newDeps = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(
                        parentUids.filter(uid => allNodes[uid]).map(uid => allNodes[uid])
                    );
                    const newMissing = [...newDeps].filter(uid => !allNodes[uid]);
                    if (newMissing.length > 0) {
                        const extraData2 = await DiscourseGraphToolkit.exportPagesNative(newMissing, null, null, includeContent, false);
                        extraData2.data.forEach(node => {
                            if (node.uid) {
                                node.type = DiscourseGraphToolkit.getNodeType(node.title);
                                node.data = node;
                                allNodes[node.uid] = node;
                            }
                        });
                    }

                    // Re-mapear relaciones con todos los nodos
                    DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

                    // Recalcular childNodeUids
                    childNodeUids.clear();
                    Object.values(allNodes).forEach(node => {
                        if (node.type === 'GRI' && node.contained_nodes) {
                            node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                        }
                    });
                }

                // Re-filtrar para nodos raíz
                questions = Object.values(allNodes).filter(node => {
                    const type = DiscourseGraphToolkit.getNodeType(node.title);
                    return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
                });
            }
        }

        // Podar ramas: filtrar para solo incluir ramas relevantes al proyecto seleccionado
        if (questions.length > 0) {
            // Obtener UIDs de páginas NATIVAS del proyecto (sin contaminación del fallback)
            const trueProjectPages = [];
            for (const p of pNames) {
                const pages = await DiscourseGraphToolkit.findPagesWithProject(p);
                trueProjectPages.push(...pages);
            }
            const projectPageUids = new Set(trueProjectPages.map(p => p.pageUid));
            const relevanceCache = {};

            const isRelevantToProject = (uid, visited) => {
                if (relevanceCache[uid] !== undefined) return relevanceCache[uid];
                if (!visited) visited = {};
                if (visited[uid]) return false;
                visited[uid] = true;

                if (projectPageUids.has(uid)) {
                    relevanceCache[uid] = true;
                    return true;
                }

                const node = allNodes[uid];
                if (!node) { relevanceCache[uid] = false; return false; }

                const children = [].concat(
                    node.related_clms || [],
                    node.direct_evds || [],
                    node.supporting_clms || [],
                    node.related_evds || [],
                    node.contained_nodes || []
                );

                for (let i = 0; i < children.length; i++) {
                    if (isRelevantToProject(children[i], Object.assign({}, visited))) {
                        relevanceCache[uid] = true;
                        return true;
                    }
                }

                relevanceCache[uid] = false;
                return false;
            };

            // Podar si algún nodo raíz NO es nativo del proyecto (fue agregado por fallback)
            const needsPruning = questions.some(q => !projectPageUids.has(q.uid));
            if (needsPruning) {
                for (const uid in allNodes) {
                    const node = allNodes[uid];
                    if (node.related_clms) node.related_clms = node.related_clms.filter(u => isRelevantToProject(u));
                    if (node.direct_evds) node.direct_evds = node.direct_evds.filter(u => isRelevantToProject(u));
                    if (node.supporting_clms) node.supporting_clms = node.supporting_clms.filter(u => isRelevantToProject(u));
                    if (node.related_evds) node.related_evds = node.related_evds.filter(u => isRelevantToProject(u));
                    if (node.contained_nodes) node.contained_nodes = node.contained_nodes.filter(u => isRelevantToProject(u));
                }
            }
        }
        // Aplicar orden desde localStorage (Conexión Absoluta con Panorámica)
        let orderedQuestionsToExport = [];
        const parentKey = getParentProjectKey(pNames);
        
        // Nodos que tienen project mapeado
        const annotated = questions.map(q => ({
            ...q, 
            _project: uidToProject[q.uid] || null
        }));

        const subProjectSet = new Set();
        pNames.forEach(p => {
            if (p === parentKey) {
                subProjectSet.add(p);
            } else if (p.startsWith(parentKey + '/')) {
                const rest = p.substring(parentKey.length + 1);
                const immediate = rest.split('/')[0];
                subProjectSet.add(parentKey + '/' + immediate);
            }
        });

        const hasGroups = subProjectSet.size > 1;

        if (hasGroups) {
            // Modo agrupado
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(parentKey);
            const orderedGroups = savedGroupOrder && savedGroupOrder.length > 0
                ? [...savedGroupOrder.filter(g => subProjectSet.has(g)), ...Array.from(subProjectSet).filter(g => !savedGroupOrder.includes(g))]
                : Array.from(subProjectSet).sort();

            let finalUidOrder = [];
            const addedUids = new Set();
            for (const gk of orderedGroups) {
                const groupNodes = annotated.filter(q => q._project === gk || (q._project && q._project.startsWith(gk + '/')));
                const uniqueGroupNodes = groupNodes.filter(q => !addedUids.has(q.uid));
                if (uniqueGroupNodes.length === 0) continue;

                const savedQ = DiscourseGraphToolkit.loadQuestionOrder(gk);
                if (savedQ && savedQ.length > 0) {
                    const ordered = savedQ.map(uid => uniqueGroupNodes.find(q => q.uid === uid)).filter(Boolean);
                    const unseen = uniqueGroupNodes.filter(q => !savedQ.includes(q.uid));
                    ordered.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                    unseen.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                } else {
                    uniqueGroupNodes.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                }
            }
            
            // Nodos sin grupo
            const assignedUids = new Set(finalUidOrder);
            const unassignedNodes = annotated.filter(q => !assignedUids.has(q.uid));
            finalUidOrder.push(...unassignedNodes.map(q => q.uid));

            const reordered = finalUidOrder.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
            orderedQuestionsToExport = reordered;
        } else {
            // Modo plano
            const savedQ = DiscourseGraphToolkit.loadQuestionOrder(parentKey);
            if (savedQ && savedQ.length > 0) {
                const ordered = savedQ.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
                const unseen = annotated.filter(q => !savedQ.includes(q.uid));
                orderedQuestionsToExport = [...ordered, ...unseen];
            } else {
                orderedQuestionsToExport = annotated;
            }
        }

        const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(parentKey);
        const filename = `DG_${sanitizedNames}`;

        // Retornar preguntas YA ordenadas para el export
        return { questions: orderedQuestionsToExport, allNodes, filename };
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);

            // Calcular el nombre del proyecto usando el ancestro común (getParentProjectKey)
            const commonProject = getParentProjectKey(pNames);
            const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(commonProject);
            const filename = `DG_${sanitizedNames}.json`;

            const anyContent = Object.values(contentConfig).some(x => x);

            await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent);

            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHtml = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(
                questionsToExport, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora, skeletonMode, includeProjectMetadata
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '.html', htmlContent, 'text/html');

            setExportStatus(`✅ Exportación HTML completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportMarkdown = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { groupNamespaces, hideNodeLabels, useAcademicNumbering, includeProjectMetadata };

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, false, skeletonMode, formatOptions
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '.md', mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportFlatMarkdown = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { groupNamespaces, hideNodeLabels, useAcademicNumbering, includeProjectMetadata };

            setExportStatus("Generando Markdown Plano...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode, formatOptions
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '_flat.md', mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown Plano completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportEpub = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { groupNamespaces, includeProjectMetadata };

            setExportStatus("Generando Markdown para EPUB...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode, formatOptions
            );

            setExportStatus("Cargando librería EPUB...");
            await DiscourseGraphToolkit.EpubGenerator.loadJSZip();

            setExportStatus("Generando EPUB...");
            const epubBlob = await DiscourseGraphToolkit.EpubGenerator.generateEpub(mdContent, {
                title: `Mapa de Discurso: ${pNames.join(', ')}`,
                author: 'Discourse Graph Toolkit'
            });

            setExportStatus("Descargando EPUB...");
            const url = URL.createObjectURL(epubBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.epub';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            setExportStatus(`✅ Exportación EPUB completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Callbacks para ProjectTreeView ---
    const renderExportNodeHeader = (node, key, depth, isExpanded, toggleFn) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjects[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        return React.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0',
                fontSize: '0.8125rem'
            }
        },
            // Expand/collapse toggle (solo si tiene hijos)
            hasChildren && React.createElement('span', {
                onClick: (e) => { e.stopPropagation(); toggleFn(); },
                style: { cursor: 'pointer', color: '#666', fontSize: '0.6875rem', width: '0.75rem' }
            }, isExpanded ? '▼' : '▶'),
            !hasChildren && React.createElement('span', { style: { width: '0.75rem' } }),
            // Checkbox
            React.createElement('input', {
                type: 'checkbox',
                checked: allSelected,
                ref: (el) => { if (el) el.indeterminate = someSelected; },
                onChange: (e) => handleProjectToggle(node, e.target.checked),
                style: { margin: 0 }
            }),
            // Label
            React.createElement('span', {
                style: { cursor: 'pointer' },
                onClick: () => handleProjectToggle(node, !allSelected)
            },
                hasChildren ? `📁 ${key}` : key
            ),
            // Badge con conteo si tiene hijos
            hasChildren && React.createElement('span', {
                style: { fontSize: '0.625rem', color: '#999', marginLeft: '0.25rem' }
            }, `(${selectedCount}/${descendants.length})`)
        );
    };

    // ExportTab no necesita renderNodeContent porque solo muestra proyectos, no items dentro
    const renderExportNodeContent = (node, depth) => null;

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1.25rem' } }, 'Exportar Grafos'),

        // --- Favorites Bar ---
        React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--dgt-bg-secondary)',
                border: '1px solid var(--dgt-border-color)',
                borderRadius: 'var(--dgt-radius-md)',
                flexWrap: 'wrap',
                fontSize: '0.8125rem'
            }
        },
            React.createElement('span', { style: { fontWeight: 600, fontSize: '0.75rem', color: 'var(--dgt-text-secondary)', whiteSpace: 'nowrap' } }, '⭐ Favoritos:'),
            favorites.length === 0 && React.createElement('span', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-muted)' } }, '(guarda tu selección actual)'),
            favorites.map(function (fav) {
                var isActive = isFavoriteActive(fav);
                return React.createElement('span', {
                    key: fav.id,
                    onClick: function () { handleApplyFavorite(fav); },
                    title: fav.name + (isActive ? ' (activo)' : ''),
                    style: {
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: isActive ? 'var(--dgt-accent-green)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--dgt-text-primary)',
                        border: '1px solid ' + (isActive ? 'var(--dgt-accent-green)' : 'var(--dgt-border-color)'),
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                    }
                },
                    React.createElement('span', { style: { fontWeight: isActive ? 600 : 400 } }, '🔖'),
                    React.createElement('span', {
                        style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        title: fav.name
                    }, fav.name),
                    React.createElement('span', {
                        onClick: function (e) { handleDeleteFavorite(fav.id, fav.name, e); },
                        style: { cursor: 'pointer', opacity: 0.6, marginLeft: '2px', fontSize: '0.65rem', color: isActive ? '#fff' : 'var(--dgt-text-muted)' },
                        title: 'Eliminar favorito'
                    }, '✕')
                );
            }),
            React.createElement('button', {
                onClick: handleSaveFavorite,
                title: 'Guardar selección actual como favorito (nombre generado por namespace)',
                style: {
                    background: 'transparent', border: '1px dashed var(--dgt-border-color)',
                    borderRadius: '12px', padding: '2px 10px', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--dgt-text-secondary)'
                }
            }, '+ Guardar')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch', flex: 1, minHeight: 0 } },
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '1. Proyectos'),
                    projects.length > 0 && React.createElement('span', {
                        onClick: selectAllProjects,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { className: 'dgt-tree-container', style: { flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem', backgroundColor: '#fafafa', maxHeight: 'none' } },
                    projects.length === 0 ? 'No hay proyectos.' :
                        React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                            tree: projectTree,
                            renderNodeHeader: renderExportNodeHeader,
                            renderNodeContent: renderExportNodeContent,
                            defaultExpanded: true
                        })
                )
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem', flexShrink: 0 } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: 0, fontSize: '0.875rem', fontWeight: 600 } }, '2. Configuración de Nodos'),
                    React.createElement('span', {
                        onClick: selectAllTypes,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '0.25rem', paddingBottom: '0.5rem' } },
                    // Table/Matrix
                    React.createElement('table', {
                        style: {
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.8125rem',
                            marginBottom: '0.75rem',
                            backgroundColor: 'var(--dgt-bg-primary, #fff)',
                            border: '1px solid var(--dgt-border-color, #eee)',
                            borderRadius: 'var(--dgt-radius-md, 6px)',
                            overflow: 'hidden'
                        }
                    },
                        React.createElement('thead', null,
                            React.createElement('tr', { style: { backgroundColor: 'var(--dgt-bg-secondary, #fafafa)', borderBottom: '1px solid var(--dgt-border-color, #eee)' } },
                                React.createElement('th', { style: { textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 } }, 'Tipo de Nodo'),
                                React.createElement('th', { style: { textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: 600, width: '4.5rem' } }, 'Incluir'),
                                React.createElement('th', { style: { textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: 600, width: '7.5rem' } }, 'Texto Completo')
                            )
                        ),
                        React.createElement('tbody', null,
                            ['GRI', 'QUE', 'CLM', 'EVD'].map(t => {
                                const label = DiscourseGraphToolkit.TYPES[t].label;
                                const isSelected = selectedTypes[t];
                                return React.createElement('tr', {
                                    key: t,
                                    style: {
                                        borderBottom: '1px solid var(--dgt-border-color, #eee)',
                                        opacity: isSelected ? 1 : 0.6,
                                        transition: 'opacity 0.15s ease'
                                    }
                                },
                                    React.createElement('td', { style: { padding: '0.5rem 0.75rem', fontWeight: 500 } },
                                        t === 'GRI' ? '📁 ' : t === 'QUE' ? '❓ ' : t === 'CLM' ? '💬 ' : '📄 ',
                                        `${label} (${t})`
                                    ),
                                    React.createElement('td', { style: { padding: '0.5rem 0.75rem', textAlign: 'center' } },
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: isSelected,
                                            onChange: e => {
                                                setSelectedTypes({ ...selectedTypes, [t]: e.target.checked });
                                            },
                                            style: { cursor: 'pointer' }
                                        })
                                    ),
                                    React.createElement('td', { style: { padding: '0.5rem 0.75rem', textAlign: 'center' } },
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: contentConfig[t],
                                            disabled: !isSelected,
                                            onChange: e => {
                                                setContentConfig({ ...contentConfig, [t]: e.target.checked });
                                            },
                                            style: { cursor: isSelected ? 'pointer' : 'not-allowed' }
                                        })
                                    )
                                );
                            })
                        )
                    ),

                    // Acciones Rápidas (Solo Títulos / Todo Completo)
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                            justifyContent: 'flex-end'
                        }
                    },
                        React.createElement('button', {
                            onClick: () => {
                                setContentConfig({ GRI: false, QUE: false, CLM: false, EVD: false });
                                DiscourseGraphToolkit.showToast('Configurado: Solo Títulos (Esqueleto)', 'info');
                            },
                            style: {
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid var(--dgt-border-color, #ccc)',
                                borderRadius: 'var(--dgt-radius-sm, 4px)',
                                backgroundColor: 'var(--dgt-bg-secondary, #f9f9f9)',
                                cursor: 'pointer',
                                color: 'var(--dgt-text-secondary, #666)'
                            }
                        }, '⚡ Solo Títulos'),
                        React.createElement('button', {
                            onClick: () => {
                                setContentConfig({ GRI: true, QUE: true, CLM: true, EVD: true });
                                DiscourseGraphToolkit.showToast('Configurado: Todo Texto Completo', 'info');
                            },
                            style: {
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid var(--dgt-border-color, #ccc)',
                                borderRadius: 'var(--dgt-radius-sm, 4px)',
                                backgroundColor: 'var(--dgt-bg-secondary, #f9f9f9)',
                                cursor: 'pointer',
                                color: 'var(--dgt-text-secondary, #666)'
                            }
                        }, '⚡ Texto Completo')
                    ),

                    // 3. Filtros y Metadatos
                    React.createElement('div', {
                        style: {
                            borderTop: '1px solid var(--dgt-border-color, #eee)',
                            paddingTop: '0.75rem',
                            marginBottom: '1rem'
                        }
                    },
                        React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 } }, '3. Filtros y Metadatos'),
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' } },
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: includeProjectMetadata,
                                    onChange: e => setIncludeProjectMetadata(e.target.checked)
                                }),
                                React.createElement('span', null, 'Incluir información de Proyecto (metadatos)'),
                                React.createElement('span', {
                                    title: 'Conserva el proyecto y sección asociada incluso en modo solo títulos',
                                    style: { cursor: 'help', opacity: 0.6, fontSize: '0.75rem' }
                                }, ' ℹ️')
                            ),
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: excludeBitacora,
                                    onChange: e => setExcludeBitacora(e.target.checked)
                                }),
                                'Excluir contenido de [[bitácora]]'
                            )
                        )
                    ),

                    // 4. Formato de Impresión (Markdown)
                    React.createElement('div', {
                        style: {
                            borderTop: '1px solid var(--dgt-border-color, #eee)',
                            paddingTop: '0.75rem',
                            paddingBottom: '0.5rem'
                        }
                    },
                        React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 } }, '4. Formato de Impresión (Markdown)'),
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' } },
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: groupNamespaces,
                                    onChange: e => setGroupNamespaces(e.target.checked)
                                }),
                                'Usar namespaces como títulos de sección'
                            ),
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: hideNodeLabels,
                                    onChange: e => setHideNodeLabels(e.target.checked)
                                }),
                                'Ocultar etiquetas de nodo (ej: [[QUE]])'
                            ),
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: useAcademicNumbering,
                                    onChange: e => setUseAcademicNumbering(e.target.checked)
                                }),
                                'Usar numeración jerárquica (Ej: 1.1.1.)'
                            )
                        )
                    )
                )
            )
        ),
        React.createElement('div', { style: { marginTop: '1.25rem' } },
            React.createElement('button', {
                onClick: handleExport,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '0.25rem', marginRight: '0.625rem' }
            }, 'Exportar JSON'),
            React.createElement('button', {
                onClick: handleExportHtml,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.primary || '#2196F3', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar HTML'),
            React.createElement('button', {
                onClick: handleExportMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.successHover || '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar Markdown'),
            React.createElement('button', {
                onClick: handleExportFlatMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.neutral || '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'MD Plano'),
            React.createElement('button', {
                onClick: handleExportEpub,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.danger || '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'EPUB')
        ),
        exportStatus && React.createElement('div', { style: { marginTop: '0.625rem', fontWeight: 'bold' } }, exportStatus),

    );
};


// --- MODULE: src/ui/tabs/ImportTab.js ---
// ============================================================================
// UI: Import Tab Component
// ============================================================================

DiscourseGraphToolkit.ImportTab = function () {
    const React = window.React;

    // Estado local — este tab no necesita compartir estado con otros tabs
    const [importStatus, setImportStatus] = React.useState('');

    // --- Render ---
    return React.createElement('div', null,
        React.createElement('h3', null, 'Importar Grafos'),
        React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

        React.createElement('div', { style: { marginTop: '1.25rem', padding: '1.25rem', border: '2px dashed #ccc', borderRadius: '0.5rem', textAlign: 'center' } },
            React.createElement('input', {
                type: 'file',
                accept: '.json',
                id: 'import-file-input',
                style: { display: 'none' },
                onChange: (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            setImportStatus("Importando...");
                            try {
                                const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setImportStatus(msg));

                                let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                if (result.errors && result.errors.length > 0) {
                                    statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                    DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                } else {
                                    DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                }
                                setImportStatus(statusMsg);

                            } catch (err) {
                                console.error(err);
                                setImportStatus(`❌ Error fatal: ${err.message}`);
                                DiscourseGraphToolkit.showToast("Error en importación.", "error");
                            }
                        };
                        reader.readAsText(file);
                    }
                }
            }),
            React.createElement('label', {
                htmlFor: 'import-file-input',
                style: {
                    display: 'inline-block', padding: '0.625rem 1.25rem', backgroundColor: '#2196F3', color: 'white',
                    borderRadius: '0.25rem', cursor: 'pointer', fontSize: '1rem'
                }
            }, 'Seleccionar Archivo JSON')
        ),
        importStatus && React.createElement('div', { style: { marginTop: '1.25rem', padding: '0.625rem', backgroundColor: '#f5f5f5', borderRadius: '0.25rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' } }, importStatus)
    );
};


// --- MODULE: src/ui/contexts/NavContext.js ---
// ============================================================================
// UI: Navigation Context
// Gestiona el estado de navegación entre pestañas
// ============================================================================

DiscourseGraphToolkit.NavContext = window.React.createContext(null);

DiscourseGraphToolkit.NavProvider = function ({ children }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('proyectos');

    const value = React.useMemo(() => ({
        activeTab, setActiveTab
    }), [activeTab]);

    return React.createElement(DiscourseGraphToolkit.NavContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useNav = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.NavContext);
    if (!context) {
        throw new Error('useNav must be used within a NavProvider');
    }
    return context;
};


// --- MODULE: src/ui/contexts/ProjectsContext.js ---
// ============================================================================
// UI: Projects Context
// Gestiona el estado de proyectos, configuración y templates
// ============================================================================

DiscourseGraphToolkit.ProjectsContext = window.React.createContext(null);

DiscourseGraphToolkit.ProjectsProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Configuración ---
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());

    // --- Estados de Proyectos ---
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');
    const [validation, setValidation] = React.useState({});
    const [suggestions, setSuggestions] = React.useState([]);
    const [isScanning, setIsScanning] = React.useState(false);
    const [selectedProjectsForDelete, setSelectedProjectsForDelete] = React.useState({});
    const [newProjectsAlert, setNewProjectsAlert] = React.useState([]);
    const [dismissedProjects, setDismissedProjects] = React.useState([]);

    // --- Inicialización ---
    React.useEffect(() => {
        const loadData = async () => {
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());
            setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());

            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }

            // Auto-descubrir proyectos nuevos en el grafo
            try {
                const discovered = await DiscourseGraphToolkit.discoverProjectsInGraph();
                const current = DiscourseGraphToolkit.getProjects();
                const dismissed = DiscourseGraphToolkit.getDismissedProjects();
                const newProjects = discovered.filter(p => !current.includes(p) && !dismissed.includes(p));
                if (newProjects.length > 0) {
                    setNewProjectsAlert(newProjects);
                }
            } catch (e) {
                console.warn('Error discovering projects:', e);
            }
        };
        loadData();
    }, []);

    const value = React.useMemo(() => ({
        config, setConfig,
        templates, setTemplates,
        projects, setProjects,
        newProject, setNewProject,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        newProjectsAlert, setNewProjectsAlert,
        dismissedProjects, setDismissedProjects
    }), [config, templates, projects, newProject, validation, suggestions, isScanning, selectedProjectsForDelete, newProjectsAlert, dismissedProjects]);

    return React.createElement(DiscourseGraphToolkit.ProjectsContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useProjects = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ProjectsContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectsProvider');
    }
    return context;
};


// --- MODULE: src/ui/contexts/BranchesContext.js ---
// ============================================================================
// UI: Branches Context
// Gestiona el estado de verificación de ramas/coherencia
// ============================================================================

DiscourseGraphToolkit.BranchesContext = window.React.createContext(null);

DiscourseGraphToolkit.BranchesProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Ramas (Verificación Bulk) ---
    const [bulkVerificationResults, setBulkVerificationResults] = React.useState([]);
    const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);
    const [bulkVerifyStatus, setBulkVerifyStatus] = React.useState('');
    const [selectedBulkQuestion, setSelectedBulkQuestion] = React.useState(null);
    const [editableProject, setEditableProject] = React.useState('');
    const [isPropagating, setIsPropagating] = React.useState(false);
    
    // --- Nuevos Estados para Mejoras ---
    const [selectedProjects, setSelectedProjects] = React.useState(new Set());
    const [verificationProgress, setVerificationProgress] = React.useState({ current: 0, total: 0, currentQuestion: '' });

    // --- Restaurar cache de verificación al montar ---
    React.useEffect(() => {
        const verificationCache = DiscourseGraphToolkit.getVerificationCache();
        if (verificationCache && verificationCache.results) {
            setBulkVerificationResults(verificationCache.results);
            setBulkVerifyStatus(verificationCache.status || '📋 Resultados cargados del cache.');
        }
        
        // Inicializar proyectos seleccionados con todos los disponibles
        const allProjects = DiscourseGraphToolkit.getProjects();
        const initialPaths = new Set(['(sin proyecto)']);
        for (const proj of allProjects) {
            const parts = proj.split('/');
            let currentPath = '';
            for (const part of parts) {
                currentPath = currentPath ? currentPath + '/' + part : part;
                initialPaths.add(currentPath);
            }
        }
        setSelectedProjects(initialPaths);
    }, []);

    const value = React.useMemo(() => ({
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        selectedProjects, setSelectedProjects,
        verificationProgress, setVerificationProgress
    }), [bulkVerificationResults, isBulkVerifying, bulkVerifyStatus, selectedBulkQuestion, editableProject, isPropagating, selectedProjects, verificationProgress]);

    return React.createElement(DiscourseGraphToolkit.BranchesContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useBranches = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.BranchesContext);
    if (!context) {
        throw new Error('useBranches must be used within a BranchesProvider');
    }
    return context;
};


// --- MODULE: src/ui/contexts/ExportContext.js ---
// ============================================================================
// UI: Export Context
// Gestiona el estado de exportación
// ============================================================================

DiscourseGraphToolkit.ExportContext = window.React.createContext(null);

DiscourseGraphToolkit.ExportProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Exportación ---
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ GRI: true, QUE: true, CLM: true, EVD: true });
    const [contentConfig, setContentConfig] = React.useState({ GRI: true, QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [skeletonMode, setSkeletonMode] = React.useState(false);
    const [includeProjectMetadata, setIncludeProjectMetadata] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [groupNamespaces, setGroupNamespaces] = React.useState(false);
    const [hideNodeLabels, setHideNodeLabels] = React.useState(false);
    const [useAcademicNumbering, setUseAcademicNumbering] = React.useState(false);

    const value = React.useMemo(() => ({
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        skeletonMode, setSkeletonMode,
        includeProjectMetadata, setIncludeProjectMetadata,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        groupNamespaces, setGroupNamespaces,
        hideNodeLabels, setHideNodeLabels,
        useAcademicNumbering, setUseAcademicNumbering
    }), [selectedProjects, selectedTypes, contentConfig, excludeBitacora, skeletonMode, includeProjectMetadata, isExporting, exportStatus, previewPages, groupNamespaces, hideNodeLabels, useAcademicNumbering]);

    return React.createElement(DiscourseGraphToolkit.ExportContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useExport = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ExportContext);
    if (!context) {
        throw new Error('useExport must be used within an ExportProvider');
    }
    return context;
};


// --- MODULE: src/ui/contexts/PanoramicContext.js ---
// ============================================================================
// UI: Panoramic Context
// Gestiona el estado de la vista panorámica
// ============================================================================

DiscourseGraphToolkit.PanoramicContext = window.React.createContext(null);

DiscourseGraphToolkit.PanoramicProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Panorámica ---
    const [panoramicData, setPanoramicData] = React.useState(null);
    const [panoramicExpandedQuestions, setPanoramicExpandedQuestions] = React.useState(DiscourseGraphToolkit.loadPanoramicExpandedQuestions());
    const [panoramicLoadStatus, setPanoramicLoadStatus] = React.useState('');
    const [panoramicSelectedProject, setPanoramicSelectedProject] = React.useState('');

    const value = React.useMemo(() => ({
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions, setPanoramicExpandedQuestions,
        panoramicLoadStatus, setPanoramicLoadStatus,
        panoramicSelectedProject, setPanoramicSelectedProject
    }), [panoramicData, panoramicExpandedQuestions, panoramicLoadStatus, panoramicSelectedProject]);

    return React.createElement(DiscourseGraphToolkit.PanoramicContext.Provider, { value }, children);
};

DiscourseGraphToolkit.usePanoramic = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.PanoramicContext);
    if (!context) {
        throw new Error('usePanoramic must be used within a PanoramicProvider');
    }
    return context;
};


// --- MODULE: src/ui/ToolkitContext.js ---
// ============================================================================
// UI: Toolkit Context
// Contexto React para compartir estado entre pestañas del modal
// Elimina el patrón de prop drilling
// ============================================================================

// Crear el contexto (se usa window.React porque Roam lo expone globalmente)
DiscourseGraphToolkit.ToolkitContext = window.React.createContext(null);

// Hook helper para consumir el contexto
DiscourseGraphToolkit.useToolkit = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ToolkitContext);
    if (!context) {
        throw new Error('useToolkit must be used within a ToolkitProvider');
    }
    return context;
};



// --- MODULE: src/ui/modal.js ---
// ============================================================================
// UI: Modal Principal
// ============================================================================

// Componente inner que usa los contextos (debe estar DENTRO de los Providers)
DiscourseGraphToolkit._ModalInner = function ({ onClose, onMinimize }) {
    const React = window.React;
    const { activeTab, setActiveTab } = DiscourseGraphToolkit.useNav();
    const { projects, setProjects, newProjectsAlert, setNewProjectsAlert, dismissedProjects, setDismissedProjects } = DiscourseGraphToolkit.useProjects();

    // --- Helpers ---
    const tabStyle = React.useCallback((id) => ({
        padding: '0.625rem 1.25rem', cursor: 'pointer', borderBottom: activeTab === id ? '0.125rem solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    }), [activeTab]);

    // --- Render ---
    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }
    },
        React.createElement('div', {
            style: {
                backgroundColor: 'white', width: '90%', maxWidth: '90rem', height: '90vh', borderRadius: '0.5rem',
                display: 'flex', flexDirection: 'column', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.2)',
                fontSize: '0.875rem'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                    // Botón Minimizar
                    React.createElement('button', {
                        onClick: onMinimize,
                        title: 'Minimizar (mantiene estado)',
                        style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                    }, '-'),
                    // Botón Cerrar
                    React.createElement('button', {
                        onClick: onClose,
                        title: 'Cerrar (resetea estado)',
                        style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                    }, 'X')
                )
            ),
            React.createElement('div', { style: { display: 'flex', borderBottom: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.border || '#eee'}` } },
                ['proyectos', 'ramas', 'nodos', 'panoramica', 'exportar', 'importar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) },
                        t === 'panoramica' ? 'Panorámica' : t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),

            // Alerta de proyectos nuevos descubiertos
            newProjectsAlert.length > 0 && React.createElement('div', {
                style: {
                    padding: '0.75rem 1.25rem',
                    backgroundColor: '#fff3e0', // Soft warning
                    borderBottom: '1px solid #ffcc80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }
            },
                React.createElement('span', { style: { fontWeight: 'bold', color: DiscourseGraphToolkit.THEME?.colors?.warning || '#f59e0b' } },
                    `⚠️ ${newProjectsAlert.length} proyecto${newProjectsAlert.length > 1 ? 's' : ''} no registrado${newProjectsAlert.length > 1 ? 's' : ''}:`
                ),
                React.createElement('span', { style: { color: '#bf360c', fontSize: '0.8125rem' } },
                    newProjectsAlert.slice(0, 3).join(', ') + (newProjectsAlert.length > 3 ? ` (+${newProjectsAlert.length - 3} más)` : '')
                ),
                React.createElement('button', {
                    onClick: async () => {
                        const merged = [...new Set([...projects, ...newProjectsAlert])].sort();
                        DiscourseGraphToolkit.saveProjects(merged);
                        await DiscourseGraphToolkit.syncProjectsToRoam(merged);
                        setProjects(merged);
                        setNewProjectsAlert([]);
                    },
                    style: {
                        padding: '0.25rem 0.75rem',
                        backgroundColor: DiscourseGraphToolkit.THEME?.colors?.success || '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        marginLeft: 'auto'
                    }
                }, 'Agregar todos'),
                React.createElement('button', {
                    title: 'Ignorar permanentemente de la alerta automática',
                    onClick: () => {
                        DiscourseGraphToolkit.addToDismissedProjects(newProjectsAlert);
                        setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());
                        setNewProjectsAlert([]);
                        DiscourseGraphToolkit.showToast('Proyectos ignorados (puedes restaurarlos más tarde)', 'info');
                    },
                    style: {
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        color: DiscourseGraphToolkit.THEME?.colors?.neutral || '#6b7280',
                        border: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.border || '#ccc'}`,
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                    }
                }, 'X')
            ),

            // Content
            React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.25rem 3.125rem 1.25rem', minHeight: 0 } },

                // Pestaña Proyectos
                activeTab === 'proyectos' && React.createElement(DiscourseGraphToolkit.ProjectsTab),

                // Pestaña Ramas
                activeTab === 'ramas' && React.createElement(DiscourseGraphToolkit.BranchesTab),

                // Pestaña Nodos
                activeTab === 'nodos' && React.createElement(DiscourseGraphToolkit.NodesTab),

                // Pestaña Panorámica
                activeTab === 'panoramica' && React.createElement(DiscourseGraphToolkit.PanoramicTab),

                // Pestaña Exportar
                activeTab === 'exportar' && React.createElement(DiscourseGraphToolkit.ExportTab),

                // Pestaña Importar
                activeTab === 'importar' && React.createElement(DiscourseGraphToolkit.ImportTab)
            )
        )
    );
};

// Componente raíz que envuelve todo en los Providers
DiscourseGraphToolkit.ToolkitModal = function ({ onClose, onMinimize }) {
    const React = window.React;

    // Los Providers se anidan aquí para que el estado persista mientras el modal esté abierto.
    // Cada Provider gestiona su propio dominio de estado independientemente.
    return React.createElement(DiscourseGraphToolkit.NavProvider, null,
        React.createElement(DiscourseGraphToolkit.ProjectsProvider, null,
            React.createElement(DiscourseGraphToolkit.BranchesProvider, null,
                React.createElement(DiscourseGraphToolkit.ExportProvider, null,
                    React.createElement(DiscourseGraphToolkit.PanoramicProvider, null,
                        React.createElement(DiscourseGraphToolkit._ModalInner, { onClose, onMinimize })
                    )
                )
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    const floatingBtn = document.getElementById('discourse-graph-toolkit-floating-btn');

    // Si existe un modal minimizado, simplemente mostrarlo y ocultar el botón flotante
    if (existing && existing.style.display === 'none') {
        existing.style.display = 'block';
        if (floatingBtn) floatingBtn.style.display = 'none';
        return;
    }

    // Si existe y está visible, pero no tiene hijos (dañado), limpiarlo para recrearlo
    if (existing) {
        if (!existing.hasChildNodes()) {
            console.warn("[DiscourseGraphToolkit] Modal vacío o dañado detectado, limpiando...");
            try {
                if (existing.parentNode) existing.parentNode.removeChild(existing);
            } catch (e) {
                console.error(e);
            }
        } else {
            return;
        }
    }

    const previousActiveElement = document.activeElement;

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    // Crear botón flotante (inicialmente oculto)
    let floatingButton = document.getElementById('discourse-graph-toolkit-floating-btn');
    if (!floatingButton) {
        floatingButton = document.createElement('div');
        floatingButton.id = 'discourse-graph-toolkit-floating-btn';
        floatingButton.innerHTML = 'Discourse Graph';
        floatingButton.title = 'Restaurar Discourse Graph Toolkit';
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #2196F3, #1976D2);
            border-radius: 50%;
            display: none;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
            z-index: 9998;
            transition: transform 0.2s, box-shadow 0.2s;
            user-select: none;
        `;
        floatingButton.onmouseenter = () => {
            floatingButton.style.transform = 'scale(1.1)';
            floatingButton.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.5)';
        };
        floatingButton.onmouseleave = () => {
            floatingButton.style.transform = 'scale(1)';
            floatingButton.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
        };
        floatingButton.onclick = () => {
            DiscourseGraphToolkit.openModal();
        };
        document.body.appendChild(floatingButton);
    }

    // Función para minimizar (oculta pero mantiene estado + muestra botón flotante)
    const minimize = () => {
        div.style.display = 'none';
        // Mostrar botón flotante
        const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
        if (btn) btn.style.display = 'flex';
        // Restaurar foco a Roam
        setTimeout(() => {
            const article = document.querySelector('.roam-article') ||
                document.querySelector('.rm-article-wrapper') ||
                document.querySelector('.roam-body-main');
            if (article) {
                article.focus();
                article.click();
            }
        }, 50);
    };

    // Función para cerrar (destruye el componente + oculta botón flotante)
    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
        } catch (e) {
            console.error("Error unmounting component:", e);
        }

        try {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        } catch (e) {
            console.error("Error removing div from DOM:", e);
        }

        // Limpiar cualquier otro modal duplicado o huérfano para evitar overlays bloqueantes
        try {
            const extraModals = document.querySelectorAll('#discourse-graph-toolkit-modal');
            extraModals.forEach(m => {
                if (m.parentNode) m.parentNode.removeChild(m);
            });
        } catch (e) {
            console.error("Error cleaning up extra modals:", e);
        }

        // Ocultar botón flotante
        const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
        if (btn) btn.style.display = 'none';

        setTimeout(() => {
            try {
                if (previousActiveElement && document.body.contains(previousActiveElement)) {
                    previousActiveElement.focus();
                } else {
                    const article = document.querySelector('.roam-article') ||
                        document.querySelector('.rm-article-wrapper') ||
                        document.querySelector('.roam-body-main');

                    if (article) {
                        article.focus();
                        article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                        article.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                        article.click();
                    } else {
                        window.focus();
                    }
                }
            } catch (e) {
                console.error("Error restoring focus to Roam:", e);
            }
        }, 100);
    };

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close, onMinimize: minimize }), div);
};

// Función auxiliar para minimizar desde cualquier parte del código
DiscourseGraphToolkit.minimizeModal = function () {
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        existing.style.display = 'none';
        // Mostrar botón flotante
        const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
        if (btn) btn.style.display = 'flex';
        // Restaurar foco a Roam
        const article = document.querySelector('.roam-article') ||
            document.querySelector('.rm-article-wrapper') ||
            document.querySelector('.roam-body-main');
        if (article) {
            article.focus();
            article.click();
        }
    }
};


// --- MODULE: src/index.js ---
// ============================================================================
// INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Run storage migration to graph-specific keys (one-time)
    DiscourseGraphToolkit.migrateStorageToGraphSpecific();

    // Helper para esperar a que la API de Roam esté funcional
    DiscourseGraphToolkit._waitForRoamReady = async function (maxWait = 15000, interval = 500) {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            try {
                // Verificar que la API responde a queries asíncronas
                const test = await window.roamAlphaAPI.data.async.q('[:find ?e :where [?e :db/ident :db/ident] :limit 1]');
                if (test) return true;
            } catch (e) { /* Aún no lista */ }
            await new Promise(r => setTimeout(r, interval));
        }
        return false;
    };

    // Inicializar sincronización secuencialmente cuando Roam esté listo
    DiscourseGraphToolkit._waitForRoamReady().then(ready => {
        if (!ready) {
            console.warn("[DiscourseGraphToolkit] Roam API no estuvo lista después de 15 segundos.");
            return;
        }

        console.log("[DiscourseGraphToolkit] Roam API lista, iniciando sincronización...");
        
        DiscourseGraphToolkit.initializeProjectsSync()
            .then(() => {
                return DiscourseGraphToolkit.loadConfigFromRoam();
            })
            .then(data => {
                if (data) console.log("Configuración cargada desde Roam.");
            })
            .catch(e => {
                console.error("Error en inicialización:", e);
                DiscourseGraphToolkit.showToast("⚠️ Error inicializando plugin", "warning");
            });
    });

    // Registrar Comandos
    // Lista de comandos registrados (para cleanup en recargas)
    DiscourseGraphToolkit._registeredCommands = [
        'Discourse Graph Toolkit: Abrir',
        'Discourse Graph: Crear Pregunta (QUE)',
        'Discourse Graph: Crear Afirmación (CLM)',
        'Discourse Graph: Crear Evidencia (EVD)'
    ];

    // Limpiar comandos previos si existen (para manejar recargas del script)
    DiscourseGraphToolkit._registeredCommands.forEach(label => {
        try {
            window.roamAlphaAPI.ui.commandPalette.removeCommand({ label });
        } catch (e) { /* Ignorar - el comando no existía */ }
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph Toolkit: Abrir',
        callback: () => DiscourseGraphToolkit.openModal()
    });


    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Pregunta (QUE)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("QUE"),
        "default-hotkey": "ctrl-shift-q"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Afirmación (CLM)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("CLM"),
        "default-hotkey": "ctrl-shift-c"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Evidencia (EVD)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("EVD"),
        "default-hotkey": "ctrl-shift-e"
    });

    console.log(`✅ Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION} cargado.`);
} else {
    console.error("Roam Alpha API no disponible.");
}


})();

