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
