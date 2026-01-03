// ============================================================================
// CORE: HTML Embedded Script
// Este código se inyecta en el HTML exportado por htmlGenerator.js
// ============================================================================

// IMPORTANTE: Este archivo se lee como texto plano durante el build
// y se inserta dentro de tags <script></script> en el HTML final.
// NO uses import/export, este código corre standalone en el navegador.

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
                content += indent + '- ' + blockString + '\n';
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
                detailedContent += '- ' + mainString + '\n';
            } else {
                var title = nodeData.title || '';
                if (title) {
                    var prefix = '[[' + nodeType + ']] - ';
                    var cleanTitle = title.replace(prefix, '').trim();
                    if (cleanTitle) detailedContent += '- ' + cleanTitle + '\n';
                }
            }
        }

        return detailedContent;
    }

    function cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    // --- MarkdownGenerator replicado exactamente ---
    var result = '# Estructura de Investigación\n\n';

    for (var q = 0; q < questions.length; q++) {
        var question = questions[q];
        var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
        result += '## [[QUE]] - ' + qTitle + '\n\n';

        // Metadata
        var metadata = question.project_metadata || {};
        if (metadata.proyecto_asociado || metadata.seccion_tesis) {
            result += '**Información del proyecto:**\n';
            if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\n';
            if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\n';
            result += '\n';
        }

        // Contenido QUE
        if (config.QUE) {
            var queContent = extractNodeContent(question.data || question, true, 'QUE');
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
                    var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                    result += '### [[CLM]] - ' + clmTitle + '\n\n';

                    var clmMetadata = clm.project_metadata || {};
                    if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                        result += '**Información del proyecto:**\n';
                        if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\n';
                        if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\n';
                        result += '\n\n';
                    }

                    // Contenido CLM
                    if (config.CLM) {
                        var clmContent = extractNodeContent(clm.data, true, 'CLM');
                        if (clmContent) result += clmContent + '\n';
                    }

                    // Supporting CLMs
                    if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                        for (var s = 0; s < clm.supporting_clms.length; s++) {
                            var suppUid = clm.supporting_clms[s];
                            if (allNodes[suppUid]) {
                                var suppClm = allNodes[suppUid];
                                var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                result += '#### [[CLM]] - ' + suppTitle + '\n';

                                if (config.CLM) {
                                    var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                    if (suppContent) result += '\n' + suppContent + '\n';
                                }

                                // EVDs del CLM de Soporte
                                if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                    for (var se = 0; se < suppClm.related_evds.length; se++) {
                                        var suppEvdUid = suppClm.related_evds[se];
                                        if (allNodes[suppEvdUid]) {
                                            var suppEvd = allNodes[suppEvdUid];
                                            var suppEvdTitle = cleanText((suppEvd.title || '').replace('[[EVD]] - ', ''));
                                            result += '##### [[EVD]] - ' + suppEvdTitle + '\n\n';

                                            var suppEvdMetadata = suppEvd.project_metadata || {};
                                            if (suppEvdMetadata.proyecto_asociado || suppEvdMetadata.seccion_tesis) {
                                                result += '**Información del proyecto:**\n';
                                                if (suppEvdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\n';
                                                if (suppEvdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\n';
                                                result += '\n';
                                            }

                                            if (config.EVD) {
                                                var suppEvdContent = extractNodeContent(suppEvd.data, true, 'EVD');
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

                    // EVDs
                    if (!clm.related_evds || clm.related_evds.length === 0) {
                        if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                            result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n';
                        }
                    } else {
                        for (var e = 0; e < clm.related_evds.length; e++) {
                            var evdUid = clm.related_evds[e];
                            if (allNodes[evdUid]) {
                                var evd = allNodes[evdUid];
                                var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                result += '#### [[EVD]] - ' + evdTitle + '\n\n';

                                var evdMetadata = evd.project_metadata || {};
                                if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                    result += '**Información del proyecto:**\n';
                                    if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\n';
                                    if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\n';
                                    result += '\n';
                                }

                                if (config.EVD) {
                                    var evdContent = extractNodeContent(evd.data, true, 'EVD');
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
                    var devdTitle = cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                    result += '### [[EVD]] - ' + devdTitle + '\n\n';

                    var devdMetadata = devd.project_metadata || {};
                    if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                        result += '**Información del proyecto:**\n';
                        if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\n';
                        if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\n';
                        result += '\n';
                    }

                    if (config.EVD) {
                        var devdContent = extractNodeContent(devd.data, true, 'EVD');
                        if (devdContent) {
                            result += devdContent + '\n';
                        } else {
                            result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
                        }
                    }
                }
            }
        }
    }

    // Descargar archivo con el mismo nombre que el HTML
    var fileName = (document.title || 'mapa_discurso').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_') + '.md';
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
                content += indent + '- ' + blockString + '\n';
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
            if (mainString) { detailedContent += '- ' + mainString + '\n'; }
            else {
                var title = nodeData.title || '';
                if (title) {
                    var prefix = '[[' + nodeType + ']] - ';
                    var cleanTitle = title.replace(prefix, '').trim();
                    if (cleanTitle) detailedContent += '- ' + cleanTitle + '\n';
                }
            }
        }
        return detailedContent;
    }
    function cleanText(text) { return text.replace(/\s+/g, ' ').trim(); }

    var result = '';
    var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
    result += '## [[QUE]] - ' + qTitle + '\n\n';
    var metadata = question.project_metadata || {};
    if (metadata.proyecto_asociado || metadata.seccion_tesis) {
        result += '**Información del proyecto:**\n';
        if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\n';
        if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\n';
        result += '\n';
    }
    if (config.QUE) {
        var queContent = extractNodeContent(question.data || question, true, 'QUE');
        if (queContent) result += queContent + '\n';
    }
    var hasClms = question.related_clms && question.related_clms.length > 0;
    var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
    if (!hasClms && !hasDirectEvds) {
        result += '*No se encontraron respuestas relacionadas con esta pregunta.*\n\n';
    } else {
        if (question.related_clms) {
            for (var c = 0; c < question.related_clms.length; c++) {
                var clmUid = question.related_clms[c];
                if (allNodes[clmUid]) {
                    var clm = allNodes[clmUid];
                    var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                    result += '### [[CLM]] - ' + clmTitle + '\n\n';
                    var clmMetadata = clm.project_metadata || {};
                    if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                        result += '**Información del proyecto:**\n';
                        if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\n';
                        if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\n';
                        result += '\n\n';
                    }
                    if (config.CLM) {
                        var clmContent = extractNodeContent(clm.data, true, 'CLM');
                        if (clmContent) result += clmContent + '\n';
                    }
                    if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                        for (var s = 0; s < clm.supporting_clms.length; s++) {
                            var suppUid = clm.supporting_clms[s];
                            if (allNodes[suppUid]) {
                                var suppClm = allNodes[suppUid];
                                var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                result += '#### [[CLM]] - ' + suppTitle + '\n';
                                if (config.CLM) {
                                    var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                    if (suppContent) result += '\n' + suppContent + '\n';
                                }

                                // EVDs del CLM de Soporte
                                if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                    for (var se = 0; se < suppClm.related_evds.length; se++) {
                                        var suppEvdUid = suppClm.related_evds[se];
                                        if (allNodes[suppEvdUid]) {
                                            var suppEvd = allNodes[suppEvdUid];
                                            var suppEvdTitle = cleanText((suppEvd.title || '').replace('[[EVD]] - ', ''));
                                            result += '##### [[EVD]] - ' + suppEvdTitle + '\n\n';

                                            var suppEvdMetadata = suppEvd.project_metadata || {};
                                            if (suppEvdMetadata.proyecto_asociado || suppEvdMetadata.seccion_tesis) {
                                                result += '**Información del proyecto:**\n';
                                                if (suppEvdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + suppEvdMetadata.proyecto_asociado + '\n';
                                                if (suppEvdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + suppEvdMetadata.seccion_tesis + '\n';
                                                result += '\n';
                                            }

                                            if (config.EVD) {
                                                var suppEvdContent = extractNodeContent(suppEvd.data, true, 'EVD');
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
                    if (!clm.related_evds || clm.related_evds.length === 0) {
                        if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                            result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM).*\n\n';
                        }
                    } else {
                        for (var e = 0; e < clm.related_evds.length; e++) {
                            var evdUid = clm.related_evds[e];
                            if (allNodes[evdUid]) {
                                var evd = allNodes[evdUid];
                                var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                result += '#### [[EVD]] - ' + evdTitle + '\n\n';
                                var evdMetadata = evd.project_metadata || {};
                                if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                    result += '**Información del proyecto:**\n';
                                    if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\n';
                                    if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\n';
                                    result += '\n';
                                }
                                if (config.EVD) {
                                    var evdContent = extractNodeContent(evd.data, true, 'EVD');
                                    if (evdContent) result += evdContent + '\n';
                                    else result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
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
                    result += '### [[EVD]] - ' + devdTitle + '\n\n';
                    var devdMetadata = devd.project_metadata || {};
                    if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                        result += '**Información del proyecto:**\n';
                        if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\n';
                        if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\n';
                        result += '\n';
                    }
                    if (config.EVD) {
                        var devdContent = extractNodeContent(devd.data, true, 'EVD');
                        if (devdContent) result += devdContent + '\n';
                        else result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
                    }
                }
            }
        }
    }
    var fileName = 'QUE_' + qTitle.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_') + '.md';
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
