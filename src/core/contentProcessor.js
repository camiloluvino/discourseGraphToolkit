// ============================================================================
// CORE: Content Processor
// Ported from roamMap/core/content_processor.py
// ============================================================================

DiscourseGraphToolkit.ContentProcessor = {
    MAX_RECURSION_DEPTH: 20,

    extractBlockContent: function (block, indentLevel = 0, skipMetadata = true, visitedBlocks = null, maxDepth = this.MAX_RECURSION_DEPTH, excludeBitacora = true, flatMode = false) {
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
                        // En flatMode, primer nivel usa estilo de marcador
                        if (indentLevel === 0) {
                            content += `*— ${blockString} —*\n\n`;
                        } else {
                            content += `${blockString}\n\n`;
                        }
                    } else {
                        if (indentLevel === 0) {
                            // Marcador de primer nivel (cursiva con guiones largos)
                            content += `*— ${blockString} —*\n\n`;
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
                    const childContent = this.extractBlockContent(child, indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora, flatMode);
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
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode);
                            if (childContent) detailedContent += childContent;
                        } else {
                            // Empty block with children (e.g. indentation wrapper) -> recurse?
                            // extractBlockContent handles recursion.
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora, flatMode);
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


