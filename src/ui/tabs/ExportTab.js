// ============================================================================
// UI: Export Tab Component
// ============================================================================

DiscourseGraphToolkit.ExportTab = function (props) {
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
    } = props;

    // --- Estado local para vista de árbol de proyectos ---
    const [expandedExportProjects, setExpandedExportProjects] = React.useState({});

    // --- Árbol jerárquico de proyectos (calculado) ---
    const projectTree = React.useMemo(() => {
        if (projects.length === 0) return {};
        return DiscourseGraphToolkit.buildSimpleProjectTree(projects);
    }, [projects]);

    // --- Toggle expandir/colapsar proyecto ---
    const toggleExportProjectExpand = (projectPath) => {
        setExpandedExportProjects(prev => ({
            ...prev,
            [projectPath]: !prev[projectPath]
        }));
    };

    // --- Selección en cascada ---
    const handleProjectToggle = (node, checked) => {
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const newSelected = { ...selectedProjects };
        for (const proj of descendants) {
            newSelected[proj] = checked;
        }
        setSelectedProjects(newSelected);
    };

    // --- Helpers de Reordenamiento ---
    const moveQuestionUp = (index) => {
        if (index === 0) return;
        const newOrder = [...orderedQuestions];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setOrderedQuestions(newOrder);
        // Guardar orden persistente
        const projectKey = getProjectKey();
        DiscourseGraphToolkit.saveQuestionOrder(projectKey, newOrder);
    };

    const moveQuestionDown = (index) => {
        if (index === orderedQuestions.length - 1) return;
        const newOrder = [...orderedQuestions];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrderedQuestions(newOrder);
        // Guardar orden persistente
        const projectKey = getProjectKey();
        DiscourseGraphToolkit.saveQuestionOrder(projectKey, newOrder);
    };

    const reorderQuestionsByUIDs = (questions, ordered) => {
        if (!ordered || ordered.length === 0) return questions;
        const uidOrder = ordered.map(q => q.uid);
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

    // Helper para obtener clave de proyecto actual
    const getProjectKey = () => {
        return Object.keys(selectedProjects).filter(k => selectedProjects[k]).sort().join('|');
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
                // Intentar restaurar orden guardado
                const projectKey = pNames.sort().join('|');
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

        if (!sameQuestions) {
            setOrderedQuestions(questions);
        }

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
            const questionsToExport = reorderQuestionsByUIDs(questions, orderedQuestions);

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
            const questionsToExport = reorderQuestionsByUIDs(questions, orderedQuestions);

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
            const questionsToExport = reorderQuestionsByUIDs(questions, orderedQuestions);

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
            const questionsToExport = reorderQuestionsByUIDs(questions, orderedQuestions);

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

    // --- Render de nodo del árbol de proyectos (recursivo) ---
    const renderProjectTreeNode = (node, key, depth) => {
        const isExpanded = expandedExportProjects[node.project] !== false;
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjects[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        return React.createElement('div', { key: key, style: { marginLeft: depth > 0 ? '1rem' : 0 } },
            React.createElement('div', {
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
                    onClick: () => toggleExportProjectExpand(node.project),
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
            ),
            // Hijos
            hasChildren && isExpanded && React.createElement('div', null,
                Object.keys(node.children).sort().map(childKey =>
                    renderProjectTreeNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render ---
    return React.createElement('div', null,
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1.25rem' } }, 'Exportar Grafos'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' } },
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '1. Proyectos'),
                    projects.length > 0 && React.createElement('button', {
                        onClick: selectAllProjects,
                        style: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '0.25rem', backgroundColor: '#f5f5f5' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { style: { height: '17.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem', backgroundColor: '#fafafa' } },
                    projects.length === 0 ? 'No hay proyectos.' :
                        Object.keys(projectTree).sort().map(projectKey =>
                            renderProjectTreeNode(projectTree[projectKey], projectKey, 0)
                        )
                )
            ),
            React.createElement('div', { style: { flex: 1 } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '2. Tipos'),
                    React.createElement('button', {
                        onClick: selectAllTypes,
                        style: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '0.25rem', backgroundColor: '#f5f5f5' }
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

        // --- UI de Reordenamiento de Preguntas ---
        orderedQuestions.length > 0 && React.createElement('div', {
            style: {
                marginTop: '1rem',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem',
                backgroundColor: '#fafafa'
            }
        },
            React.createElement('h4', { style: { margin: '0 0 0.5rem 0', fontSize: '0.875rem' } },
                `Orden de Preguntas (${orderedQuestions.length})`
            ),
            React.createElement('div', {
                style: {
                    maxHeight: '10rem',
                    overflowY: 'auto'
                }
            },
                orderedQuestions.map((q, index) =>
                    React.createElement('div', {
                        key: q.uid,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.25rem 0',
                            borderBottom: index < orderedQuestions.length - 1 ? '1px solid #eee' : 'none'
                        }
                    },
                        React.createElement('button', {
                            onClick: () => moveQuestionUp(index),
                            disabled: index === 0,
                            style: {
                                padding: '0.125rem 0.375rem',
                                marginRight: '0.25rem',
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                opacity: index === 0 ? 0.4 : 1,
                                border: '1px solid #ccc',
                                borderRadius: '0.125rem',
                                backgroundColor: '#fff'
                            }
                        }, '↑'),
                        React.createElement('button', {
                            onClick: () => moveQuestionDown(index),
                            disabled: index === orderedQuestions.length - 1,
                            style: {
                                padding: '0.125rem 0.375rem',
                                marginRight: '0.5rem',
                                cursor: index === orderedQuestions.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: index === orderedQuestions.length - 1 ? 0.4 : 1,
                                border: '1px solid #ccc',
                                borderRadius: '0.125rem',
                                backgroundColor: '#fff'
                            }
                        }, '↓'),
                        React.createElement('span', {
                            style: {
                                fontSize: '0.8125rem',
                                color: '#333'
                            }
                        }, `${index + 1}. ${cleanTitleForDisplay(q.title)}`)
                    )
                )
            )
        ),

        previewPages.length > 0 && React.createElement('div', { style: { marginTop: '0.9375rem', maxHeight: '12.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem' } },
            React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
            React.createElement('ul', { style: { paddingLeft: '1.25rem' } },
                previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
            )
        )
    );
};
