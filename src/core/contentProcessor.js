// ============================================================================
// CORE: Content Processor
// Ported from roamMap/core/content_processor.py
// ============================================================================

DiscourseGraphToolkit.ContentProcessor = {
    MAX_RECURSION_DEPTH: 20,

    extractBlockContent: function (block, indentLevel = 0, skipMetadata = true, visitedBlocks = null, maxDepth = this.MAX_RECURSION_DEPTH, excludeBitacora = true) {
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
                    const indent = "  ".repeat(indentLevel);
                    content += `${indent}- ${blockString}\n`;
                }
            }

            const children = block.children || block[':block/children'] || [];
            if (Array.isArray(children)) {
                for (const child of children) {
                    const childContent = this.extractBlockContent(child, indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora);
                    if (childContent) content += childContent;
                }
            }

            if (blockIdentifier) visitedBlocks.delete(blockIdentifier);

        } catch (e) {
            console.warn(`⚠ Error extrayendo contenido de bloque: ${e}`);
        }

        return content;
    },

    extractNodeContent: function (nodeData, extractAdditionalContent = false, nodeType = "EVD", excludeBitacora = true) {
        let detailedContent = "";

        try {
            if (!nodeData) return detailedContent;

            const children = nodeData.children || nodeData[':block/children'] || [];
            if (Array.isArray(children) && children.length > 0) {
                for (const child of children) {
                    const childString = child.string || child[':block/string'] || "";
                    const structuralMetadata = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
                    const isStructuralMetadata = structuralMetadata.some(meta => childString.startsWith(meta));

                    // Si extractAdditionalContent es true, extraemos TODO (salvo bitácora si aplica),
                    // ignorando si es un marcador estructural o no. El usuario quiere "Todo el contenido".
                    if (extractAdditionalContent) {
                        const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                        if (childContent) detailedContent += childContent;
                    }
                    // Si es false, aplicamos la lógica de filtrado inteligente
                    else {
                        if (!isStructuralMetadata && childString) {
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                            if (childContent) detailedContent += childContent;
                        } else if (childString === "#RelatedTo" && (child.children || child[':block/children'])) {
                            // Logic especial para #RelatedTo: Extraer hijos directamente (container transparente)
                            const subChildren = child.children || child[':block/children'] || [];
                            for (const subChild of subChildren) {
                                const subChildContent = this.extractBlockContent(subChild, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                                if (subChildContent) detailedContent += subChildContent;
                            }
                        }
                    }
                }
            }

            if (!detailedContent) {
                // Fallback: contenido directo o título
                const mainString = nodeData.string || nodeData[':block/string'] || "";
                if (mainString) {
                    detailedContent += `- ${mainString}\n`;
                } else {
                    const title = nodeData.title || nodeData[':node/title'] || "";
                    if (title) {
                        const prefix = `[[${nodeType}]] - `;
                        const cleanTitle = title.replace(prefix, "").trim();
                        if (cleanTitle) detailedContent += `- ${cleanTitle}\n`;
                    }
                }
            }

        } catch (e) {
            console.error(`❌ Error extrayendo contenido ${nodeType}: ${e}`);
        }

        return detailedContent;
    }
};


