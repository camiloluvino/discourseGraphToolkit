// ============================================================================
// UI: Export Tab Component
// ============================================================================

DiscourseGraphToolkit.ExportTab = function (props) {
    const React = window.React;
    const {
        projects,
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        includeReferenced, setIncludeReferenced,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages
    } = props;

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

            if (includeReferenced) {
                setExportStatus("Buscando referencias...");
                const referenced = await DiscourseGraphToolkit.findReferencedDiscoursePages(uniquePages.map(p => p.pageUid), tTypes);
                uniquePages = Array.from(new Map([...uniquePages, ...referenced].map(item => [item.pageUid, item])).values());
            }

            setPreviewPages(uniquePages);
            setExportStatus(`Encontradas ${uniquePages.length} páginas.`);
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

        const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}`;

        return { questions, allNodes, filename };
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

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(
                questions, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora
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

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(
                questions, allNodes, contentConfig, excludeBitacora
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

            setExportStatus("Generando Markdown Plano...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questions, allNodes, contentConfig, excludeBitacora
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

            setExportStatus("Generando Markdown para EPUB...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questions, allNodes, contentConfig, excludeBitacora
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

    // --- Render ---
    return React.createElement('div', null,
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1.25rem' } }, 'Exportar Grafos'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' } },
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('h4', { style: { marginTop: 0 } }, '1. Proyectos'),
                React.createElement('div', { style: { height: '17.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem' } },
                    projects.length === 0 ? 'No hay proyectos.' : projects.map(p =>
                        React.createElement('div', { key: p },
                            React.createElement('label', null,
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: selectedProjects[p] || false,
                                    onChange: e => setSelectedProjects({ ...selectedProjects, [p]: e.target.checked })
                                }),
                                ' ' + p
                            )
                        )
                    )
                )
            ),
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('h4', { style: { marginTop: 0 } }, '2. Tipos'),
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
                    React.createElement('label', null,
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: includeReferenced,
                            onChange: e => setIncludeReferenced(e.target.checked)
                        }),
                        ' Incluir nodos referenciados'
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
            React.createElement('button', { onClick: handlePreview, style: { marginRight: '0.625rem', padding: '0.625rem' } }, "Vista Previa"),
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
        previewPages.length > 0 && React.createElement('div', { style: { marginTop: '0.9375rem', maxHeight: '12.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem' } },
            React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
            React.createElement('ul', { style: { paddingLeft: '1.25rem' } },
                previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
            )
        )
    );
};
