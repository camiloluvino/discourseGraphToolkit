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
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.5rem',
                    borderBottom: '1px solid #eee',
                    backgroundColor: depth === 0 ? '#f8f8f8' : 'transparent',
                    fontSize: '0.8125rem'
                }
            },
                // Expand/collapse toggle
                hasChildren && React.createElement('span', {
                    onClick: () => toggleProjectExpand(node.project),
                    style: { cursor: 'pointer', color: '#666', fontSize: '0.6875rem', width: '0.75rem' }
                }, isExpanded ? '▼' : '▶'),
                !hasChildren && React.createElement('span', { style: { width: '0.75rem' } }),
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
                    hasChildren ? `📁 ${key}` : key,
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
        React.createElement('h3', { style: { marginTop: 0 } }, '📋 Lista de Proyectos'),
        React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '0.625rem' } },
            React.createElement('button', { onClick: handleValidate, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer' } }, "Validar Existencia"),
            React.createElement('button', { onClick: handleScanProjects, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
            React.createElement('button', { onClick: handleForceSync, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
        ),

        suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '1.25rem', padding: '0.625rem', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '0.25rem' } },
            React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`),
            React.createElement('div', { style: { maxHeight: '18.75rem', overflowY: 'auto', border: '1px solid #ddd', backgroundColor: 'white' } },
                suggestions.map(s =>
                    React.createElement('div', { key: s, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' } },
                        React.createElement('span', null, s),
                        React.createElement('button', { onClick: () => handleAddSuggestion(s), style: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '0.1875rem', cursor: 'pointer' } }, '+ Añadir')
                    )
                )
            )
        ),

        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem', alignItems: 'center' } },
            React.createElement('label', null,
                React.createElement('input', {
                    type: 'checkbox',
                    checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                    onChange: toggleSelectAllProjects,
                    style: { marginRight: '0.3125rem' }
                }),
                'Seleccionar Todo'
            ),
            React.createElement('button', {
                onClick: handleBulkDeleteProjects,
                disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                style: {
                    padding: '0.3125rem 0.625rem',
                    backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? '#f44336' : '#ccc',
                    color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer'
                }
            }, 'Eliminar Seleccionados')
        ),

        React.createElement('div', { style: { maxHeight: '25rem', overflowY: 'auto', border: '1px solid #eee', backgroundColor: '#fafafa' } },
            projects.length === 0 ? React.createElement('div', { style: { padding: '1rem', color: '#999' } }, 'No hay proyectos.') :
                Object.keys(projectTree).sort().map(projectKey =>
                    renderProjectTreeNode(projectTree[projectKey], projectKey, 0)
                )
        )
    );
};
