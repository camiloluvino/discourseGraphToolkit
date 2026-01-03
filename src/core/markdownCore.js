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
    extractBlockContent: function (block, indentLevel, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode) {
        var content = '';
        if (!visitedBlocks) visitedBlocks = {};
        if (indentLevel === undefined) indentLevel = 0;
        if (maxDepth === undefined) maxDepth = this.MAX_RECURSION_DEPTH;
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
                    content += blockString + '\n\n';
                } else {
                    var indent = '';
                    for (var i = 0; i < indentLevel; i++) indent += '  ';
                    content += indent + '- ' + blockString + '\n';
                }
            }
        }

        var children = block.children || block[':block/children'] || [];
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; i++) {
                var childContent = this.extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode);
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
                    var childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode);
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
