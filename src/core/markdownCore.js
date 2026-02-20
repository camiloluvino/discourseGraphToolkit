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
    renderNodeTree: function (nodeUid, allNodes, headingLevel, config, excludeBitacora, flatMode, visited) {
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
        result += hashes + ' [[' + type + ']] - ' + title + '\n\n';

        // Metadata
        result += this.renderMetadata(node.project_metadata || {}, flatMode);

        // Contenido del nodo
        if (config[type]) {
            var content = this.extractNodeContent(node.data, true, type, excludeBitacora, flatMode);
            if (content) {
                result += content + '\n';
            } else if (type === 'EVD') {
                result += '*No se encontró contenido detallado para esta evidencia.*\n\n';
            }
        }

        // Hijos: CLMs de soporte (recursión)
        var hasSupportingClms = node.supporting_clms && node.supporting_clms.length > 0;
        if (hasSupportingClms) {
            for (var s = 0; s < node.supporting_clms.length; s++) {
                result += this.renderNodeTree(node.supporting_clms[s], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited);
            }
        }

        // Hijos: EVDs relacionados (hojas, pero usan recursión por uniformidad)
        var hasRelatedEvds = node.related_evds && node.related_evds.length > 0;
        if (hasRelatedEvds) {
            for (var e = 0; e < node.related_evds.length; e++) {
                result += this.renderNodeTree(node.related_evds[e], allNodes, headingLevel + 1, config, excludeBitacora, flatMode, visited);
            }
        }

        // Mensaje si un CLM no tiene ni EVDs ni CLMs de soporte
        if (type === 'CLM' && !hasSupportingClms && !hasRelatedEvds) {
            result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n';
        }

        visited[nodeUid] = false; // Liberar para ramas paralelas
        return result;
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

                // Metadata de la pregunta
                result += self.renderMetadata(question.project_metadata || {}, flatMode);

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

                // CLMs respondidos (recursión desde nivel 3)
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        result += self.renderNodeTree(question.related_clms[c], allNodes, 3, config, excludeBitacora, flatMode, {});
                    }
                }

                // EVDs directos de la pregunta (nivel 3)
                if (question.direct_evds) {
                    for (var d = 0; d < question.direct_evds.length; d++) {
                        result += self.renderNodeTree(question.direct_evds[d], allNodes, 3, config, excludeBitacora, flatMode, {});
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
