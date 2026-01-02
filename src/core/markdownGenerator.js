// ============================================================================
// CORE: Markdown Generator
// Ported from roamMap/core/markdown_generator.py
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, flatMode = false) {
        // Compatibilidad hacia atrás: si contentConfig es booleano (bool legacy), lo convertimos a objeto
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

        let result = "# Estructura de Investigación\n\n";

        for (const question of questions) {
            try {
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));
                result += `## [[QUE]] - ${qTitle}\n\n`;

                // Metadata
                const metadata = question.project_metadata || {};
                if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                    if (flatMode) {
                        if (metadata.proyecto_asociado) result += `Proyecto Asociado: ${metadata.proyecto_asociado}\n\n`;
                        if (metadata.seccion_tesis) result += `Sección Narrativa: ${metadata.seccion_tesis}\n\n`;
                    } else {
                        result += "**Información del proyecto:**\n";
                        if (metadata.proyecto_asociado) result += `- Proyecto Asociado: ${metadata.proyecto_asociado}\n`;
                        if (metadata.seccion_tesis) result += `- Sección Narrativa: ${metadata.seccion_tesis}\n`;
                        result += "\n";
                    }
                }

                // --- Contenido de la Pregunta ---
                // Se extrae si QUE está habilitado
                const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora, flatMode);
                if (queContent) {
                    result += queContent + "\n";
                }
                // --------------------------------

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    result += `*No se encontraron respuestas relacionadas con esta pregunta.*\n\n`;
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (const clmUid of question.related_clms) {
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));
                            result += `### [[CLM]] - ${clmTitle}\n\n`;

                            const clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (clmMetadata.proyecto_asociado) result += `Proyecto Asociado: ${clmMetadata.proyecto_asociado}\n\n`;
                                    if (clmMetadata.seccion_tesis) result += `Sección Narrativa: ${clmMetadata.seccion_tesis}\n\n`;
                                } else {
                                    result += "**Información del proyecto:**\n";
                                    if (clmMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${clmMetadata.proyecto_asociado}\n`;
                                    if (clmMetadata.seccion_tesis) result += `- Sección Narrativa: ${clmMetadata.seccion_tesis}\n`;
                                    result += "\n\n";
                                }
                            }

                            // --- NUEVO: Contenido del CLM ---
                            // Se extrae si CLM está habilitado
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, config.CLM, "CLM", excludeBitacora, flatMode);
                            if (clmContent) {
                                result += clmContent + "\n";
                            }
                            // --------------------------------

                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (const suppUid of clm.supporting_clms) {
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));
                                        result += `#### [[CLM]] - ${suppTitle}\n`;

                                        // --- NUEVO: Contenido del CLM de Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, config.CLM, "CLM", excludeBitacora, flatMode);
                                        if (suppContent) {
                                            result += "\n" + suppContent + "\n";
                                        }
                                        // -------------------------------------------

                                        // --- NUEVO: EVDs del CLM de Soporte ---
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            for (const evdUid of suppClm.related_evds) {
                                                if (allNodes[evdUid]) {
                                                    const evd = allNodes[evdUid];
                                                    const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                                    result += `##### [[EVD]] - ${evdTitle}\n\n`;

                                                    const evdMetadata = evd.project_metadata || {};
                                                    if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                                        if (flatMode) {
                                                            if (evdMetadata.proyecto_asociado) result += `Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n\n`;
                                                            if (evdMetadata.seccion_tesis) result += `Sección Narrativa: ${evdMetadata.seccion_tesis}\n\n`;
                                                        } else {
                                                            result += "**Información del proyecto:**\n";
                                                            if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                                            if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                                            result += "\n";
                                                        }
                                                    }

                                                    const evdContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora, flatMode);
                                                    if (evdContent) {
                                                        result += evdContent + "\n";
                                                    } else {
                                                        result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                                                    }
                                                }
                                            }
                                        }
                                        // --------------------------------------
                                    }
                                }
                                result += "\n";
                            }

                            // EVDs
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += `*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n`;
                                }
                            } else {
                                for (const evdUid of clm.related_evds) {
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                        result += `#### [[EVD]] - ${evdTitle}\n\n`;

                                        const evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            if (flatMode) {
                                                if (evdMetadata.proyecto_asociado) result += `Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n\n`;
                                                if (evdMetadata.seccion_tesis) result += `Sección Narrativa: ${evdMetadata.seccion_tesis}\n\n`;
                                            } else {
                                                result += "**Información del proyecto:**\n";
                                                if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                                if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                                result += "\n";
                                            }
                                        }

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora, flatMode);
                                        if (detailedContent) {
                                            result += detailedContent + "\n";
                                        } else {
                                            result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (const evdUid of question.direct_evds) {
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                            result += `### [[EVD]] - ${evdTitle}\n\n`;

                            const evdMetadata = evd.project_metadata || {};
                            if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                if (flatMode) {
                                    if (evdMetadata.proyecto_asociado) result += `Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n\n`;
                                    if (evdMetadata.seccion_tesis) result += `Sección Narrativa: ${evdMetadata.seccion_tesis}\n\n`;
                                } else {
                                    result += "**Información del proyecto:**\n";
                                    if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                    if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                    result += "\n";
                                }
                            }

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora, flatMode);
                            if (detailedContent) {
                                result += detailedContent + "\n";
                            } else {
                                result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                            }
                        }
                    }
                }

            } catch (e) {
                result += `*Error procesando pregunta: ${e}*\n\n`;
            }
        }

        return result;
    },

    // Convenience wrapper for flat markdown export (EPUB-ready)
    generateFlatMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true) {
        return this.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, true);
    }
};
