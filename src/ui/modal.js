// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT)
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('general');
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');

    // Estados de Exportación
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: false, CLM: false, EVD: false });
    const [indexPage, setIndexPage] = React.useState(''); // New state for Index Page
    const [includeReferenced, setIncludeReferenced] = React.useState(false);
    // Configuración granular inicial (todo true por defecto o ajustar según preferencia)
    const [contentConfig, setContentConfig] = React.useState({ QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [validation, setValidation] = React.useState({});
    const [suggestions, setSuggestions] = React.useState([]);
    const [isScanning, setIsScanning] = React.useState(false);
    const [selectedProjectsForDelete, setSelectedProjectsForDelete] = React.useState({});

    // Init
    React.useEffect(() => {
        const loadData = async () => {
            // Asegurar que tenemos lo último de Roam al abrir
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());

            // Cargar validación inicial
            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }
        };
        loadData();
    }, []);

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
        // Sin confirmación, borrado directo
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
        setSelectedProjectsForDelete({}); // Reset selection
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

    // --- Handlers Exportación ---
    const handlePreview = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            // Validación laxa si hay indexPage: no requiere seleccionar proyecto
            if (indexPage.trim()) {
                // Si hay indexPage, ignoramos selección de proyectos pero requerimos tipos? 
                // Asumamos que tipos SI son necesarios para filtrar qué buscar en el índice.
                if (tTypes.length === 0) {
                    alert("Selecciona al menos un tipo de nodo (QUE, CLM, EVD) para buscar en el índice.");
                    return;
                }
            } else {
                if (pNames.length === 0 || tTypes.length === 0) {
                    alert("Selecciona proyecto y tipo.");
                    return;
                }
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            if (indexPage.trim()) {
                setExportStatus(`Buscando en página índice: "${indexPage}"...`);
                const pages = await DiscourseGraphToolkit.getIdsFromIndexPage(indexPage, tTypes);
                allPages = pages;
            } else {
                for (let p of pNames) {
                    const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                    allPages = allPages.concat(pages);
                }
            }

            // Deduplicar
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

            // Nota: Para JSON nativo, la granularidad no se aplica tanto en la transformación, 
            // ya que exportPagesNative devuelve la estructura cruda de Roam.
            // Si includeContent es true, descarga el árbol. El filtrado fino ocurre en los generadores (MD/HTML).
            // Aquí pasamos anyContent para decidir si traemos children o no.
            await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent);

            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
            // History Removed
            // DiscourseGraphToolkit.addToExportHistory({...});
            // setHistory(DiscourseGraphToolkit.getExportHistory());
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
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.html`;

            setExportStatus("Obteniendo datos...");
            const anyContent = Object.values(contentConfig).some(x => x);
            // Obtener datos sin descargar JSON
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent, false);

            setExportStatus("Procesando relaciones...");
            // Convertir array a mapa por UID para el mapper y NORMALIZAR
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    // Normalización crítica para RelationshipMapper y ContentProcessor
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node; // El nodo mismo contiene los hijos
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes (CLMs/EVDs referenciados) ---
            setExportStatus("Analizando dependencias...");
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
                // Fetch missing nodes
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, anyContent, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }
            // -------------------------------------------------------------------------------

            // Mapear relaciones
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // Filtrar preguntas para el reporte
            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(questions, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, htmlContent, 'text/html');

            setExportStatus(`✅ Exportación HTML completada.`);
            setExportStatus(`✅ Exportación HTML completada.`);
            // History Removed

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
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.md`;

            setExportStatus("Obteniendo datos...");
            const anyContent = Object.values(contentConfig).some(x => x);
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent, false);

            setExportStatus("Procesando relaciones...");
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes ---
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
            // -------------------------------------------------------------------------------

            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown completada.`);
            setExportStatus(`✅ Exportación Markdown completada.`);
            // History Removed

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Render Helpers ---
    const tabStyle = (id) => ({
        padding: '10px 20px', cursor: 'pointer', borderBottom: activeTab === id ? '2px solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    });

    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }
    },
        React.createElement('div', {
            style: {
                backgroundColor: 'white', width: '1200px', height: '95vh', borderRadius: '8px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                fontSize: '14px'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' } },
                React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                React.createElement('button', { onClick: onClose, style: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' } }, '✕')
            ),
            // Tabs
            React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                ['general', 'proyectos', 'exportar', 'importar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) }, t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),
            // Content
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '20px 20px 50px 20px', minHeight: 0 } },
                activeTab === 'general' && React.createElement('div', null,
                    React.createElement('h3', null, 'Configuración General'),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Nombre del Campo de Proyecto:',
                        React.createElement('input', {
                            type: 'text', value: config.projectFieldName,
                            onChange: e => setConfig({ ...config, projectFieldName: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        })
                    ),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Proyecto por Defecto:',
                        React.createElement('select', {
                            value: config.defaultProject,
                            onChange: e => setConfig({ ...config, defaultProject: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        },
                            React.createElement('option', { value: "" }, "-- Seleccionar --"),
                            projects.map(p => React.createElement('option', { key: p, value: p }, p))
                        )
                    ),
                    React.createElement('button', { onClick: handleSaveConfig, style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginTop: '20px' } }, 'Guardar Todo'),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Backup & Restore'),
                        React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                            React.createElement('button', { onClick: handleExportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↓ Exportar Config'),
                            React.createElement('button', { onClick: handleImportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↑ Importar Config')
                        )
                    ),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Atajos de Teclado'),
                        React.createElement('ul', { style: { listStyle: 'none', padding: 0 } },
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + Q'), ': Crear Pregunta (QUE)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + C'), ': Crear Afirmación (CLM)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + E'), ': Crear Evidencia (EVD)')
                        )
                    )
                ),

            ),
            // Removed 'nodos' block
            // Removed 'relaciones' block

            activeTab === 'proyectos' && React.createElement('div', null,
                React.createElement('h3', null, 'Gestión de Proyectos'),
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                    React.createElement('input', {
                        type: 'text', placeholder: 'Nuevo proyecto...',
                        value: newProject, onChange: e => setNewProject(e.target.value),
                        style: { flex: 1, padding: '8px' }
                    }),
                    React.createElement('button', { onClick: handleAddProject, style: { padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' } }, 'Agregar')
                ),
                React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '10px' } },
                    React.createElement('button', { onClick: handleValidate, style: { padding: '5px 10px', cursor: 'pointer' } }, "Validar Existencia"),
                    React.createElement('button', { onClick: handleScanProjects, style: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
                    React.createElement('button', { onClick: handleForceSync, style: { padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
                ),

                suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '20px', padding: '10px', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '4px' } },
                    React.createElement('strong', { style: { display: 'block', marginBottom: '5px', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`),
                    React.createElement('div', { style: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', backgroundColor: 'white' } },
                        suggestions.map(s =>
                            React.createElement('div', { key: s, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' } },
                                React.createElement('span', null, s),
                                React.createElement('button', { onClick: () => handleAddSuggestion(s), style: { fontSize: '12px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' } }, '+ Añadir')
                            )
                        )
                    )
                ),

                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' } },
                    React.createElement('label', null,
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                            onChange: toggleSelectAllProjects,
                            style: { marginRight: '5px' }
                        }),
                        'Seleccionar Todo'
                    ),
                    React.createElement('button', {
                        onClick: handleBulkDeleteProjects,
                        disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                        style: {
                            padding: '5px 10px',
                            backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? '#f44336' : '#ccc',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }
                    }, 'Eliminar Seleccionados')
                ),

                React.createElement('ul', { style: { listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee' } },
                    projects.map(p =>
                        React.createElement('li', { key: p, style: { padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                            React.createElement('label', { style: { display: 'flex', alignItems: 'center', flex: 1 } },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: !!selectedProjectsForDelete[p],
                                    onChange: (e) => setSelectedProjectsForDelete({ ...selectedProjectsForDelete, [p]: e.target.checked }),
                                    style: { marginRight: '10px' }
                                }),
                                React.createElement('span', null,
                                    p,
                                    validation[p] !== undefined ? (validation[p] ? " ✅" : " ⚠️ (No encontrado)") : ""
                                )
                            ),
                            React.createElement('button', { onClick: () => handleRemoveProject(p), style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer' } }, 'X')
                        )
                    )
                )
            ),

            activeTab === 'exportar' && React.createElement('div', null,
                React.createElement('h3', null, 'Exportar Grafos'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' } },
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('h4', null, '1. Proyectos'),
                        React.createElement('div', { style: { height: '280px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
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
                        React.createElement('h4', null, '2. Tipos'),
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
                        React.createElement('div', { style: { marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' } },
                            React.createElement('h4', { style: { marginTop: 0 } }, 'Opcional: Página Índice'),
                            React.createElement('p', { style: { fontSize: '12px', color: '#666', marginBottom: '5px' } },
                                'Si se especifica, se exportarán los nodos referenciados en esta página respetando su orden visual.'
                            ),
                            React.createElement('input', {
                                type: 'text',
                                placeholder: 'Ej: Tesis/Índice',
                                value: indexPage,
                                onChange: e => setIndexPage(e.target.value),
                                style: { width: '100%', padding: '8px', boxSizing: 'border-box' }
                            })
                        ),
                        React.createElement('div', { style: { marginTop: '10px' } },
                            React.createElement('label', null,
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: includeReferenced,
                                    onChange: e => setIncludeReferenced(e.target.checked)
                                }),
                                ' Incluir nodos referenciados'
                            )
                        ),
                        React.createElement('div', { style: { marginTop: '10px' } },
                            React.createElement('strong', { style: { display: 'block', marginBottom: '5px', fontSize: '12px' } }, 'Extraer Todo el Contenido:'),
                            ['QUE', 'CLM', 'EVD'].map(type =>
                                React.createElement('div', { key: type, style: { marginLeft: '10px' } },
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
                            React.createElement('div', { style: { marginTop: '10px' } },
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
                React.createElement('div', { style: { marginTop: '20px' } },
                    React.createElement('button', { onClick: handlePreview, style: { marginRight: '10px', padding: '10px' } }, "Vista Previa"),
                    React.createElement('button', {
                        onClick: handleExport,
                        disabled: isExporting,
                        style: { padding: '10px 20px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' }
                    }, 'Exportar JSON'),
                    React.createElement('button', {
                        onClick: handleExportHtml,
                        disabled: isExporting,
                        style: { padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }
                    }, 'Exportar HTML'),
                    React.createElement('button', {
                        onClick: handleExportMarkdown,
                        disabled: isExporting,
                        style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }
                    }, 'Exportar Markdown')
                ),
                exportStatus && React.createElement('div', { style: { marginTop: '10px', fontWeight: 'bold' } }, exportStatus),
                previewPages.length > 0 && React.createElement('div', { style: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                    React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
                    React.createElement('ul', { style: { paddingLeft: '20px' } },
                        previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
                    )
                )
            ),

            activeTab === 'importar' && React.createElement('div', null,
                React.createElement('h3', null, 'Importar Grafos'),
                React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

                React.createElement('div', { style: { marginTop: '20px', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' } },
                    React.createElement('input', {
                        type: 'file',
                        accept: '.json',
                        id: 'import-file-input',
                        style: { display: 'none' },
                        onChange: (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                    setExportStatus("Importando...");
                                    try {
                                        const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setExportStatus(msg));

                                        let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                        if (result.errors && result.errors.length > 0) {
                                            statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                            DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                        } else {
                                            DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                        }
                                        setExportStatus(statusMsg);

                                    } catch (err) {
                                        console.error(err);
                                        setExportStatus(`❌ Error fatal: ${err.message}`);
                                        DiscourseGraphToolkit.showToast("Error en importación.", "error");
                                    }
                                };
                                reader.readAsText(file);
                            }
                        }
                    }),
                    React.createElement('label', {
                        htmlFor: 'import-file-input',
                        style: {
                            display: 'inline-block', padding: '10px 20px', backgroundColor: '#2196F3', color: 'white',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '16px'
                        }
                    }, 'Seleccionar Archivo JSON')
                ),
                exportStatus && React.createElement('div', { style: { marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontFamily: 'monospace' } }, exportStatus)
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    // Guardar el elemento activo actual para restaurarlo después
    const previousActiveElement = document.activeElement;

    // Cerrar modal anterior si existe
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        ReactDOM.unmountComponentAtNode(existing);
        existing.remove();
    }

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
            if (div.parentNode) div.parentNode.removeChild(div);

            // Restaurar foco (Estrategia Robusta)
            setTimeout(() => {
                if (previousActiveElement && document.body.contains(previousActiveElement)) {
                    previousActiveElement.focus();
                } else {
                    // Fallback: Intentar enfocar el área principal de Roam
                    const article = document.querySelector('.roam-article') ||
                        document.querySelector('.rm-article-wrapper') ||
                        document.querySelector('.roam-body-main');

                    if (article) {
                        article.focus();
                        // Simular click para reactivar listeners de Roam
                        article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                        article.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                        article.click();
                    } else {
                        window.focus();
                    }
                }
            }, 100);
        } catch (e) {
            console.error("Error closing modal:", e);
        }
    };

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close }), div);
};


