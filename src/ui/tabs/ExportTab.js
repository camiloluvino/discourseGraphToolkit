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

        // Calcular el nombre del proyecto usando el ancestro común (getProjectKey)
        const commonProject = getProjectKey(pNames);
        // Formatear el nombre del archivo para que mantenga la estructura DG_proyecto_namespace
        const formatProjectName = (pName) => {
            return pName.split('/').map(part => DiscourseGraphToolkit.sanitizeFilename(part).replace(/^dg_/i, '')).join('_');
        };
        const sanitizedNames = formatProjectName(commonProject);
        const filename = `DG_${sanitizedNames}`;

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

            // Calcular el nombre del proyecto usando el ancestro común (getProjectKey)
            const commonProject = getProjectKey(pNames);
            const formatProjectName = (pName) => {
                return pName.split('/').map(part => DiscourseGraphToolkit.sanitizeFilename(part).replace(/^dg_/i, '')).join('_');
            };
            const sanitizedNames = formatProjectName(commonProject);
            const filename = `DG_${sanitizedNames}.json`;

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
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.primary || '#2196F3', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar HTML'),
            React.createElement('button', {
                onClick: handleExportMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.successHover || '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar Markdown'),
            React.createElement('button', {
                onClick: handleExportFlatMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.neutral || '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'MD Plano'),
            React.createElement('button', {
                onClick: handleExportEpub,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.danger || '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'EPUB')
        ),
        exportStatus && React.createElement('div', { style: { marginTop: '0.625rem', fontWeight: 'bold' } }, exportStatus),

        // --- Indicador de orden (solo lectura) ---
        orderedQuestions.length > 0 && React.createElement('div', {
            style: {
                marginTop: '1rem',
                padding: '0.75rem',
                border: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.border || '#e5e7eb'}`,
                borderRadius: '0.25rem',
                backgroundColor: DiscourseGraphToolkit.THEME?.colors?.secondary || '#f3f4f6'
            }
        },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' } },
                React.createElement('span', { style: { fontWeight: 'bold', fontSize: '0.875rem' } },
                    `Orden de Exportación (${orderedQuestions.length} preguntas)`
                ),
                React.createElement('span', {
                    style: {
                        fontSize: '0.6875rem',
                        color: DiscourseGraphToolkit.THEME?.colors?.text || '#1f2937',
                        backgroundColor: DiscourseGraphToolkit.THEME?.colors?.secondaryHover || '#e5e7eb',
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
