// ============================================================================
// UI: Projects Tab Component
// ============================================================================

DiscourseGraphToolkit.ProjectsTab = function () {
    const React = window.React;
    const {
        projects, setProjects,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        exportStatus, setExportStatus,
        config, setConfig,
        templates, setTemplates,
        newProject, setNewProject
    } = DiscourseGraphToolkit.useToolkit();

    // --- Estado local para vista de árbol de proyectos ---
    const [expandedProjects, setExpandedProjects] = React.useState({});

    // --- Árbol jerárquico de proyectos (calculado) ---
    const projectTree = React.useMemo(() => {
        if (projects.length === 0) return {};
        return DiscourseGraphToolkit.buildSimpleProjectTree(projects);
    }, [projects]);

    // --- Toggle expandir/colapsar proyecto ---
    const toggleProjectExpand = (projectPath) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectPath]: !prev[projectPath]
        }));
    };

    const handleExpandAll = () => {
        setExpandedProjects({});
    };

    const handleCollapseAll = () => {
        const newExpanded = {};
        const traverse = (node) => {
            if (Object.keys(node.children).length > 0) {
                newExpanded[node.project] = false;
                Object.values(node.children).forEach(traverse);
            }
        };
        Object.values(projectTree).forEach(traverse);
        setExpandedProjects(newExpanded);
    };

    // --- Handlers Config ---
    const handleSaveConfig = async () => {
        try {
            DiscourseGraphToolkit.saveConfig(config);
            DiscourseGraphToolkit.saveTemplates(templates);
            DiscourseGraphToolkit.saveProjects(projects);

            const syncResult = await DiscourseGraphToolkit.syncProjectsToRoam(projects);
            const saveResult = await DiscourseGraphToolkit.saveConfigToRoam(config, templates);

            if (syncResult && syncResult.success !== false && saveResult) {
                DiscourseGraphToolkit.showToast('Configuración guardada y sincronizada en Roam.', 'success');
            } else {
                console.warn("Sync result:", syncResult, "Save result:", saveResult);
                DiscourseGraphToolkit.showToast('Guardado localmente, pero hubo advertencias al sincronizar con Roam.', 'warning');
            }
        } catch (e) {
            console.error("Error saving config:", e);
            DiscourseGraphToolkit.showToast('Error al guardar configuración: ' + e.message, 'error');
        }
    };

    const handleExportConfig = () => {
        DiscourseGraphToolkit.exportConfig();
        DiscourseGraphToolkit.showToast('Configuración exportada.', 'success');
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (DiscourseGraphToolkit.importConfig(event.target.result)) {
                        setConfig(DiscourseGraphToolkit.getConfig());
                        setTemplates(DiscourseGraphToolkit.getTemplates());
                        setProjects(DiscourseGraphToolkit.getProjects());
                        DiscourseGraphToolkit.showToast('Configuración importada correctamente.', 'success');
                    } else {
                        DiscourseGraphToolkit.showToast('Error al importar configuración.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Handlers Proyectos ---
    const handleAddProject = async () => {
        if (newProject && !projects.includes(newProject)) {
            const updated = [...projects, newProject].sort();
            setProjects(updated);
            setNewProject('');
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleRemoveProject = async (p) => {
        const updated = projects.filter(x => x !== p);
        setProjects(updated);
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const handleBulkDeleteProjects = async () => {
        const toDelete = Object.keys(selectedProjectsForDelete).filter(k => selectedProjectsForDelete[k]);
        if (toDelete.length === 0) return;

        const updated = projects.filter(p => !selectedProjectsForDelete[p]);
        setProjects(updated);
        setSelectedProjectsForDelete({});
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const toggleSelectAllProjects = () => {
        const allSelected = projects.every(p => selectedProjectsForDelete[p]);
        const newSelection = {};
        projects.forEach(p => newSelection[p] = !allSelected);
        setSelectedProjectsForDelete(newSelection);
    };

    const handleValidate = async () => {
        setExportStatus("Validando proyectos...");
        const val = await DiscourseGraphToolkit.validateProjectsInGraph(projects);
        setValidation(val);
        setExportStatus("Validación completada.");
    };

    const handleScanProjects = async () => {
        setIsScanning(true);
        try {
            const found = await DiscourseGraphToolkit.discoverProjectsInGraph();
            const newSuggestions = found.filter(p => !projects.includes(p));
            setSuggestions(newSuggestions);
            if (newSuggestions.length === 0) {
                DiscourseGraphToolkit.showToast("No se encontraron nuevos proyectos.", "info");
            } else {
                DiscourseGraphToolkit.showToast(`Se encontraron ${newSuggestions.length} proyectos nuevos.`, "success");
            }
        } catch (e) {
            console.error(e);
            DiscourseGraphToolkit.showToast("Error al buscar proyectos.", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleForceSync = async () => {
        setExportStatus("Sincronizando...");
        try {
            await DiscourseGraphToolkit.initializeProjectsSync();
            setProjects(DiscourseGraphToolkit.getProjects());
            DiscourseGraphToolkit.showToast("Sincronización completada.", "success");
        } catch (e) {
            DiscourseGraphToolkit.showToast("Error en sincronización.", "error");
        } finally {
            setExportStatus("");
        }
    };

    const handleAddSuggestion = async (proj) => {
        if (!projects.includes(proj)) {
            const updated = [...projects, proj].sort();
            setProjects(updated);
            setSuggestions(suggestions.filter(s => s !== proj));
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleAddAllSuggestions = async () => {
        if (suggestions.length === 0) return;
        const toAdd = suggestions.filter(s => !projects.includes(s));
        if (toAdd.length === 0) return;
        const updated = [...new Set([...projects, ...toAdd])].sort();
        setProjects(updated);
        setSuggestions([]);
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        DiscourseGraphToolkit.showToast(`Se añadieron ${toAdd.length} proyectos.`, 'success');
    };

    const handleSelectNotFound = () => {
        const notFound = projects.filter(p => validation[p] === false);
        if (notFound.length === 0) return;
        const newSelection = { ...selectedProjectsForDelete };
        notFound.forEach(p => newSelection[p] = true);
        setSelectedProjectsForDelete(newSelection);
        DiscourseGraphToolkit.showToast(`Se seleccionaron ${notFound.length} proyectos no encontrados.`, 'info');
    };

    // --- Render de nodo del árbol de proyectos (recursivo) ---
    const renderProjectTreeNode = (node, key, depth) => {
        const isExpanded = expandedProjects[node.project] !== false;
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjectsForDelete[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        // Obtener estado de validación del proyecto hoja
        const validationStatus = node.isLeaf && validation[node.project] !== undefined
            ? (validation[node.project] ? '✅' : '⚠️')
            : '';

        return React.createElement('div', { key: key, style: { marginLeft: depth > 0 ? '1rem' : 0 } },
            React.createElement('div', {
                className: 'dgt-flex-row dgt-text-sm',
                style: {
                    gap: '0.375rem',
                    padding: '0.375rem 0.5rem',
                    borderBottom: '1px solid var(--dgt-border-color)',
                    backgroundColor: depth === 0 ? 'var(--dgt-bg-secondary)' : 'transparent'
                }
            },
                // Expand/collapse toggle
                hasChildren && React.createElement('span', {
                    onClick: (e) => {
                        e.stopPropagation();
                        toggleProjectExpand(node.project);
                    },
                    style: { 
                        cursor: 'pointer', 
                        color: '#666', 
                        fontSize: '0.75rem', 
                        width: '1.5rem', 
                        height: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                    }
                }, isExpanded ? '▼' : '▶'),
                !hasChildren && React.createElement('span', { style: { width: '1.5rem', height: '1.5rem', display: 'inline-block' } }),
                // Checkbox para selección
                React.createElement('input', {
                    type: 'checkbox',
                    checked: allSelected,
                    ref: (el) => { if (el) el.indeterminate = someSelected; },
                    onChange: (e) => {
                        const newSelection = { ...selectedProjectsForDelete };
                        for (const proj of descendants) {
                            newSelection[proj] = e.target.checked;
                        }
                        setSelectedProjectsForDelete(newSelection);
                    },
                    style: { margin: 0 }
                }),
                // Nombre del proyecto
                React.createElement('span', { style: { flex: 1 } },
                    hasChildren ? `${key}` : key,
                    validationStatus && React.createElement('span', { style: { marginLeft: '0.375rem' } }, validationStatus)
                ),
                // Botón eliminar solo para hojas
                node.isLeaf && React.createElement('button', {
                    onClick: () => handleRemoveProject(node.project),
                    style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0' }
                }, '✕')
            ),
            // Hijos recursivos
            hasChildren && isExpanded && React.createElement('div', null,
                Object.keys(node.children).sort().map(childKey =>
                    renderProjectTreeNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render ---
    return React.createElement('div', null,
        // === SECCIÓN 1: LISTA DE PROYECTOS ===
        React.createElement('h3', { style: { marginTop: 0 } }, 'Lista de Proyectos'),
        React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm dgt-mb-sm dgt-flex-wrap' },
            React.createElement('button', { onClick: handleValidate, className: 'dgt-btn dgt-btn-secondary' }, "Validar Existencia"),
            React.createElement('button', { onClick: handleScanProjects, className: 'dgt-btn', style: { backgroundColor: 'var(--dgt-bg-tertiary)', color: 'var(--dgt-accent-yellow)', borderColor: 'var(--dgt-accent-yellow)' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
            (() => {
                const notFoundCount = projects.filter(p => validation[p] === false).length;
                return notFoundCount > 0
                    ? React.createElement('button', {
                        onClick: handleSelectNotFound,
                        className: 'dgt-btn',
                        style: { backgroundColor: 'var(--dgt-bg-tertiary)', border: '1px solid var(--dgt-accent-red)', color: 'var(--dgt-accent-red)', fontWeight: 'bold' }
                    }, `☑️ Seleccionar No Encontrados (${notFoundCount})`)
                    : null;
            })(),
            React.createElement('button', { onClick: handleForceSync, className: 'dgt-btn dgt-btn-secondary', style: { marginLeft: 'auto' } }, "🔄 Sincronizar")
        ),

        suggestions.length > 0 && React.createElement('div', { className: 'dgt-card dgt-card-body dgt-mb-md', style: { borderColor: 'var(--dgt-accent-yellow)', backgroundColor: 'var(--dgt-bg-tertiary)' } },
            React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm' },
                React.createElement('strong', { className: 'dgt-text-warning' }, `Sugerencias encontradas (${suggestions.length}):`),
                React.createElement('button', {
                    onClick: handleAddAllSuggestions,
                    className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '4px 10px', backgroundColor: 'var(--dgt-accent-green)' }
                }, `✅ Añadir Todos (${suggestions.length})`)
            ),
            React.createElement('div', { className: 'dgt-list-container', style: { maxHeight: '18.75rem' } },
                suggestions.map(s =>
                    React.createElement('div', { key: s, className: 'dgt-flex-between dgt-p-sm', style: { borderBottom: '1px solid var(--dgt-border-color)' } },
                        React.createElement('span', null, s),
                        React.createElement('button', { onClick: () => handleAddSuggestion(s), className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '4px 8px', backgroundColor: 'var(--dgt-accent-green)' } }, '+ Añadir')
                    )
                )
            )
        ),

        React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm' },
            React.createElement('div', { className: 'dgt-flex-row dgt-align-center', style: { gap: '1rem' } },
                React.createElement('label', { style: { display: 'flex', alignItems: 'center', margin: 0 } },
                    React.createElement('input', {
                        type: 'checkbox',
                        checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                        onChange: toggleSelectAllProjects,
                        className: 'dgt-mr-xs',
                        style: { margin: '0 0.375rem 0 0' }
                    }),
                    'Seleccionar Todo'
                ),
                React.createElement('div', { className: 'dgt-flex-row', style: { gap: '0.5rem' } },
                    React.createElement('button', {
                        onClick: handleExpandAll,
                        className: 'dgt-btn',
                        style: { padding: '0.125rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--dgt-border-color)', color: 'var(--dgt-text-muted)', cursor: 'pointer', borderRadius: '4px' }
                    }, 'Expandir Todo'),
                    React.createElement('button', {
                        onClick: handleCollapseAll,
                        className: 'dgt-btn',
                        style: { padding: '0.125rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--dgt-border-color)', color: 'var(--dgt-text-muted)', cursor: 'pointer', borderRadius: '4px' }
                    }, 'Colapsar Todo')
                )
            ),
            React.createElement('button', {
                onClick: handleBulkDeleteProjects,
                disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                className: 'dgt-btn dgt-btn-primary',
                style: {
                    backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? 'var(--dgt-accent-red)' : 'var(--dgt-text-muted)'
                }
            }, 'Eliminar Seleccionados')
        ),

        React.createElement('div', { className: 'dgt-tree-container', style: { maxHeight: '25rem' } },
            projects.length === 0 ? React.createElement('div', { className: 'dgt-p-md dgt-text-muted' }, 'No hay proyectos.') :
                Object.keys(projectTree).sort().map(projectKey =>
                    renderProjectTreeNode(projectTree[projectKey], projectKey, 0)
                )
        )
    );
};
