/**
 * DISCOURSE GRAPH TOOLKIT v1.5.10
 * Bundled build: 2026-02-16 19:16:01
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "1.5.10";

// --- EMBEDDED SCRIPT FOR HTML EXPORT (MarkdownCore + htmlEmbeddedScript.js) ---
DiscourseGraphToolkit._HTML_EMBEDDED_SCRIPT = `// ============================================================================
// CORE: Markdown Core
// Funciones puras de generación de Markdown (sin dependencias del toolkit)
// Este código se usa tanto en el plugin como en el HTML exportado
// ============================================================================

// NOTA: Este archivo es inyectado en htmlEmbeddedScript.js durante el build
// NO puede depender de DiscourseGraphToolkit ni de ningún otro módulo

var MarkdownCore = {
    MAX_RECURSION_DEPTH: 20,

    // --- Limpieza de texto ---
    cleanText: function (text) {
        if (!text || typeof text !== 'string') return "";
        return text.replace(/\\s+/g, ' ').trim();
    },

    // --- Extracción de contenido de bloque ---
    extractBlockContent: function (block, indentLevel, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType) {
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

        var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
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
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
            }
        }

        var children = block.children || block[':block/children'] || [];
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var childContent = this.extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType);
                if (childContent) content += childContent;
            }
        }

        if (blockUid) delete visitedBlocks[blockUid];
        return content;
    },

    // --- Extracción de contenido de nodo ---
    extractNodeContent: function (nodeData, includeContent, nodeType, excludeBitacora, flatMode) {
        var detailedContent = '';
        if (!nodeData) return detailedContent;

        var children = nodeData.children || nodeData[':block/children'] || [];
        if (Array.isArray(children) && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var childString = child.string || child[':block/string'] || '';
                var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructuralMetadata = false;
                for (var j = 0; j < structuralMetadata.length; j++) {
                    if (childString.indexOf(structuralMetadata[j]) === 0) {
                        isStructuralMetadata = true;
                        break;
                    }
                }

                if (!isStructuralMetadata) {
                    var childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType);
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

    // --- Generación de Markdown completo ---
    generateMarkdown: function (questions, allNodes, config, excludeBitacora, flatMode) {
        var self = this;

        // Compatibilidad: si config es booleano, convertir a objeto
        if (typeof config === 'boolean') {
            config = { QUE: config, CLM: config, EVD: config };
        }
        if (!config) config = { QUE: true, CLM: true, EVD: true };

        var result = '# Estructura de Investigación\\n\\n';

        for (var q = 0; q < questions.length; q++) {
            var question = questions[q];
            try {
                var qTitle = self.cleanText((question.title || '').replace('[[QUE]] - ', ''));
                result += '## [[QUE]] - ' + qTitle + '\\n\\n';

                // Metadata
                var metadata = question.project_metadata || {};
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

                // Contenido QUE
                if (config.QUE) {
                    var queContent = self.extractNodeContent(question.data || question, true, 'QUE', excludeBitacora, flatMode);
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
                            var clmTitle = self.cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\\n\\n';

                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (clmMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n\\n';
                                    if (clmMetadata.seccion_tesis) result += 'Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n\\n';
                                } else {
                                    result += '**Información del proyecto:**\\n';
                                    if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n';
                                    if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n';
                                    result += '\\n\\n';
                                }
                            }

                            // Contenido CLM
                            if (config.CLM) {
                                var clmContent = self.extractNodeContent(clm.data, true, 'CLM', excludeBitacora, flatMode);
                                if (clmContent) result += clmContent + '\\n';
                            }

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = self.cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\\n';

                                        if (config.CLM) {
                                            var suppContent = self.extractNodeContent(suppClm.data, true, 'CLM', excludeBitacora, flatMode);
                                            if (suppContent) result += '\\n' + suppContent + '\\n';
                                        }

                                        // EVDs del CLM de Soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            for (var se = 0; se < suppClm.related_evds.length; se++) {
                                                var suppEvdUid = suppClm.related_evds[se];
                                                if (allNodes[suppEvdUid]) {
                                                    var suppEvd = allNodes[suppEvdUid];
                                                    var suppEvdTitle = self.cleanText((suppEvd.title || '').replace('[[EVD]] - ', ''));
                                                    result += '##### [[EVD]] - ' + suppEvdTitle + '\\n\\n';

                                                    var suppEvdMetadata = suppEvd.project_metadata || {};
                                                    if (suppEvdMetadata.proyecto_asociado || suppEvdMetadata.seccion_tesis) {
                                                        if (flatMode) {
                                                            if (suppEvdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\\n\\n';
                                                            if (suppEvdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\\n\\n';
                                                        } else {
                                                            result += '**Información del proyecto:**\\n';
                                                            if (suppEvdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\\n';
                                                            if (suppEvdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\\n';
                                                            result += '\\n';
                                                        }
                                                    }

                                                    if (config.EVD) {
                                                        var suppEvdContent = self.extractNodeContent(suppEvd.data, true, 'EVD', excludeBitacora, flatMode);
                                                        if (suppEvdContent) {
                                                            result += suppEvdContent + '\\n';
                                                        } else {
                                                            result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                result += '\\n';
                            }

                            // EVDs directos del CLM
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\\n\\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = self.cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\\n\\n';

                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            if (flatMode) {
                                                if (evdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n\\n';
                                                if (evdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n\\n';
                                            } else {
                                                result += '**Información del proyecto:**\\n';
                                                if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n';
                                                if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n';
                                                result += '\\n';
                                            }
                                        }

                                        if (config.EVD) {
                                            var evdContent = self.extractNodeContent(evd.data, true, 'EVD', excludeBitacora, flatMode);
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
                            var devdTitle = self.cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\\n\\n';

                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (devdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n\\n';
                                    if (devdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n\\n';
                                } else {
                                    result += '**Información del proyecto:**\\n';
                                    if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n';
                                    if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n';
                                    result += '\\n';
                                }
                            }

                            if (config.EVD) {
                                var devdContent = self.extractNodeContent(devd.data, true, 'EVD', excludeBitacora, flatMode);
                                if (devdContent) {
                                    result += devdContent + '\\n';
                                } else {
                                    result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                result += '*Error procesando pregunta: ' + err + '*\\n\\n';
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
// 1. CONFIGURACIÓN Y CONSTANTES
// ============================================================================

window.DiscourseGraphToolkit = window.DiscourseGraphToolkit || {};
// DiscourseGraphToolkit.VERSION = "1.5.9"; // Managed by build script

// Claves de LocalStorage
DiscourseGraphToolkit.STORAGE = {
    CONFIG: "discourseGraphToolkit_config",
    TEMPLATES: "discourseGraphToolkit_templates",
    PROJECTS: "discourseGraphToolkit_projects",
    HISTORY_NODES: "discourseGraphToolkit_history_nodes",
    HISTORY_EXPORT: "discourseGraphToolkit_history_export",
    QUESTION_ORDER: "discourseGraphToolkit_question_order",
    PANORAMIC_CACHE: "discourseGraphToolkit_panoramic_cache"
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

// Configuración de Archivos y Exportación
DiscourseGraphToolkit.FILES = {
    BYTES_PER_MB: 1024 * 1024,
    MAX_SIZE_MB: 10,
    MAX_DEPTH: 10
};

// Tipos de Nodos
DiscourseGraphToolkit.TYPES = {
    QUE: { prefix: "QUE", label: "Pregunta", color: "#2196F3" },
    CLM: { prefix: "CLM", label: "Afirmación", color: "#4CAF50" },
    EVD: { prefix: "EVD", label: "Evidencia", color: "#FF9800" }
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
    "QUE": `Proyecto Asociado:: {PROYECTO}
#RespondedBy
    -`,
    "CLM": `Proyecto Asociado:: {PROYECTO}
#SupportedBy
    -`,
    "EVD": `Proyecto Asociado:: {PROYECTO}`
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

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
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
    if (title.includes('[[QUE]]')) return 'QUE';
    if (title.includes('[[CLM]]')) return 'CLM';
    if (title.includes('[[EVD]]')) return 'EVD';
    return null;
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
// 2. GESTIÓN DE ALMACENAMIENTO (STORAGE)
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
        try { return JSON.parse(stored); } catch (e) { }
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
        const children = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid]]`);
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
    return stored ? JSON.parse(stored) : [];
};

DiscourseGraphToolkit.saveProjects = function (projects) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.PROJECTS), JSON.stringify(projects));
};

// --- Historial de Nodos ---
DiscourseGraphToolkit.getNodeHistory = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.HISTORY_NODES));
    return stored ? JSON.parse(stored) : [];
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
    const stored = localStorage.getItem(this.getStorageKey('discourseGraphToolkit_verificationCache'));
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) { }
    }
    return null;
};

DiscourseGraphToolkit.saveVerificationCache = function (results, status) {
    const data = {
        results,
        status,
        timestamp: Date.now()
    };
    localStorage.setItem(this.getStorageKey('discourseGraphToolkit_verificationCache'), JSON.stringify(data));
};

DiscourseGraphToolkit.clearVerificationCache = function () {
    localStorage.removeItem(this.getStorageKey('discourseGraphToolkit_verificationCache'));
};

// --- Persistencia del Orden de Preguntas ---
DiscourseGraphToolkit.saveQuestionOrder = function (projectKey, order) {
    if (!projectKey) return; // No guardar si no hay proyecto
    const allOrders = this.loadAllQuestionOrders();
    allOrders[projectKey] = order.map(q => q.uid); // Solo guardamos UIDs
    localStorage.setItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER),
        JSON.stringify(allOrders)
    );
};

DiscourseGraphToolkit.loadAllQuestionOrders = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER)
    );
    return stored ? JSON.parse(stored) : {};
};

DiscourseGraphToolkit.loadQuestionOrder = function (projectKey) {
    if (!projectKey) return null;
    const allOrders = this.loadAllQuestionOrders();
    return allOrders[projectKey] || null;
};

// --- Cache de Vista Panorámica ---
DiscourseGraphToolkit.savePanoramicCache = function (panoramicData) {
    // Crear copia limpia sin referencias circulares (node.data = node)
    const cleanData = {
        questions: panoramicData.questions.map(({ data, ...q }) => q),
        allNodes: Object.fromEntries(
            Object.entries(panoramicData.allNodes).map(([uid, node]) => {
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
    } catch (e) { return null; }
};

DiscourseGraphToolkit.clearPanoramicCache = function () {
    localStorage.removeItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_CACHE)
    );
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
        const query = `[:find ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/string ?string] [?child :block/order ?order] :order (asc ?order)]`;
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

        const existingQuery = `[:find ?uid ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid] [?child :block/string ?string]]`;
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
            }
        }

        const merged = [...new Set([...local, ...roam])].sort();

        if (merged.length > 0) {
            this.saveProjects(merged);
            await this.syncProjectsToRoam(merged);
            console.log(`Proyectos sincronizados: ${merged.length}`);
        }
    } catch (e) {
        console.error("Error initializing projects sync:", e);
        if (retry < 3) {
            setTimeout(() => this.initializeProjectsSync(retry + 1), 2000);
        }
    }
};

DiscourseGraphToolkit.validateProjectsInGraph = async function (projectNames) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
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

    const validation = {};
    projectNames.forEach(name => validation[name] = inGraph.has(name));
    return validation;
};

DiscourseGraphToolkit.discoverProjectsInGraph = async function () {
    const PM = this.ProjectManager;

    // Query para encontrar todos los bloques con la propiedad de proyecto
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
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

    // Query con OR: match exacto O sub-proyecto (prefijo/)
    const query = `[
            :find ?page-title ?page-uid
            :where
            [?page :node/title ?page-title]
            [?page :block/uid ?page-uid]
            [?block :block/page ?page]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${escapedPattern}")]
            (or
                [(clojure.string/includes? ?string "[[${escapedProject}]]")]
                [(clojure.string/includes? ?string "[[${escapedProjectPrefix}")]
            )
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
        // Cola de procesamiento: {uid, parentUid}
        const toProcess = [{ uid: questionUid, parentUid: null }];

        // Procesar iterativamente para evitar stack overflow en ramas muy profundas
        while (toProcess.length > 0) {
            const { uid: currentUid, parentUid: currentParentUid } = toProcess.shift();

            if (visited.has(currentUid)) continue;
            visited.add(currentUid);

            // Obtener datos del nodo actual
            const rawData = await window.roamAlphaAPI.data.async.pull(
                this.ROAM_PULL_PATTERN,
                [':block/uid', currentUid]
            );

            if (!rawData) continue;

            // Transformar a formato usable
            const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
            if (!nodeData) continue;

            const nodeType = this.getNodeType(nodeData.title);

            // Si es CLM o EVD, agregarlo a la lista de nodos encontrados
            if (nodeType === 'CLM' || nodeType === 'EVD') {
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
                if (!visited.has(refUid) && !toProcess.some(p => p.uid === refUid)) {
                    toProcess.push({ uid: refUid, parentUid: currentUid });
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
 * Helper: Extrae TODAS las referencias de nodos discourse del contenido de un nodo
 * Busca en #RespondedBy, #SupportedBy, #RelatedTo
 */
DiscourseGraphToolkit._extractAllReferencesFromNode = function (nodeData) {
    const references = new Set();

    if (!nodeData || !nodeData.children) return references;

    const self = this;

    const processBlock = (block) => {
        if (!block) return;

        const str = block.string || "";

        // Si es un bloque de relación, extraer referencias
        if (str.includes("#RespondedBy") || str.includes("#SupportedBy") || str.includes("#RelatedTo")) {
            // Extraer refs del bloque actual
            self._extractRefsFromBlock(block, references);

            // Extraer refs de los hijos del bloque
            if (block.children) {
                for (const child of block.children) {
                    self._extractRefsFromBlock(child, references);
                    // También procesar sub-hijos (para estructuras más profundas)
                    if (child.children) {
                        for (const subChild of child.children) {
                            self._extractRefsFromBlock(subChild, references);
                        }
                    }
                }
            }
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
        if (refContent.includes('[[CLM]]') || refContent.includes('[[EVD]]') || refContent.includes('[[QUE]]')) {
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

    const query = `[:find ?string
                   :where 
                   [?page :block/uid "${pageUid}"]
                   [?block :block/page ?page]
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
                   [?block :block/page ?page]
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
                // Proyecto completamente diferente
                different.push({ ...node, project: nodeProject, parentProject, reason: 'different' });
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
        const rootQuery = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${rootUid}"]
                           [?block :block/page ?page]
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
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${node.uid}"]
                           [?block :block/page ?page]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            const results = await window.roamAlphaAPI.data.async.q(query);

            if (results && results.length > 0) {
                const blockUid = results[0][0];
                const blockString = results[0][1];

                // Extraer el proyecto actual del nodo
                const match = blockString.match(regex);
                const currentProject = match ? match[1].trim() : null;

                // Si ya es coherente (exacto o sub-namespace), respetar la especialización
                if (currentProject && this.isHierarchicallyCoherent(targetProject, currentProject)) {
                    skipped++;
                    continue;
                }

                // Actualizar solo si es incoherente
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
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${node.uid}"]
                           [?block :block/page ?page]
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
                   [?block :block/page ?page]
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
                              [?block :block/page ?page]
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
                                 [(clojure.string/starts-with? ?target-title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[EVD]] - ")])
                               [?source-block :block/refs ?target]
                               [?source-block :block/page ?source-page]
                               [?source-page :node/title ?source-title]
                               (or
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
                const type = title.startsWith('[[QUE]]') ? 'QUE' :
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
// 3. LÓGICA DE CREACIÓN DE NODOS (CORE)
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
        let safeTitle = newPageTitle.replace(/"/g, '\\"');
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
            window.roamAlphaAPI.data.page.delete({ "page": { "uid": pageUid } });
        }
        if (blockUid && originalBlockContent) {
            window.roamAlphaAPI.data.block.update({ "block": { "uid": blockUid, "string": originalBlockContent } });
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
     * @returns {RegExp} Regex with capture group for project name
     */
    getFieldRegex: function () {
        const fieldName = this.getFieldName();
        // Escape special regex characters in field name
        const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped + "::\\s*\\[\\[([^\\]]+)\\]\\]");
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
// 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
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
// 6. LÓGICA DE IMPORTACIÓN (CORE)
// ============================================================================

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    console.log("🚀 STARTING IMPORT - VERSION 1.1.1 (FIXED)");
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
            await DiscourseGraphToolkit.importPage({ ...pageData, title, uid, children });
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
        await DiscourseGraphToolkit.logImportToDailyNote(importedTitles);
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
        await DiscourseGraphToolkit.importChildren(pageUid, pageData.children);
    }
};

DiscourseGraphToolkit.importChildren = async function (parentUid, children) {
    // Ordenar por 'order' si existe, para mantener la estructura
    const sortedChildren = children.sort((a, b) => (a.order || 0) - (b.order || 0));

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
// Ported from roamMap/core/content_processor.py
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
            const structuralMarkers = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
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
                    const structuralMetadata = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
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
        const { clmTitleMap, evdTitleMap } = this._createTitleMaps(allNodes);

        // Paso 2: Mapear QUE -> CLM/EVD (respuestas directas)
        this._mapQueRelationships(allNodes, clmTitleMap, evdTitleMap);

        // Paso 3: Mapear CLM -> EVD/CLM (estructura estándar y relaciones laterales)
        this._mapClmRelationships(allNodes, evdTitleMap, clmTitleMap);

        // Paso 4: Mapear relaciones CLM-CLM y CLM-EVD vía #RelatedTo
        this._mapClmRelatedToRelationships(allNodes, clmTitleMap, evdTitleMap);
    },

    _createTitleMaps: function (allNodes) {
        const clmTitleMap = {};
        const evdTitleMap = {};

        for (const uid in allNodes) {
            const node = allNodes[uid];
            try {
                if (node.type === "CLM") {
                    this._addToTitleMap(clmTitleMap, node, uid, "[[CLM]] - ");
                } else if (node.type === "EVD") {
                    this._addToTitleMap(evdTitleMap, node, uid, "[[EVD]] - ");
                }
            } catch (e) {
                console.warn(`⚠ Error creando mapa para nodo ${uid}: ${e}`);
            }
        }

        console.log(`Mapas creados: ${Object.keys(clmTitleMap).length} CLMs, ${Object.keys(evdTitleMap).length} EVDs`);
        return { clmTitleMap, evdTitleMap };
    },

    _addToTitleMap: function (titleMap, node, uid, prefix) {
        const title = node.title || "";
        if (!title) return;

        // Guardar tanto el título completo como una versión limpia
        titleMap[title] = uid;
        const cleanTitle = DiscourseGraphToolkit.cleanText(title.replace(prefix, ""));
        titleMap[cleanTitle] = uid;
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

                for (const child of children) {
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
                }
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para QUE ${uid}: ${e}`);
            }
        }
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

            // Buscar CLMs
            if (references.some(ref => ref.includes('CLM'))) {
                for (const ref of references) {
                    if (clmTitleMap[ref]) {
                        const clmUid = clmTitleMap[ref];
                        if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                            node[clmField].push(clmUid);
                        }
                    } else if (ref.includes('CLM')) {
                        // Búsqueda parcial
                        for (const titleFragment in clmTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const clmUid = clmTitleMap[titleFragment];
                                if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                                    node[clmField].push(clmUid);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Buscar EVDs
            if (references.some(ref => ref.includes('EVD'))) {
                for (const ref of references) {
                    if (evdTitleMap[ref]) {
                        const evdUid = evdTitleMap[ref];
                        if (!node[evdField].includes(evdUid)) {
                            node[evdField].push(evdUid);
                        }
                    } else if (ref.includes('EVD')) {
                        // Búsqueda parcial
                        for (const titleFragment in evdTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const evdUid = evdTitleMap[titleFragment];
                                if (!node[evdField].includes(evdUid)) {
                                    node[evdField].push(evdUid);
                                    break;
                                }
                            }
                        }
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

                for (const child of children) {
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
                }
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
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#RelatedTo")) {
                        this._processRelatedToChildren(child, node, uid, allNodes, clmTitleMap, evdTitleMap);
                    }
                }
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

    collectDependencies: function (nodes) {
        const dependencies = new Set();

        for (const node of nodes) {
            try {
                const data = node.data;
                const children = data.children || [];

                // QUE -> #RespondedBy
                if (node.type === "QUE") {
                    for (const child of children) {
                        if ((child.string || "").includes("#RespondedBy")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
                // CLM -> #SupportedBy / #RelatedTo
                else if (node.type === "CLM") {
                    for (const child of children) {
                        const str = child.string || "";
                        if (str.includes("#SupportedBy") || str.includes("#RelatedTo")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
            } catch (e) {
                console.warn(`Error collecting dependencies for ${node.uid}:`, e);
            }
        }
        return dependencies;
    },

    _collectRefsFromBlock: function (block, dependencies) {
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
};




// --- MODULE: src/core/markdownCore.js ---
// ============================================================================
// CORE: Markdown Core
// Funciones puras de generación de Markdown (sin dependencias del toolkit)
// Este código se usa tanto en el plugin como en el HTML exportado
// ============================================================================

// NOTA: Este archivo es inyectado en htmlEmbeddedScript.js durante el build
// NO puede depender de DiscourseGraphToolkit ni de ningún otro módulo

var MarkdownCore = {
    MAX_RECURSION_DEPTH: 20,

    // --- Limpieza de texto ---
    cleanText: function (text) {
        if (!text || typeof text !== 'string') return "";
        return text.replace(/\s+/g, ' ').trim();
    },

    // --- Extracción de contenido de bloque ---
    extractBlockContent: function (block, indentLevel, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType) {
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

        var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
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
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\n';
                    }
                }
            }
        }

        var children = block.children || block[':block/children'] || [];
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var childContent = this.extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode, nodeType);
                if (childContent) content += childContent;
            }
        }

        if (blockUid) delete visitedBlocks[blockUid];
        return content;
    },

    // --- Extracción de contenido de nodo ---
    extractNodeContent: function (nodeData, includeContent, nodeType, excludeBitacora, flatMode) {
        var detailedContent = '';
        if (!nodeData) return detailedContent;

        var children = nodeData.children || nodeData[':block/children'] || [];
        if (Array.isArray(children) && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var childString = child.string || child[':block/string'] || '';
                var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructuralMetadata = false;
                for (var j = 0; j < structuralMetadata.length; j++) {
                    if (childString.indexOf(structuralMetadata[j]) === 0) {
                        isStructuralMetadata = true;
                        break;
                    }
                }

                if (!isStructuralMetadata) {
                    var childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode, nodeType);
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

    // --- Generación de Markdown completo ---
    generateMarkdown: function (questions, allNodes, config, excludeBitacora, flatMode) {
        var self = this;

        // Compatibilidad: si config es booleano, convertir a objeto
        if (typeof config === 'boolean') {
            config = { QUE: config, CLM: config, EVD: config };
        }
        if (!config) config = { QUE: true, CLM: true, EVD: true };

        var result = '# Estructura de Investigación\n\n';

        for (var q = 0; q < questions.length; q++) {
            var question = questions[q];
            try {
                var qTitle = self.cleanText((question.title || '').replace('[[QUE]] - ', ''));
                result += '## [[QUE]] - ' + qTitle + '\n\n';

                // Metadata
                var metadata = question.project_metadata || {};
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

                // Contenido QUE
                if (config.QUE) {
                    var queContent = self.extractNodeContent(question.data || question, true, 'QUE', excludeBitacora, flatMode);
                    if (queContent) result += queContent + '\n';
                }

                var hasClms = question.related_clms && question.related_clms.length > 0;
                var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    result += '*No se encontraron respuestas relacionadas con esta pregunta.*\n\n';
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        var clmUid = question.related_clms[c];
                        if (allNodes[clmUid]) {
                            var clm = allNodes[clmUid];
                            var clmTitle = self.cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\n\n';

                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (clmMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\n\n';
                                    if (clmMetadata.seccion_tesis) result += 'Sección Narrativa: ' + clmMetadata.seccion_tesis + '\n\n';
                                } else {
                                    result += '**Información del proyecto:**\n';
                                    if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\n';
                                    if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\n';
                                    result += '\n\n';
                                }
                            }

                            // Contenido CLM
                            if (config.CLM) {
                                var clmContent = self.extractNodeContent(clm.data, true, 'CLM', excludeBitacora, flatMode);
                                if (clmContent) result += clmContent + '\n';
                            }

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = self.cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\n';

                                        if (config.CLM) {
                                            var suppContent = self.extractNodeContent(suppClm.data, true, 'CLM', excludeBitacora, flatMode);
                                            if (suppContent) result += '\n' + suppContent + '\n';
                                        }

                                        // EVDs del CLM de Soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            for (var se = 0; se < suppClm.related_evds.length; se++) {
                                                var suppEvdUid = suppClm.related_evds[se];
                                                if (allNodes[suppEvdUid]) {
                                                    var suppEvd = allNodes[suppEvdUid];
                                                    var suppEvdTitle = self.cleanText((suppEvd.title || '').replace('[[EVD]] - ', ''));
                                                    result += '##### [[EVD]] - ' + suppEvdTitle + '\n\n';

                                                    var suppEvdMetadata = suppEvd.project_metadata || {};
                                                    if (suppEvdMetadata.proyecto_asociado || suppEvdMetadata.seccion_tesis) {
                                                        if (flatMode) {
                                                            if (suppEvdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\n\n';
                                                            if (suppEvdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\n\n';
                                                        } else {
                                                            result += '**Información del proyecto:**\n';
                                                            if (suppEvdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\n';
                                                            if (suppEvdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\n';
                                                            result += '\n';
                                                        }
                                                    }

                                                    if (config.EVD) {
                                                        var suppEvdContent = self.extractNodeContent(suppEvd.data, true, 'EVD', excludeBitacora, flatMode);
                                                        if (suppEvdContent) {
                                                            result += suppEvdContent + '\n';
                                                        } else {
                                                            result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                result += '\n';
                            }

                            // EVDs directos del CLM
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = self.cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\n\n';

                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            if (flatMode) {
                                                if (evdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\n\n';
                                                if (evdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + evdMetadata.seccion_tesis + '\n\n';
                                            } else {
                                                result += '**Información del proyecto:**\n';
                                                if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\n';
                                                if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\n';
                                                result += '\n';
                                            }
                                        }

                                        if (config.EVD) {
                                            var evdContent = self.extractNodeContent(evd.data, true, 'EVD', excludeBitacora, flatMode);
                                            if (evdContent) {
                                                result += evdContent + '\n';
                                            } else {
                                                result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
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
                            var devdTitle = self.cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\n\n';

                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (devdMetadata.proyecto_asociado) result += 'Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\n\n';
                                    if (devdMetadata.seccion_tesis) result += 'Sección Narrativa: ' + devdMetadata.seccion_tesis + '\n\n';
                                } else {
                                    result += '**Información del proyecto:**\n';
                                    if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\n';
                                    if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\n';
                                    result += '\n';
                                }
                            }

                            if (config.EVD) {
                                var devdContent = self.extractNodeContent(devd.data, true, 'EVD', excludeBitacora, flatMode);
                                if (devdContent) {
                                    result += devdContent + '\n';
                                } else {
                                    result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                result += '*Error procesando pregunta: ' + err + '*\n\n';
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


// --- MODULE: src/core/htmlGenerator.js ---
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


// --- MODULE: src/core/markdownGenerator.js ---
// ============================================================================
// CORE: Markdown Generator
// Wrapper que usa MarkdownCore para mantener la interfaz pública
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, flatMode = false) {
        // Delegar completamente a MarkdownCore
        return MarkdownCore.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, flatMode);
    },

    // Convenience wrapper for flat markdown export (EPUB-ready)
    generateFlatMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true) {
        return this.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, true);
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
                currentChapter = {
                    title: this.cleanTitle(rawTitle),
                    nodeType: this.extractNodeType(rawTitle),
                    level: 2,
                    content: []
                };
            } else if (currentChapter) {
                currentChapter.content.push(line);
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
    markdownToXhtml: function (lines) {
        let html = '';
        let inParagraph = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                if (inParagraph) {
                    html += '</p>\n';
                    inParagraph = false;
                }
                continue;
            }

            // Headers - with explicit level and node type prefixes for e-ink readability
            if (trimmed.startsWith('##### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const nodeType = this.extractNodeType(trimmed);
                const typePrefix = nodeType ? `[${nodeType}]` : '';
                html += `<h5>[H5]${typePrefix} ${this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^#####\s*/, '')))}</h5>\n`;
            } else if (trimmed.startsWith('#### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const nodeType = this.extractNodeType(trimmed);
                const typePrefix = nodeType ? `[${nodeType}]` : '';
                html += `<h4>[H4]${typePrefix} ${this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^####\s*/, '')))}</h4>\n`;
            } else if (trimmed.startsWith('### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const nodeType = this.extractNodeType(trimmed);
                const typePrefix = nodeType ? `[${nodeType}]` : '';
                html += `<h3>[H3]${typePrefix} ${this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^###\s*/, '')))}</h3>\n`;
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
        const navPoints = chapters.map((chapter, i) => `
    <navPoint id="navpoint${i + 2}" playOrder="${i + 2}">
      <navLabel><text>${this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)))}</text></navLabel>
      <content src="chapter${i + 1}.xhtml"/>
    </navPoint>`
        ).join('');

        const tocNavPoint = `
    <navPoint id="navpoint1" playOrder="1">
      <navLabel><text>Tabla de Contenidos</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>`;

        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeHtml(title)}</text></docTitle>
  <navMap>
${tocNavPoint}${navPoints}
  </navMap>
</ncx>`;
    },

    createNavXhtml: function (title, chapters) {
        const navItems = chapters.map((chapter, i) =>
            `        <li><a href="chapter${i + 1}.xhtml">${this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)))}</a></li>`
        ).join('\n');

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
        const content = this.markdownToXhtml(chapter.content);

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeHtml(this.stripMarkdown(chapter.title))}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2>[H2]${chapter.nodeType ? `[${chapter.nodeType}]` : ''} ${this.processInlineMarkdown(chapter.title)}</h2>
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

    // --- Determinar si un nodo está expandido ---
    const isNodeExpanded = (nodePath) => {
        return expandedNodes[nodePath] === undefined ? defaultExpanded : expandedNodes[nodePath];
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

            // Contenido cuando está expandido
            isExpanded && React.createElement('div', null,
                // Contenido específico del nodo (preguntas, etc.)
                renderNodeContent && renderNodeContent(node, depth),
                // Hijos recursivos
                hasChildren && Object.keys(node.children).sort().map(childKey =>
                    renderNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render principal ---
    return React.createElement('div', null,
        Object.keys(tree).sort().map(projectKey =>
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
        exportStatus, setExportStatus,
        config, setConfig,
        templates, setTemplates,
        newProject, setNewProject
    } = DiscourseGraphToolkit.useToolkit();

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
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const handleBulkDeleteProjects = async () => {
        const toDelete = Object.keys(selectedProjectsForDelete).filter(k => selectedProjectsForDelete[k]);
        if (toDelete.length === 0) return;

        const updated = projects.filter(p => !selectedProjectsForDelete[p]);
        setProjects(updated);
        setSelectedProjectsForDelete({});
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const toggleSelectAllProjects = () => {
        const allSelected = projects.every(p => selectedProjectsForDelete[p]);
        const newSelection = {};
        projects.forEach(p => newSelection[p] = !allSelected);
        setSelectedProjectsForDelete(newSelection);
    };

    const handleValidate = async () => {
        setExportStatus("Validando proyectos...");
        const val = await DiscourseGraphToolkit.validateProjectsInGraph(projects);
        setValidation(val);
        setExportStatus("Validación completada.");
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
        setExportStatus("Sincronizando...");
        try {
            await DiscourseGraphToolkit.initializeProjectsSync();
            setProjects(DiscourseGraphToolkit.getProjects());
            DiscourseGraphToolkit.showToast("Sincronización completada.", "success");
        } catch (e) {
            DiscourseGraphToolkit.showToast("Error en sincronización.", "error");
        } finally {
            setExportStatus("");
        }
    };

    const handleAddSuggestion = async (proj) => {
        if (!projects.includes(proj)) {
            const updated = [...projects, proj].sort();
            setProjects(updated);
            setSuggestions(suggestions.filter(s => s !== proj));
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    // --- Render de nodo del árbol de proyectos (recursivo) ---
    const renderProjectTreeNode = (node, key, depth) => {
        const isExpanded = expandedProjects[node.project] !== false;
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjectsForDelete[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        // Obtener estado de validación del proyecto hoja
        const validationStatus = node.isLeaf && validation[node.project] !== undefined
            ? (validation[node.project] ? '✅' : '⚠️')
            : '';

        return React.createElement('div', { key: key, style: { marginLeft: depth > 0 ? '1rem' : 0 } },
            React.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.5rem',
                    borderBottom: '1px solid #eee',
                    backgroundColor: depth === 0 ? '#f8f8f8' : 'transparent',
                    fontSize: '0.8125rem'
                }
            },
                // Expand/collapse toggle
                hasChildren && React.createElement('span', {
                    onClick: () => toggleProjectExpand(node.project),
                    style: { cursor: 'pointer', color: '#666', fontSize: '0.6875rem', width: '0.75rem' }
                }, isExpanded ? '▼' : '▶'),
                !hasChildren && React.createElement('span', { style: { width: '0.75rem' } }),
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
                    hasChildren ? `📁 ${key}` : key,
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
        React.createElement('h3', { style: { marginTop: 0 } }, '📋 Lista de Proyectos'),
        React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '0.625rem' } },
            React.createElement('button', { onClick: handleValidate, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer' } }, "Validar Existencia"),
            React.createElement('button', { onClick: handleScanProjects, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
            React.createElement('button', { onClick: handleForceSync, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
        ),

        suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '1.25rem', padding: '0.625rem', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '0.25rem' } },
            React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`),
            React.createElement('div', { style: { maxHeight: '18.75rem', overflowY: 'auto', border: '1px solid #ddd', backgroundColor: 'white' } },
                suggestions.map(s =>
                    React.createElement('div', { key: s, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' } },
                        React.createElement('span', null, s),
                        React.createElement('button', { onClick: () => handleAddSuggestion(s), style: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '0.1875rem', cursor: 'pointer' } }, '+ Añadir')
                    )
                )
            )
        ),

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem', alignItems: 'center' } },
            React.createElement('label', null,
                React.createElement('input', {
                    type: 'checkbox',
                    checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                    onChange: toggleSelectAllProjects,
                    style: { marginRight: '0.3125rem' }
                }),
                'Seleccionar Todo'
            ),
            React.createElement('button', {
                onClick: handleBulkDeleteProjects,
                disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                style: {
                    padding: '0.3125rem 0.625rem',
                    backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? '#f44336' : '#ccc',
                    color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer'
                }
            }, 'Eliminar Seleccionados')
        ),

        React.createElement('div', { style: { maxHeight: '25rem', overflowY: 'auto', border: '1px solid #eee', backgroundColor: '#fafafa' } },
            projects.length === 0 ? React.createElement('div', { style: { padding: '1rem', color: '#999' } }, 'No hay proyectos.') :
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
        orphanResults, setOrphanResults,
        isSearchingOrphans, setIsSearchingOrphans
    } = DiscourseGraphToolkit.useToolkit();

    // --- Estado para popover de nodos problemáticos ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | 'orphans' | null

    // --- Árbol jerárquico (calculado) ---
    const projectTree = React.useMemo(() => {
        if (bulkVerificationResults.length === 0) return {};
        return DiscourseGraphToolkit.buildProjectTree(bulkVerificationResults);
    }, [bulkVerificationResults]);

    // --- Contadores ---
    const counts = React.useMemo(() => ({
        coherent: bulkVerificationResults.filter(r => r.status === 'coherent').length,
        specialized: bulkVerificationResults.filter(r => r.status === 'specialized').length,
        different: bulkVerificationResults.flatMap(r => r.coherence.different).length,
        missing: bulkVerificationResults.flatMap(r => r.coherence.missing).length,
        orphans: orphanResults.length
    }), [bulkVerificationResults, orphanResults]);

    // --- Helpers ---
    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
            DiscourseGraphToolkit.minimizeModal();
        } catch (e) {
            console.error("Error navigating to page:", e);
            window.open(`https://roamresearch.com/#/app/${DiscourseGraphToolkit.getGraphName()}/page/${uid}`, '_blank');
        }
    };

    // --- Handlers ---
    const handleBulkVerifyAll = async () => {
        setIsBulkVerifying(true);
        setBulkVerifyStatus('⏳ Cargando preguntas...');
        setBulkVerificationResults([]);
        setSelectedBulkQuestion(null);

        try {
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            const results = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${questions.length}...`);

                const branchNodes = await DiscourseGraphToolkit.getBranchNodes(q.pageUid);
                const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(q.pageUid, branchNodes);

                let status = 'coherent';
                if (cohResult.missing.length > 0) status = 'missing';
                else if (cohResult.different.length > 0) status = 'different';
                else if (cohResult.specialized.length > 0) status = 'specialized';

                results.push({
                    question: q,
                    branchNodes,
                    coherence: cohResult,
                    status
                });
            }

            setBulkVerificationResults(results);
            const coherent = results.filter(r => r.status === 'coherent').length;
            const specialized = results.filter(r => r.status === 'specialized').length;
            const different = results.filter(r => r.status === 'different').length;
            const missing = results.filter(r => r.status === 'missing').length;
            const statusMsg = `✅ ${coherent} coherentes, ${specialized} esp., ${different} dif., ${missing} sin proy.`;
            setBulkVerifyStatus(statusMsg);
            DiscourseGraphToolkit.saveVerificationCache(results, statusMsg);

            // Refrescar huérfanos si ya se habían buscado previamente
            if (orphanResults.length > 0) {
                setBulkVerifyStatus(`${statusMsg} ⏳ Actualizando huérfanos...`);
                const orphans = await DiscourseGraphToolkit.findOrphanNodes();
                setOrphanResults(orphans);
                setBulkVerifyStatus(`${statusMsg} 👻 ${orphans.length} huérfanos.`);
            }
        } catch (e) {
            console.error('Bulk verification error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsBulkVerifying(false);
        }
    };

    const handleFindOrphans = async () => {
        setIsSearchingOrphans(true);
        setBulkVerifyStatus('⏳ Buscando huérfanos...');
        try {
            const orphans = await DiscourseGraphToolkit.findOrphanNodes();
            setOrphanResults(orphans);
            setBulkVerifyStatus(`✅ Encontrados ${orphans.length} huérfanos.`);
        } catch (e) {
            console.error('Orphan search error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsSearchingOrphans(false);
        }
    };

    const handleBulkSelectQuestion = (result) => {
        setSelectedBulkQuestion(result);
        setEditableProject(result.coherence.rootProject || '');
    };

    const handleBulkPropagateProject = async () => {
        if (!selectedBulkQuestion || !editableProject.trim()) {
            return;
        }

        const nodesToUpdate = [
            ...selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization'),
            ...selectedBulkQuestion.coherence.missing
        ];
        if (nodesToUpdate.length === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Propagando "${editableProject}" a ${nodesToUpdate.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateProjectToBranch(
                selectedBulkQuestion.question.pageUid,
                editableProject.trim(),
                nodesToUpdate
            );

            if (result.success) {
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const handlePropagateFromParents = async () => {
        if (!selectedBulkQuestion) return;

        const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
        if (generalizations.length === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Heredando proyectos de padres para ${generalizations.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateFromParents(generalizations);

            if (result.success) {
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const refreshSelectedQuestion = async () => {
        setBulkVerifyStatus(`✅ Completado. Sincronizando con Roam...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        setBulkVerifyStatus(`✅ Refrescando datos...`);
        const branchNodes = await DiscourseGraphToolkit.getBranchNodes(selectedBulkQuestion.question.pageUid);
        const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(selectedBulkQuestion.question.pageUid, branchNodes);

        let status = 'coherent';
        if (cohResult.missing.length > 0) status = 'missing';
        else if (cohResult.different.length > 0) status = 'different';
        else if (cohResult.specialized.length > 0) status = 'specialized';

        const updatedResult = { ...selectedBulkQuestion, branchNodes, coherence: cohResult, status };
        const updatedResults = bulkVerificationResults.map(r =>
            r.question.pageUid === selectedBulkQuestion.question.pageUid ? updatedResult : r
        );
        setBulkVerificationResults(updatedResults);
        setSelectedBulkQuestion(updatedResult);
        const statusMsg = `✅ Propagación completada.`;
        setBulkVerifyStatus(statusMsg);
        DiscourseGraphToolkit.saveVerificationCache(updatedResults, statusMsg);
    };

    // --- Callbacks para ProjectTreeView ---
    const renderBranchesNodeHeader = (node, key, depth, isExpanded, toggleFn) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const totalQuestions = DiscourseGraphToolkit.countTreeQuestions(node);

        return React.createElement('div', {
            onClick: toggleFn,
            style: {
                padding: '0.5rem 0.75rem',
                backgroundColor: depth === 0 ? '#f0f0f0' : '#f8f8f8',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: depth === 0 ? 'bold' : '500'
            }
        },
            React.createElement('span', { style: { color: '#666', fontSize: '0.75rem' } },
                isExpanded ? '▼' : '▶'),
            React.createElement('span', null, '📁'),
            React.createElement('span', { style: { flex: 1 } },
                node.project || '(sin proyecto)'),
            React.createElement('span', {
                style: {
                    fontSize: '0.6875rem',
                    color: '#666',
                    backgroundColor: '#f5f5f5',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.1875rem'
                }
            }, `${totalQuestions} pregunta${totalQuestions !== 1 ? 's' : ''}`)
        );
    };

    const renderBranchesNodeContent = (node, depth) => {
        if (!node.questions || node.questions.length === 0) return null;

        return React.createElement('div', null,
            node.questions.map(result =>
                React.createElement('div', {
                    key: result.question.pageUid,
                    onClick: (e) => { e.stopPropagation(); handleBulkSelectQuestion(result); },
                    style: {
                        padding: '0.5rem 0.75rem',
                        paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: selectedBulkQuestion?.question.pageUid === result.question.pageUid ? '#e3f2fd' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8125rem'
                    }
                },
                    React.createElement('span', { style: { fontSize: '0.875rem', flexShrink: 0 } },
                        result.status === 'coherent' ? '✅' : result.status === 'specialized' ? '🔀' : result.status === 'different' ? '⚠️' : '❌'),
                    React.createElement('span', { style: { flex: 1, lineHeight: '1.3' } },
                        result.question.pageTitle.replace('[[QUE]] - ', '')),
                    React.createElement('span', { style: { fontSize: '0.6875rem', color: '#999', whiteSpace: 'nowrap' } },
                        `${result.branchNodes.length} nodos`)
                )
            )
        );
    };

    // --- Badge Component ---
    const Badge = ({ emoji, count, label, bgColor, textColor, onClick, isActive }) => {
        return React.createElement('span', {
            onClick: onClick,
            style: {
                padding: '0.25rem 0.5rem',
                backgroundColor: bgColor,
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: textColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: onClick ? 'pointer' : 'default',
                border: isActive ? `2px solid ${textColor}` : '2px solid transparent',
                whiteSpace: 'nowrap'
            }
        }, `${emoji} ${count}`);
    };

    // --- Render ---
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        // Header compacto con badges a la derecha
        React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }
        },
            // Lado izquierdo: título y botones
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
                React.createElement('h3', { style: { margin: 0, fontSize: '1.125rem' } }, '🌿 Coherencia de Ramas'),
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                    React.createElement('button', {
                        onClick: handleBulkVerifyAll,
                        disabled: isBulkVerifying,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: isBulkVerifying ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isBulkVerifying ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 'bold'
                        }
                    }, isBulkVerifying ? '⏳...' : '🔍 Verificar'),
                    React.createElement('button', {
                        onClick: handleFindOrphans,
                        disabled: isSearchingOrphans,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: isSearchingOrphans ? '#ccc' : '#9C27B0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isSearchingOrphans ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 'bold'
                        }
                    }, isSearchingOrphans ? '⏳...' : '👻 Huérfanos')
                )
            ),
            // Lado derecho: badges y status
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' } },
                // Badges en línea
                bulkVerificationResults.length > 0 && React.createElement('div', {
                    style: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end', position: 'relative' }
                },
                    React.createElement(Badge, { emoji: '✅', count: counts.coherent, bgColor: '#e8f5e9', textColor: '#4CAF50' }),
                    React.createElement(Badge, { emoji: '🔀', count: counts.specialized, bgColor: '#e3f2fd', textColor: '#2196F3' }),
                    // Badge Diferente (clickeable)
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '⚠️', count: counts.different, bgColor: '#fff3e0', textColor: '#ff9800',
                            onClick: () => counts.different > 0 && setOpenPopover(openPopover === 'different' ? null : 'different'),
                            isActive: openPopover === 'different'
                        }),
                        // Popover Diferente
                        openPopover === 'different' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #ff9800', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#fff3e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `⚠️ ${counts.different} nodos diferentes`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            bulkVerificationResults.flatMap(r => r.coherence.different.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            ))
                        )
                    ),
                    // Badge Sin proyecto (clickeable)
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '❌', count: counts.missing, bgColor: '#ffebee', textColor: '#f44336',
                            onClick: () => counts.missing > 0 && setOpenPopover(openPopover === 'missing' ? null : 'missing'),
                            isActive: openPopover === 'missing'
                        }),
                        // Popover Sin proyecto
                        openPopover === 'missing' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #f44336', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#ffebee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `❌ ${counts.missing} sin proyecto`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            bulkVerificationResults.flatMap(r => r.coherence.missing.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            ))
                        )
                    ),
                    // Badge Huérfanos (clickeable)
                    orphanResults.length > 0 && React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '👻', count: counts.orphans, bgColor: '#f3e5f5', textColor: '#9C27B0',
                            onClick: () => setOpenPopover(openPopover === 'orphans' ? null : 'orphans'),
                            isActive: openPopover === 'orphans'
                        }),
                        // Popover Huérfanos
                        openPopover === 'orphans' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #9C27B0', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#f3e5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `👻 ${counts.orphans} huérfanos`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            orphanResults.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#f3e5f5', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            )
                        )
                    )
                ),
                // Status compacto
                bulkVerifyStatus && React.createElement('span', {
                    style: {
                        fontSize: '0.75rem',
                        color: bulkVerifyStatus.includes('✅') ? '#4CAF50' :
                            bulkVerifyStatus.includes('⚠️') ? '#ff9800' :
                                bulkVerifyStatus.includes('❌') ? '#f44336' : '#666',
                        fontWeight: '500'
                    }
                }, bulkVerifyStatus)
            )
        ),

        // Vista de árbol jerárquico por proyectos (más altura)
        bulkVerificationResults.length > 0 && React.createElement('div', { style: { flex: 1, minHeight: 0, marginBottom: '0.75rem' } },
            React.createElement('div', {
                style: { height: '100%', maxHeight: '28rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: '#fafafa' }
            },
                React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                    tree: projectTree,
                    renderNodeHeader: renderBranchesNodeHeader,
                    renderNodeContent: renderBranchesNodeContent,
                    defaultExpanded: true
                })
            )
        ),

        // Panel de detalle (más compacto)
        selectedBulkQuestion && React.createElement('div', { style: { border: '1px solid #2196F3', borderRadius: '0.25rem', padding: '0.75rem', backgroundColor: '#f8f9fa' } },
            React.createElement('h4', { style: { margin: '0 0 0.75rem 0', fontSize: '0.875rem', lineHeight: '1.4' } },
                selectedBulkQuestion.question.pageTitle.replace('[[QUE]] - ', '')),

            // Proyecto editable y botones de propagación
            React.createElement('div', { style: { marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' } },
                React.createElement('span', { style: { fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8125rem' } }, '📁 Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    style: { flex: 1, minWidth: '10rem', padding: '0.375rem 0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem', fontSize: '0.8125rem' }
                })
            ),

            // Botones de propagación (separados por tipo de error)
            React.createElement('div', { style: { marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                // Botón 1: Propagar raíz
                (() => {
                    const nonGeneralizations = selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization');
                    const count = nonGeneralizations.length + selectedBulkQuestion.coherence.missing.length;
                    return count > 0 && React.createElement('button', {
                        onClick: handleBulkPropagateProject,
                        disabled: isPropagating || !editableProject.trim(),
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: (isPropagating || !editableProject.trim()) ? '#ccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: (isPropagating || !editableProject.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isPropagating ? '⏳...' : `🔄 Propagar raíz (${count})`);
                })(),

                // Botón 2: Heredar de padres
                (() => {
                    const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
                    return generalizations.length > 0 && React.createElement('button', {
                        onClick: handlePropagateFromParents,
                        disabled: isPropagating,
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: isPropagating ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isPropagating ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isPropagating ? '⏳...' : `⬆️ Heredar de padres (${generalizations.length})`);
                })()
            ),

            // Resumen compacto
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap' } },
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '0.1875rem' } },
                    `✅ ${selectedBulkQuestion.coherence.coherent.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#e3f2fd', borderRadius: '0.1875rem' } },
                    `🔀 ${selectedBulkQuestion.coherence.specialized.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#fff3e0', borderRadius: '0.1875rem' } },
                    `⚠️ ${selectedBulkQuestion.coherence.different.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#ffebee', borderRadius: '0.1875rem' } },
                    `❌ ${selectedBulkQuestion.coherence.missing.length}`)
            ),

            // Lista de nodos problemáticos
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { style: { maxHeight: '10rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: 'white' } },
                selectedBulkQuestion.coherence.different.map(node =>
                    React.createElement('div', { key: node.uid, style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' } },
                        React.createElement('span', { style: { color: '#ff9800', fontSize: '0.8125rem', flexShrink: 0 } }, '⚠️'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.25rem', borderRadius: '0.125rem', marginRight: '0.375rem' } }, node.type),
                            React.createElement('span', { style: { fontSize: '0.75rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            React.createElement('div', { style: { fontSize: '0.625rem', color: '#666', marginTop: '0.125rem' } },
                                React.createElement('span', null, `Debería heredar: ${node.parentProject}`),
                                React.createElement('span', { style: { marginLeft: '0.5rem' } }, `Tiene: ${node.project}`)
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer', flexShrink: 0 }
                        }, '→ Ir')
                    )
                ),
                selectedBulkQuestion.coherence.missing.map(node =>
                    React.createElement('div', { key: node.uid, style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' } },
                        React.createElement('span', { style: { color: '#f44336', fontSize: '0.8125rem', flexShrink: 0 } }, '❌'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '0.125rem 0.25rem', borderRadius: '0.125rem', marginRight: '0.375rem' } }, node.type),
                            React.createElement('span', { style: { fontSize: '0.75rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            node.parentProject && React.createElement('div', { style: { fontSize: '0.625rem', color: '#666', marginTop: '0.125rem' } },
                                `Debería heredar: ${node.parentProject}`
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer', flexShrink: 0 }
                        }, '→ Ir')
                    )
                )
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

    // Desestructurar del contexto (algunos nombres difieren de los props originales)
    const {
        projects,
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions: expandedQuestions, setPanoramicExpandedQuestions: setExpandedQuestions,
        panoramicLoadStatus: loadStatus, setPanoramicLoadStatus: setLoadStatus,
        panoramicSelectedProject: selectedProject, setPanoramicSelectedProject: setSelectedProject
    } = DiscourseGraphToolkit.useToolkit();

    // Estado de carga (local, no necesita persistir)
    const [isLoading, setIsLoading] = React.useState(false);

    // Estado local para el orden de preguntas
    const [orderedQuestionUIDs, setOrderedQuestionUIDs] = React.useState([]);

    // Estado para tracking del timestamp del cache
    const [cacheTimestamp, setCacheTimestamp] = React.useState(null);

    // --- Helpers de Reordenamiento ---
    const moveQuestionUp = (index) => {
        if (index === 0 || !selectedProject) return;
        const newOrder = [...orderedQuestionUIDs];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setOrderedQuestionUIDs(newOrder);
        DiscourseGraphToolkit.saveQuestionOrder(selectedProject, newOrder.map(uid => ({ uid })));
    };

    const moveQuestionDown = (index) => {
        if (index === orderedQuestionUIDs.length - 1 || !selectedProject) return;
        const newOrder = [...orderedQuestionUIDs];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrderedQuestionUIDs(newOrder);
        DiscourseGraphToolkit.saveQuestionOrder(selectedProject, newOrder.map(uid => ({ uid })));
    };

    // Efecto para cargar/sincronizar orden cuando cambia el proyecto o los datos
    React.useEffect(() => {
        if (!panoramicData || !selectedProject) {
            setOrderedQuestionUIDs([]);
            return;
        }
        // Obtener preguntas filtradas por proyecto
        const projectQuestions = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
        });
        // Cargar orden guardado
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(selectedProject);
        if (savedOrder && savedOrder.length > 0) {
            // Ordenar según guardado, agregar nuevas al final
            const orderedUIDs = savedOrder.filter(uid => projectQuestions.some(q => q.uid === uid));
            const newUIDs = projectQuestions.filter(q => !savedOrder.includes(q.uid)).map(q => q.uid);
            setOrderedQuestionUIDs([...orderedUIDs, ...newUIDs]);
        } else {
            setOrderedQuestionUIDs(projectQuestions.map(q => q.uid));
        }
    }, [panoramicData, selectedProject]);


    // --- Helpers ---
    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
            // Minimizar el modal para poder ver el nodo (mantiene estado)
            DiscourseGraphToolkit.minimizeModal();
        } catch (e) {
            console.error("Error navigating to page:", e);
            window.open(`https://roamresearch.com/#/app/${DiscourseGraphToolkit.getGraphName()}/page/${uid}`, '_blank');
        }
    };

    const toggleQuestion = (uid) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    const cleanTitle = (title, type) => {
        return (title || '').replace(new RegExp(`\\[\\[${type}\\]\\]\\s*-\\s*`), '');
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

    // --- Cargar datos panorámicos ---
    const handleLoadPanoramic = async () => {
        setIsLoading(true);
        setLoadStatus('⏳ Buscando todas las preguntas...');
        setPanoramicData(null);

        try {
            // 1. Obtener todas las preguntas (QUE) del grafo
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            setLoadStatus(`⏳ Encontradas ${questions.length} preguntas. Cargando datos...`);

            // 2. Obtener datos completos de las preguntas
            const uids = questions.map(q => q.pageUid);
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

            // 4. Analizar dependencias y cargar nodos faltantes
            setLoadStatus('⏳ Analizando relaciones...');
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setLoadStatus(`⏳ Cargando ${missingUids.length} nodos relacionados...`);
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, true, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }

            // 5. Mapear relaciones
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // 6. Obtener proyectos de cada pregunta
            setLoadStatus('⏳ Obteniendo proyectos...');
            for (const q of questions) {
                const project = await DiscourseGraphToolkit.getProjectFromNode(q.pageUid);
                if (allNodes[q.pageUid]) {
                    allNodes[q.pageUid].project = project;
                }
            }

            // 7. Filtrar solo QUEs del resultado
            const questionNodes = result.data.filter(node =>
                DiscourseGraphToolkit.getNodeType(node.title) === 'QUE'
            ).map(node => ({
                ...node,
                project: allNodes[node.uid]?.project || null
            }));

            setPanoramicData({ questions: questionNodes, allNodes });
            // Guardar en cache
            DiscourseGraphToolkit.savePanoramicCache({ questions: questionNodes, allNodes });
            setCacheTimestamp(Date.now());
            setLoadStatus(`✅ Cargadas ${questionNodes.length} preguntas con ${Object.keys(allNodes).length} nodos totales.`);

        } catch (e) {
            console.error('Error loading panoramic:', e);
            setLoadStatus('❌ Error: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Renderizar rama de un CLM ---
    const renderCLMBranch = (clmUid, allNodes, depth = 0) => {
        const clm = allNodes[clmUid];
        if (!clm) return null;

        const maxDepth = 3;
        if (depth > maxDepth) return React.createElement('span', { style: { color: '#999', fontSize: '0.6875rem' } }, '...');

        return React.createElement('span', {
            key: clmUid,
            style: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }
        },
            // CLM node
            React.createElement('span', {
                onClick: (e) => { e.stopPropagation(); handleNavigateToPage(clmUid); },
                style: {
                    color: '#4CAF50',
                    cursor: 'pointer',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '0.125rem',
                    backgroundColor: '#e8f5e9',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                },
                title: clm.title
            }, `📌 ${cleanTitle(clm.title, 'CLM')}`),

            // EVDs del CLM
            clm.related_evds && clm.related_evds.length > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', { style: { color: '#999', margin: '0 0.25rem', fontSize: '0.6875rem' } }, '→'),
                clm.related_evds.slice(0, 3).map((evdUid, i) => {
                    const evd = allNodes[evdUid];
                    if (!evd) return null;
                    return React.createElement('span', {
                        key: evdUid,
                        onClick: (e) => { e.stopPropagation(); handleNavigateToPage(evdUid); },
                        style: {
                            color: '#ff9800',
                            cursor: 'pointer',
                            padding: '0.125rem 0.25rem',
                            borderRadius: '0.125rem',
                            backgroundColor: '#fff3e0',
                            fontSize: '0.6875rem',
                            marginRight: i < clm.related_evds.length - 1 ? '0.25rem' : 0,
                            whiteSpace: 'nowrap'
                        },
                        title: evd.title
                    }, `📎 ${cleanTitle(evd.title, 'EVD').substring(0, 20)}`);
                }),
                clm.related_evds.length > 3 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.625rem', marginLeft: '0.25rem' }
                }, `+${clm.related_evds.length - 3}`)
            ),

            // CLMs de soporte (recursivo)
            clm.supporting_clms && clm.supporting_clms.length > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', { style: { color: '#999', margin: '0 0.25rem', fontSize: '0.6875rem' } }, '⤷'),
                clm.supporting_clms.slice(0, 2).map(suppUid =>
                    renderCLMBranch(suppUid, allNodes, depth + 1)
                ),
                clm.supporting_clms.length > 2 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.625rem', marginLeft: '0.25rem' }
                }, `+${clm.supporting_clms.length - 2}`)
            )
        );
    };

    // --- Renderizar una pregunta con sus ramas ---
    const renderQuestion = (question, allNodes) => {
        const isExpanded = expandedQuestions[question.uid] === true; // Colapsado por defecto
        const clms = question.related_clms || [];
        const directEvds = question.direct_evds || [];
        const totalBranches = clms.length + directEvds.length;

        return React.createElement('div', {
            key: question.uid,
            style: {
                marginBottom: '0.5rem',
                borderLeft: '3px solid #2196F3',
                paddingLeft: '0.75rem',
                backgroundColor: '#fafafa',
                borderRadius: '0 0.25rem 0.25rem 0'
            }
        },
            // Header de la pregunta
            React.createElement('div', {
                onClick: () => toggleQuestion(question.uid),
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    cursor: 'pointer'
                }
            },
                // Botones de reordenamiento (solo si hay proyecto seleccionado)
                selectedProject && React.createElement('div', {
                    style: { display: 'flex', flexDirection: 'column', marginRight: '0.25rem' },
                    onClick: (e) => e.stopPropagation()
                },
                    React.createElement('button', {
                        onClick: () => moveQuestionUp(orderedQuestionUIDs.indexOf(question.uid)),
                        disabled: orderedQuestionUIDs.indexOf(question.uid) === 0,
                        style: {
                            padding: '0 0.25rem',
                            fontSize: '0.5rem',
                            lineHeight: '1',
                            cursor: orderedQuestionUIDs.indexOf(question.uid) === 0 ? 'not-allowed' : 'pointer',
                            opacity: orderedQuestionUIDs.indexOf(question.uid) === 0 ? 0.3 : 1,
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            backgroundColor: '#fff',
                            marginBottom: '1px'
                        }
                    }, '▲'),
                    React.createElement('button', {
                        onClick: () => moveQuestionDown(orderedQuestionUIDs.indexOf(question.uid)),
                        disabled: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1,
                        style: {
                            padding: '0 0.25rem',
                            fontSize: '0.5rem',
                            lineHeight: '1',
                            cursor: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1 ? 0.3 : 1,
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            backgroundColor: '#fff'
                        }
                    }, '▼')
                ),
                React.createElement('span', { style: { color: '#666', fontSize: '0.6875rem' } },
                    isExpanded ? '▼' : '▶'),
                React.createElement('span', {
                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(question.uid); },
                    style: {
                        color: '#2196F3',
                        fontWeight: 'bold',
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                    },
                    title: question.title
                }, `📝 ${cleanTitle(question.title, 'QUE')}`),
                React.createElement('span', {
                    style: {
                        fontSize: '0.625rem',
                        color: '#999',
                        backgroundColor: '#e3f2fd',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.625rem'
                    }
                }, `${totalBranches} rama${totalBranches !== 1 ? 's' : ''}`),
                question.project && React.createElement('span', {
                    style: {
                        fontSize: '0.625rem',
                        color: '#666',
                        backgroundColor: '#f5f5f5',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.125rem'
                    }
                }, `📁 ${question.project}`)
            ),

            // Ramas (CLMs y EVDs directas)
            isExpanded && React.createElement('div', {
                style: { paddingLeft: '1rem', paddingBottom: '0.5rem' }
            },
                // CLMs
                clms.map((clmUid, index) =>
                    React.createElement('div', {
                        key: clmUid,
                        style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            marginBottom: '0.25rem',
                            flexWrap: 'wrap'
                        }
                    },
                        React.createElement('span', {
                            style: { color: '#ccc', marginRight: '0.5rem', fontSize: '0.6875rem' }
                        }, index === clms.length - 1 && directEvds.length === 0 ? '└─' : '├─'),
                        renderCLMBranch(clmUid, allNodes)
                    )
                ),
                // EVDs directas
                directEvds.map((evdUid, index) => {
                    const evd = allNodes[evdUid];
                    if (!evd) return null;
                    return React.createElement('div', {
                        key: evdUid,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.25rem'
                        }
                    },
                        React.createElement('span', {
                            style: { color: '#ccc', marginRight: '0.5rem', fontSize: '0.6875rem' }
                        }, index === directEvds.length - 1 ? '└─' : '├─'),
                        React.createElement('span', {
                            onClick: () => handleNavigateToPage(evdUid),
                            style: {
                                color: '#ff9800',
                                cursor: 'pointer',
                                padding: '0.125rem 0.25rem',
                                borderRadius: '0.125rem',
                                backgroundColor: '#fff3e0',
                                fontSize: '0.75rem'
                            },
                            title: evd.title
                        }, `📎 ${cleanTitle(evd.title, 'EVD')}`)
                    );
                }),
                // Mensaje si no hay ramas
                totalBranches === 0 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }
                }, 'Sin respuestas')
            )
        );
    };

    // --- Filtrar preguntas por proyecto (respetando orden) ---
    const getFilteredQuestions = () => {
        if (!panoramicData) return [];
        if (!selectedProject) return panoramicData.questions;
        // Si hay orden guardado, usarlo
        if (orderedQuestionUIDs.length > 0) {
            return orderedQuestionUIDs
                .map(uid => panoramicData.questions.find(q => q.uid === uid))
                .filter(Boolean);
        }
        return panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
        });
    };

    // --- Obtener lista jerárquica de proyectos (incluyendo prefijos intermedios) ---
    const getHierarchicalProjects = () => {
        if (!panoramicData) return [];
        const allPrefixes = new Set();
        const leafProjects = new Set();

        panoramicData.questions.forEach(q => {
            if (q.project) {
                // Agregar la rama completa (es una hoja)
                leafProjects.add(q.project);
                allPrefixes.add(q.project);
                // Agregar todos los prefijos intermedios
                const parts = q.project.split('/');
                for (let i = 1; i < parts.length; i++) {
                    allPrefixes.add(parts.slice(0, i).join('/'));
                }
            }
        });

        // Ordenar y agregar metadata (es grupo o hoja, contador)
        const sorted = Array.from(allPrefixes).sort();
        return sorted.map(prefix => {
            const isLeaf = leafProjects.has(prefix);
            const count = panoramicData.questions.filter(q =>
                q.project && (q.project === prefix || q.project.startsWith(prefix + '/'))
            ).length;
            const depth = prefix.split('/').length - 1;
            return { prefix, isLeaf, count, depth };
        });
    };

    const filteredQuestions = getFilteredQuestions();
    const hierarchicalProjects = getHierarchicalProjects();

    // --- Render ---
    return React.createElement('div', null,
        // Header con layout de dos columnas: título a la izquierda, controles a la derecha
        React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                gap: '1rem'
            }
        },
            // Columna izquierda: título y descripción
            React.createElement('div', { style: { flex: '1' } },
                React.createElement('h3', { style: { marginTop: 0, marginBottom: '0.25rem' } }, '🗺️ Vista Panorámica'),
                React.createElement('p', { style: { color: '#666', margin: 0, fontSize: '0.875rem' } },
                    'Vista sintética de todas las ramas del grafo de discurso. Click en cualquier nodo para navegar a Roam.')
            ),
            // Columna derecha: controles compactos
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.375rem',
                    flexShrink: 0
                }
            },
                // Fila 1: Botón cargar + dropdown
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        disabled: isLoading,
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: isLoading ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isLoading ? '⏳...' : '🔄 Cargar'),
                    // Filtro de proyecto (jerárquico)
                    panoramicData && hierarchicalProjects.length > 0 && React.createElement('select', {
                        value: selectedProject,
                        onChange: (e) => setSelectedProject(e.target.value),
                        style: {
                            padding: '0.25rem 0.375rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            fontSize: '0.6875rem',
                            maxWidth: '250px'
                        }
                    },
                        React.createElement('option', { value: '' }, `Todos (${panoramicData.questions.length})`),
                        hierarchicalProjects.map(p => {
                            const indent = '  '.repeat(p.depth);
                            const icon = p.isLeaf ? '📄' : '📁';
                            const label = p.prefix.split('/').pop(); // Solo mostrar el último segmento
                            return React.createElement('option', {
                                key: p.prefix,
                                value: p.prefix
                            }, `${indent}${icon} ${label} (${p.count})`);
                        })
                    )
                ),
                // Fila 2: Botones expandir/colapsar
                panoramicData && React.createElement('div', { style: { display: 'flex', gap: '0.375rem' } },
                    React.createElement('button', {
                        onClick: () => {
                            const allExpanded = {};
                            filteredQuestions.forEach(q => allExpanded[q.uid] = true);
                            setExpandedQuestions(allExpanded);
                        },
                        style: {
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.6875rem',
                            backgroundColor: '#f5f5f5'
                        }
                    }, '➕ Expandir'),
                    React.createElement('button', {
                        onClick: () => setExpandedQuestions({}),
                        style: {
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.6875rem',
                            backgroundColor: '#f5f5f5'
                        }
                    }, '➖ Colapsar')
                ),
                // Fila 3: Cache info (si existe)
                cacheTimestamp && !isLoading && React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.625rem',
                        color: '#f57c00'
                    }
                },
                    React.createElement('span', null, `📦 ${formatTimeAgo(cacheTimestamp)}`),
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.5625rem'
                        }
                    }, '🔄')
                ),
                // Fila 4: Estadísticas compactas
                panoramicData && React.createElement('div', {
                    style: { display: 'flex', gap: '0.375rem' }
                },
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: '#2196F3'
                        }
                    }, `📝 ${filteredQuestions.length}`),
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#e8f5e9',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: '#4CAF50'
                        }
                    }, `📌 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'CLM').length}`),
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#fff3e0',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: '#ff9800'
                        }
                    }, `📎 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'EVD').length}`)
                )
            )
        ),

        // Status (compacto, solo si hay mensajes de carga activa)
        loadStatus && !loadStatus.includes('📦') && React.createElement('div', {
            style: {
                marginBottom: '0.5rem',
                padding: '0.375rem 0.625rem',
                backgroundColor: loadStatus.includes('✅') ? '#e8f5e9' :
                    loadStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                borderRadius: '0.25rem',
                fontWeight: 'bold',
                fontSize: '0.75rem'
            }
        }, loadStatus),

        // Lista de preguntas con sus ramas
        panoramicData && React.createElement('div', {
            style: {
                maxHeight: '28rem',
                overflowY: 'auto',
                border: '1px solid #eee',
                borderRadius: '0.25rem',
                padding: '0.75rem',
                backgroundColor: 'white'
            }
        },
            filteredQuestions.length > 0
                ? filteredQuestions.map(q => renderQuestion(q, panoramicData.allNodes))
                : React.createElement('p', { style: { color: '#999', textAlign: 'center' } },
                    'No hay preguntas para mostrar' + (selectedProject ? ' en este proyecto.' : '.'))
        ),

        // Mensaje inicial
        !panoramicData && !isLoading && React.createElement('div', {
            style: {
                padding: '3rem',
                textAlign: 'center',
                color: '#999',
                backgroundColor: '#fafafa',
                borderRadius: '0.25rem',
                border: '1px dashed #ddd'
            }
        },
            React.createElement('p', { style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, '🗺️'),
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
    const {
        projects,
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        orderedQuestions, setOrderedQuestions
    } = DiscourseGraphToolkit.useToolkit();

    // --- Limpiar preview cuando cambian los proyectos seleccionados ---
    React.useEffect(() => {
        setPreviewPages([]);
        setOrderedQuestions([]);
    }, [selectedProjects]);

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

    // Funciones de reordenamiento removidas - ahora se manejan en PanoramicTab

    const reorderQuestionsByUIDs = (questions, ordered) => {
        let uidOrder;
        if (ordered && ordered.length > 0) {
            uidOrder = ordered.map(q => q.uid);
        } else {
            // Fallback: intentar cargar desde localStorage
            const projectKey = getProjectKey();
            const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(projectKey);
            if (savedOrder && savedOrder.length > 0) {
                uidOrder = savedOrder;
            } else {
                return questions;
            }
        }
        return [...questions].sort((a, b) => {
            const indexA = uidOrder.indexOf(a.uid);
            const indexB = uidOrder.indexOf(b.uid);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    };

    const cleanTitleForDisplay = (title) => {
        return (title || '').replace(/\[\[QUE\]\]\s*-\s*/, '').substring(0, 60);
    };

    // Helper para obtener clave de proyecto actual (calcula ancestro común para coincidir con Panorámica)
    const getProjectKey = (projectList = null) => {
        const projects = projectList || Object.keys(selectedProjects).filter(k => selectedProjects[k]);
        if (projects.length === 0) return '';
        if (projects.length === 1) return projects[0];

        // Calcular el prefijo de ruta común más largo (ancestro común)
        const splitPaths = projects.map(p => p.split('/'));
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

        // Si hay ancestro común, usarlo; de lo contrario, fallback a concatenación
        return commonParts.length > 0 ? commonParts.join('/') : projects.sort().join('|');
    };

    // --- Helpers para Seleccionar Todo ---
    const selectAllProjects = () => {
        const allSelected = {};
        projects.forEach(p => allSelected[p] = true);
        setSelectedProjects(allSelected);
    };

    const selectAllTypes = () => {
        setSelectedTypes({ QUE: true, CLM: true, EVD: true });
    };

    // --- Handlers ---
    const handlePreview = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            for (let p of pNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                allPages = allPages.concat(pages);
            }

            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());

            setPreviewPages(uniquePages);

            // Inicializar orderedQuestions con las QUEs encontradas
            const quePages = uniquePages.filter(p => {
                const type = DiscourseGraphToolkit.getNodeType(p.pageTitle);
                return type === 'QUE';
            }).map(p => ({ uid: p.pageUid, title: p.pageTitle }));

            // Solo actualizar si las QUEs son diferentes
            const currentUIDs = orderedQuestions.map(q => q.uid);
            const newUIDs = quePages.map(q => q.uid);
            const sameQuestions = currentUIDs.length === newUIDs.length &&
                currentUIDs.every(uid => newUIDs.includes(uid));

            if (!sameQuestions) {
                // Intentar restaurar orden guardado (usando prefijo común)
                const projectKey = getProjectKey(pNames);
                const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(projectKey);
                if (savedOrder && savedOrder.length > 0) {
                    const reordered = savedOrder
                        .map(uid => quePages.find(q => q.uid === uid))
                        .filter(Boolean);
                    // Agregar QUEs nuevas que no estaban en el orden guardado
                    const newQues = quePages.filter(q => !savedOrder.includes(q.uid));
                    setOrderedQuestions([...reordered, ...newQues]);
                } else {
                    setOrderedQuestions(quePages);
                }
            }

            setExportStatus(`Encontradas ${uniquePages.length} páginas (${quePages.length} preguntas).`);
            return uniquePages;
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return [];
        }
    };

    const prepareExportData = async (pagesToExport, pNames) => {
        const uids = pagesToExport.map(p => p.pageUid);
        const anyContent = Object.values(contentConfig).some(x => x);

        setExportStatus("Obteniendo datos...");
        const result = await DiscourseGraphToolkit.exportPagesNative(
            uids, null, (msg) => setExportStatus(msg), anyContent, false
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
            const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, anyContent, false);
            extraData.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });
        }

        DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

        const questions = result.data.filter(node => {
            const type = DiscourseGraphToolkit.getNodeType(node.title);
            return type === 'QUE';
        });

        // Inicializar orden de preguntas si está vacío o tiene UIDs diferentes
        const currentUIDs = orderedQuestions.map(q => q.uid);
        const newUIDs = questions.map(q => q.uid);
        const sameQuestions = currentUIDs.length === newUIDs.length &&
            currentUIDs.every(uid => newUIDs.includes(uid));

        // Calcular orden final para retornar (usando prefijo común para coincidir con Panorámica)
        const projectKey = getProjectKey(pNames);
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(projectKey);
        let orderedQuestionsToExport;
        if (savedOrder && savedOrder.length > 0) {
            const reordered = savedOrder
                .map(uid => questions.find(q => q.uid === uid))
                .filter(Boolean);
            const newQues = questions.filter(q => !savedOrder.includes(q.uid));
            orderedQuestionsToExport = [...reordered, ...newQues];
        } else {
            orderedQuestionsToExport = questions;
        }

        // Actualizar estado React solo si las preguntas cambiaron
        if (!sameQuestions) {
            setOrderedQuestions(orderedQuestionsToExport);
        }

        const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}`;

        // Retornar preguntas YA ordenadas para el export
        return { questions: orderedQuestionsToExport, allNodes, filename };
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_export_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.json`;
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
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(
                questionsToExport, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora
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
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora
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
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown Plano...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora
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
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown para EPUB...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora
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
    return React.createElement('div', null,
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1.25rem' } }, 'Exportar Grafos'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' } },
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '1. Proyectos'),
                    projects.length > 0 && React.createElement('span', {
                        onClick: selectAllProjects,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { style: { height: '17.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem', backgroundColor: '#fafafa' } },
                    projects.length === 0 ? 'No hay proyectos.' :
                        React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                            tree: projectTree,
                            renderNodeHeader: renderExportNodeHeader,
                            renderNodeContent: renderExportNodeContent,
                            defaultExpanded: true
                        })
                )
            ),
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '2. Tipos'),
                    React.createElement('span', {
                        onClick: selectAllTypes,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                ['QUE', 'CLM', 'EVD'].map(t =>
                    React.createElement('div', { key: t },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: selectedTypes[t],
                                onChange: e => setSelectedTypes({ ...selectedTypes, [t]: e.target.checked })
                            }),
                            ` ${t}`
                        )
                    )
                ),
                React.createElement('div', { style: { marginTop: '0.625rem' } },
                    React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', fontSize: '0.75rem' } }, 'Extraer Todo el Contenido:'),
                    ['QUE', 'CLM', 'EVD'].map(type =>
                        React.createElement('div', { key: type, style: { marginLeft: '0.625rem' } },
                            React.createElement('label', null,
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: contentConfig[type],
                                    onChange: e => setContentConfig({ ...contentConfig, [type]: e.target.checked })
                                }),
                                ` ${DiscourseGraphToolkit.TYPES[type].label} (${type})`
                            )
                        )
                    ),
                    React.createElement('div', { style: { marginTop: '0.625rem' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: excludeBitacora,
                                onChange: e => setExcludeBitacora(e.target.checked)
                            }),
                            ' Excluir contenido de [[bitácora]]'
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
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem' }
            }, 'Exportar HTML'),
            React.createElement('button', {
                onClick: handleExportMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem' }
            }, 'Exportar Markdown'),
            React.createElement('button', {
                onClick: handleExportFlatMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem' }
            }, 'MD Plano'),
            React.createElement('button', {
                onClick: handleExportEpub,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#E91E63', color: 'white', border: 'none', borderRadius: '0.25rem' }
            }, '📚 EPUB')
        ),
        exportStatus && React.createElement('div', { style: { marginTop: '0.625rem', fontWeight: 'bold' } }, exportStatus),

        // --- Indicador de orden (solo lectura) ---
        orderedQuestions.length > 0 && React.createElement('div', {
            style: {
                marginTop: '1rem',
                padding: '0.75rem',
                border: '1px solid #e3f2fd',
                borderRadius: '0.25rem',
                backgroundColor: '#f5faff'
            }
        },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' } },
                React.createElement('span', { style: { fontSize: '1rem' } }, '🗒️'),
                React.createElement('span', { style: { fontWeight: 'bold', fontSize: '0.875rem' } },
                    `Orden de Exportación (${orderedQuestions.length} preguntas)`
                ),
                React.createElement('span', {
                    style: {
                        fontSize: '0.6875rem',
                        color: '#666',
                        backgroundColor: '#e3f2fd',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.75rem'
                    }
                }, 'ℹ️ Para reordenar, usa la pestaña Panorámica')
            ),
            React.createElement('ol', {
                style: {
                    margin: 0,
                    paddingLeft: '1.25rem',
                    maxHeight: '8rem',
                    overflowY: 'auto',
                    fontSize: '0.8125rem',
                    color: '#555'
                }
            },
                orderedQuestions.slice(0, 10).map(q =>
                    React.createElement('li', { key: q.uid, style: { marginBottom: '0.125rem' } },
                        cleanTitleForDisplay(q.title)
                    )
                ),
                orderedQuestions.length > 10 && React.createElement('li', {
                    style: { color: '#999', fontStyle: 'italic' }
                }, `... y ${orderedQuestions.length - 10} más`)
            )
        )
    );
};


// --- MODULE: src/ui/tabs/ImportTab.js ---
// ============================================================================
// UI: Import Tab Component
// ============================================================================

DiscourseGraphToolkit.ImportTab = function () {
    const React = window.React;
    const { exportStatus, setExportStatus } = DiscourseGraphToolkit.useToolkit();

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
                            setExportStatus("Importando...");
                            try {
                                const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setExportStatus(msg));

                                let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                if (result.errors && result.errors.length > 0) {
                                    statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                    DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                } else {
                                    DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                }
                                setExportStatus(statusMsg);

                            } catch (err) {
                                console.error(err);
                                setExportStatus(`❌ Error fatal: ${err.message}`);
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
        exportStatus && React.createElement('div', { style: { marginTop: '1.25rem', padding: '0.625rem', backgroundColor: '#f5f5f5', borderRadius: '0.25rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' } }, exportStatus)
    );
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
// 5. INTERFAZ DE USUARIO (REACT) - Modal Principal
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose, onMinimize }) {
    const React = window.React;

    // --- Estados de Navegación ---
    const [activeTab, setActiveTab] = React.useState('proyectos');

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

    // --- Estados de Exportación ---
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: true, CLM: true, EVD: true });
    const [contentConfig, setContentConfig] = React.useState({ QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [orderedQuestions, setOrderedQuestions] = React.useState([]);

    // --- Estados de Ramas (Verificación Bulk) ---
    const [bulkVerificationResults, setBulkVerificationResults] = React.useState([]);
    const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);
    const [bulkVerifyStatus, setBulkVerifyStatus] = React.useState('');
    const [selectedBulkQuestion, setSelectedBulkQuestion] = React.useState(null);
    const [editableProject, setEditableProject] = React.useState('');
    const [isPropagating, setIsPropagating] = React.useState(false);

    // --- Estados de Huérfanos ---
    const [orphanResults, setOrphanResults] = React.useState([]);
    const [isSearchingOrphans, setIsSearchingOrphans] = React.useState(false);

    // --- Estados de Panorámica (persisten entre cambios de pestaña) ---
    const [panoramicData, setPanoramicData] = React.useState(null);
    const [panoramicExpandedQuestions, setPanoramicExpandedQuestions] = React.useState({});
    const [panoramicLoadStatus, setPanoramicLoadStatus] = React.useState('');
    const [panoramicSelectedProject, setPanoramicSelectedProject] = React.useState('');

    // --- Inicialización ---
    React.useEffect(() => {
        const loadData = async () => {
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());

            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }

            // Auto-descubrir proyectos nuevos en el grafo
            try {
                const discovered = await DiscourseGraphToolkit.discoverProjectsInGraph();
                const current = DiscourseGraphToolkit.getProjects();
                const newProjects = discovered.filter(p => !current.includes(p));
                if (newProjects.length > 0) {
                    setNewProjectsAlert(newProjects);
                }
            } catch (e) {
                console.warn('Error discovering projects:', e);
            }

            const verificationCache = DiscourseGraphToolkit.getVerificationCache();
            if (verificationCache && verificationCache.results) {
                setBulkVerificationResults(verificationCache.results);
                setBulkVerifyStatus(verificationCache.status || '📋 Resultados cargados del cache.');
            }
        };
        loadData();
    }, []);

    // --- Helpers ---
    const tabStyle = (id) => ({
        padding: '0.625rem 1.25rem', cursor: 'pointer', borderBottom: activeTab === id ? '0.125rem solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    });

    // --- Context Value (estado compartido entre pestañas) ---
    const contextValue = {
        // Navegación
        activeTab, setActiveTab,
        // Configuración
        config, setConfig,
        templates, setTemplates,
        // Proyectos
        projects, setProjects,
        newProject, setNewProject,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        newProjectsAlert, setNewProjectsAlert,
        // Exportación
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        orderedQuestions, setOrderedQuestions,
        // Ramas
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        // Huérfanos
        orphanResults, setOrphanResults,
        isSearchingOrphans, setIsSearchingOrphans,
        // Panorámica
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions, setPanoramicExpandedQuestions,
        panoramicLoadStatus, setPanoramicLoadStatus,
        panoramicSelectedProject, setPanoramicSelectedProject
    };

    // --- Render ---
    return React.createElement(DiscourseGraphToolkit.ToolkitContext.Provider, { value: contextValue },
        React.createElement('div', {
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
                        }, '➖'),
                        // Botón Cerrar
                        React.createElement('button', {
                            onClick: onClose,
                            title: 'Cerrar (resetea estado)',
                            style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                        }, '✕')
                    )
                ),
                // Tabs
                React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                    ['proyectos', 'ramas', 'panoramica', 'exportar', 'importar'].map(t =>
                        React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) },
                            t === 'panoramica' ? 'Panorámica' : t.charAt(0).toUpperCase() + t.slice(1))
                    )
                ),

                // Alerta de proyectos nuevos descubiertos
                newProjectsAlert.length > 0 && React.createElement('div', {
                    style: {
                        padding: '0.75rem 1.25rem',
                        backgroundColor: '#fff3e0',
                        borderBottom: '1px solid #ffcc80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                    }
                },
                    React.createElement('span', { style: { fontWeight: 'bold', color: '#e65100' } },
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
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            marginLeft: 'auto'
                        }
                    }, '➕ Agregar todos'),
                    React.createElement('button', {
                        onClick: () => setNewProjectsAlert([]),
                        style: {
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: '#666',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }
                    }, '✕')
                ),

                // Content
                React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 3.125rem 1.25rem', minHeight: 0 } },

                    // Pestaña Proyectos
                    activeTab === 'proyectos' && React.createElement(DiscourseGraphToolkit.ProjectsTab),

                    // Pestaña Ramas
                    activeTab === 'ramas' && React.createElement(DiscourseGraphToolkit.BranchesTab),

                    // Pestaña Panorámica
                    activeTab === 'panoramica' && React.createElement(DiscourseGraphToolkit.PanoramicTab),

                    // Pestaña Exportar
                    activeTab === 'exportar' && React.createElement(DiscourseGraphToolkit.ExportTab),

                    // Pestaña Importar
                    activeTab === 'importar' && React.createElement(DiscourseGraphToolkit.ImportTab)
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

    // Si existe y está visible, no hacer nada
    if (existing) {
        return;
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
        floatingButton.innerHTML = '📊';
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
            if (div.parentNode) div.parentNode.removeChild(div);
            // Ocultar botón flotante
            const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
            if (btn) btn.style.display = 'none';

            setTimeout(() => {
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
            }, 100);
        } catch (e) {
            console.error("Error closing modal:", e);
        }
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
// 6. INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Run storage migration to graph-specific keys (one-time)
    DiscourseGraphToolkit.migrateStorageToGraphSpecific();

    // Inicializar sincronización con un pequeño retraso para asegurar que Roam esté listo
    setTimeout(() => {
        DiscourseGraphToolkit.initializeProjectsSync()
            .catch(e => {
                console.error("Error en sincronización inicial:", e);
                DiscourseGraphToolkit.showToast("⚠️ Error sincronizando proyectos", "warning");
            });
    }, 5000);

    // Cargar config desde Roam si existe
    setTimeout(() => {
        DiscourseGraphToolkit.loadConfigFromRoam()
            .then(data => {
                if (data) console.log("Configuración cargada desde Roam.");
            })
            .catch(e => {
                console.error("Error cargando config desde Roam:", e);
                // No mostrar toast - config local se usa como fallback
            });
    }, 5500);

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

