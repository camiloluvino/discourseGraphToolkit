// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT)
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('proyectos');
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');

    // Estados de Exportación
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: false, CLM: false, EVD: false });
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

    // Estados para la pestaña Verificar
    const [availableQuestions, setAvailableQuestions] = React.useState([]);
    const [selectedQuestion, setSelectedQuestion] = React.useState(null);
    const [verificationResult, setVerificationResult] = React.useState(null);
    const [structureResult, setStructureResult] = React.useState(null);
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [verifyStatus, setVerifyStatus] = React.useState('');
    // Estados para coherencia de proyectos
    const [coherenceResult, setCoherenceResult] = React.useState(null);
    const [isPropagating, setIsPropagating] = React.useState(false);
    const [editableProject, setEditableProject] = React.useState('');

    // Estados para la pestaña Ramas (verificación bulk)
    const [bulkVerificationResults, setBulkVerificationResults] = React.useState([]);
    const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);
    const [bulkVerifyStatus, setBulkVerifyStatus] = React.useState('');
    const [selectedBulkQuestion, setSelectedBulkQuestion] = React.useState(null);

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

            // Cargar cache de verificación de ramas si existe
            const verificationCache = DiscourseGraphToolkit.getVerificationCache();
            if (verificationCache && verificationCache.results) {
                setBulkVerificationResults(verificationCache.results);
                setBulkVerifyStatus(verificationCache.status || '📋 Resultados cargados del cache.');
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
            // History Removed

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Handlers Verificación ---
    const handleLoadQuestions = async () => {
        setVerifyStatus("Cargando preguntas...");
        try {
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            setAvailableQuestions(questions);
            setVerifyStatus(`${questions.length} preguntas encontradas.`);
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error al cargar preguntas: " + e.message);
        }
    };

    const handleVerifyBranch = async () => {
        if (!selectedQuestion) {
            setVerifyStatus("Selecciona una pregunta primero.");
            return;
        }

        setIsVerifying(true);
        setVerificationResult(null);
        setStructureResult(null);
        setCoherenceResult(null);
        setVerifyStatus("Analizando rama...");

        try {
            // 0. Verificar estructura del QUE primero
            setVerifyStatus("Verificando estructura...");
            const structResult = await DiscourseGraphToolkit.verifyBranchStructure(selectedQuestion.pageUid);
            setStructureResult(structResult);

            // 1. Obtener todos los nodos de la rama
            setVerifyStatus("Obteniendo nodos de la rama...");
            const branchNodes = await DiscourseGraphToolkit.getBranchNodes(selectedQuestion.pageUid);

            if (branchNodes.length === 0) {
                if (structResult.structureIssues.length > 0) {
                    setVerifyStatus("⚠️ Problemas de estructura detectados (ver abajo).");
                } else {
                    setVerifyStatus("No se encontraron nodos en esta rama.");
                }
                setVerificationResult({ withProject: [], withoutProject: [], nodes: {} });
                return;
            }

            // 2. Verificar coherencia de proyectos (NUEVO)
            setVerifyStatus(`Verificando coherencia en ${branchNodes.length} nodos...`);
            const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(selectedQuestion.pageUid, branchNodes);
            setCoherenceResult(cohResult);
            setEditableProject(cohResult.rootProject || '');

            // 3. Crear mapa de nodos para mostrar información (legacy compatibility)
            const nodesMap = {};
            branchNodes.forEach(n => { nodesMap[n.uid] = n; });

            // Mantener compatibilidad con la estructura anterior
            setVerificationResult({
                withProject: [...cohResult.coherent.map(n => n.uid), ...cohResult.different.map(n => n.uid)],
                withoutProject: cohResult.missing.map(n => n.uid),
                nodes: nodesMap
            });

            // 4. Generar mensaje de estado final
            let statusParts = [];
            if (structResult.structureIssues.length > 0) {
                statusParts.push(`🔧 ${structResult.structureIssues.length} problema(s) de estructura`);
            }
            if (cohResult.different.length > 0) {
                statusParts.push(`⚠️ ${cohResult.different.length} nodo(s) con proyecto diferente`);
            }
            if (cohResult.missing.length > 0) {
                statusParts.push(`❌ ${cohResult.missing.length} nodo(s) sin proyecto`);
            }

            if (statusParts.length === 0) {
                setVerifyStatus(`✅ Todos los ${branchNodes.length} nodos son coherentes con el proyecto de la rama.`);
            } else {
                setVerifyStatus(statusParts.join(' | '));
            }

        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePropagateProject = async () => {
        if (!selectedQuestion || !editableProject.trim()) {
            setVerifyStatus("❌ Ingresa un proyecto para propagar.");
            return;
        }

        const nodesToUpdate = coherenceResult ? [...coherenceResult.different, ...coherenceResult.missing] : [];
        if (nodesToUpdate.length === 0) {
            setVerifyStatus("✅ No hay nodos que actualizar.");
            return;
        }

        setIsPropagating(true);
        setVerifyStatus(`⏳ Propagando "${editableProject}" a ${nodesToUpdate.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateProjectToBranch(
                selectedQuestion.pageUid,
                editableProject.trim(),
                nodesToUpdate
            );

            if (result.success) {
                setVerifyStatus(`✅ Propagación completada: ${result.updated} actualizados, ${result.created} creados.`);
                // Re-verificar automáticamente
                setTimeout(() => handleVerifyBranch(), 500);
            } else {
                setVerifyStatus(`⚠️ Propagación con errores: ${result.errors.length} error(es).`);
            }
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const handleFixStructure = async (uid) => {
        setVerifyStatus("Corrigiendo estructura...");
        try {
            const result = await DiscourseGraphToolkit.fixQueStructure(uid);
            if (result.success && result.fixed > 0) {
                setVerifyStatus(`✅ Estructura corregida: ${result.fixed} bloque(s) actualizado(s). Verificando de nuevo...`);
                // Re-verificar después de corregir
                setTimeout(() => handleVerifyBranch(), 500);
            } else if (result.success && result.fixed === 0) {
                setVerifyStatus("No se encontraron bloques para corregir.");
            } else {
                setVerifyStatus("❌ Error al corregir estructura.");
            }
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        }
    };

    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
        } catch (e) {
            console.error("Error navigating to page:", e);
            // Fallback: abrir en nueva pestaña
            window.open(`https://roamresearch.com/#/app/${DiscourseGraphToolkit.getGraphName()}/page/${uid}`, '_blank');
        }
    };

    // Cargar preguntas al entrar a la pestaña proyectos (sección verificación)
    React.useEffect(() => {
        if (activeTab === 'proyectos' && availableQuestions.length === 0) {
            handleLoadQuestions();
        }
    }, [activeTab]);

    // --- Handlers Pestaña Ramas (Verificación Bulk) ---
    const handleBulkVerifyAll = async () => {
        setIsBulkVerifying(true);
        setBulkVerifyStatus('⏳ Cargando preguntas...');
        setBulkVerificationResults([]);
        setSelectedBulkQuestion(null);

        try {
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            const results = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${questions.length}: ${q.pageTitle.substring(0, 40)}...`);

                const branchNodes = await DiscourseGraphToolkit.getBranchNodes(q.pageUid);
                const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(q.pageUid, branchNodes);

                let status = 'coherent';
                if (cohResult.missing.length > 0) status = 'missing';
                else if (cohResult.different.length > 0) status = 'different';

                results.push({
                    question: q,
                    branchNodes,
                    coherence: cohResult,
                    status
                });
            }

            setBulkVerificationResults(results);
            const coherent = results.filter(r => r.status === 'coherent').length;
            const different = results.filter(r => r.status === 'different').length;
            const missing = results.filter(r => r.status === 'missing').length;
            const statusMsg = `✅ Verificación completada: ${coherent} coherentes, ${different} diferentes, ${missing} sin proyecto.`;
            setBulkVerifyStatus(statusMsg);
            // Guardar en cache para persistencia
            DiscourseGraphToolkit.saveVerificationCache(results, statusMsg);
        } catch (e) {
            console.error('Bulk verification error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsBulkVerifying(false);
        }
    };

    const handleBulkSelectQuestion = (result) => {
        setSelectedBulkQuestion(result);
        setEditableProject(result.coherence.rootProject || '');
    };

    const handleBulkPropagateProject = async () => {
        if (!selectedBulkQuestion || !editableProject.trim()) {
            return;
        }

        const nodesToUpdate = [...selectedBulkQuestion.coherence.different, ...selectedBulkQuestion.coherence.missing];
        if (nodesToUpdate.length === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Propagando "${editableProject}" a ${nodesToUpdate.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateProjectToBranch(
                selectedBulkQuestion.question.pageUid,
                editableProject.trim(),
                nodesToUpdate
            );

            if (result.success) {
                setBulkVerifyStatus(`✅ Propagación completada. Refrescando...`);
                // Refrescar solo esta rama
                const branchNodes = await DiscourseGraphToolkit.getBranchNodes(selectedBulkQuestion.question.pageUid);
                const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(selectedBulkQuestion.question.pageUid, branchNodes);

                let status = 'coherent';
                if (cohResult.missing.length > 0) status = 'missing';
                else if (cohResult.different.length > 0) status = 'different';

                const updatedResult = { ...selectedBulkQuestion, branchNodes, coherence: cohResult, status };
                const updatedResults = bulkVerificationResults.map(r =>
                    r.question.pageUid === selectedBulkQuestion.question.pageUid ? updatedResult : r
                );
                setBulkVerificationResults(updatedResults);
                setSelectedBulkQuestion(updatedResult);
                const statusMsg = `✅ Propagación completada.`;
                setBulkVerifyStatus(statusMsg);
                // Actualizar cache
                DiscourseGraphToolkit.saveVerificationCache(updatedResults, statusMsg);
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    // --- Render Helpers ---
    const tabStyle = (id) => ({
        padding: '0.625rem 1.25rem', cursor: 'pointer', borderBottom: activeTab === id ? '0.125rem solid #2196F3' : 'none',
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
                backgroundColor: 'white', width: '90%', maxWidth: '90rem', height: '90vh', borderRadius: '0.5rem',
                display: 'flex', flexDirection: 'column', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.2)',
                fontSize: '0.875rem'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' } },
                    React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                    React.createElement('span', {
                        title: 'Atajos: Ctrl+Shift+Q (Pregunta) | Ctrl+Shift+C (Afirmacion) | Ctrl+Shift+E (Evidencia)',
                        style: { cursor: 'help', fontSize: '0.875rem', color: '#999', padding: '0.25rem 0.5rem', backgroundColor: '#f5f5f5', borderRadius: '0.25rem' }
                    }, '⌨️ Atajos')
                ),
                React.createElement('button', { onClick: onClose, style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer' } }, '✕')
            ),
            // Tabs
            React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                ['proyectos', 'ramas', 'exportar', 'importar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) }, t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),
            // Content
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 3.125rem 1.25rem', minHeight: 0 } },

                activeTab === 'proyectos' && React.createElement('div', null,
                    // === SECCIÓN 1: LISTA DE PROYECTOS ===
                    React.createElement('h3', { style: { marginTop: 0 } }, '📋 Lista de Proyectos'),
                    React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '0.625rem' } },
                        React.createElement('button', { onClick: handleValidate, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer' } }, "Validar Existencia"),
                        React.createElement('button', { onClick: handleScanProjects, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
                        React.createElement('button', { onClick: handleForceSync, style: { padding: '0.3125rem 0.625rem', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
                    ),

                    suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '1.25rem', padding: '0.625rem', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '0.25rem' } },
                        React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`.replace(/`/g, "'")),
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

                    React.createElement('ul', { style: { listStyle: 'none', padding: 0, maxHeight: '25rem', overflowY: 'auto', border: '1px solid #eee' } },
                        projects.map(p =>
                            React.createElement('li', { key: p, style: { padding: '0.625rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                React.createElement('label', { style: { display: 'flex', alignItems: 'center', flex: 1 } },
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: !!selectedProjectsForDelete[p],
                                        onChange: (e) => setSelectedProjectsForDelete({ ...selectedProjectsForDelete, [p]: e.target.checked }),
                                        style: { marginRight: '0.625rem' }
                                    }),
                                    React.createElement('span', null,
                                        p,
                                        validation[p] !== undefined ? (validation[p] ? " ✅" : " ⚠️ (No encontrado)") : ""
                                    )
                                ),
                                React.createElement('button', { onClick: () => handleRemoveProject(p), style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer' } }, 'X')
                            )
                        )
                    ),

                    // === SECCIÓN: BACKUP & RESTORE ===
                    React.createElement('div', { style: { marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' } },
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.625rem' } },
                            React.createElement('span', { style: { color: '#666', fontSize: '0.875rem' } }, '💾 Configuración:'),
                            React.createElement('button', { onClick: handleExportConfig, style: { padding: '0.375rem 0.75rem', border: '1px solid #ccc', color: '#666', background: 'white', borderRadius: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer' } }, '↓ Exportar'),
                            React.createElement('button', { onClick: handleImportConfig, style: { padding: '0.375rem 0.75rem', border: '1px solid #ccc', color: '#666', background: 'white', borderRadius: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer' } }, '↑ Importar')
                        )
                    )
                ),

                // === PESTAÑA RAMAS ===
                activeTab === 'ramas' && React.createElement('div', null,
                    React.createElement('h3', { style: { marginTop: 0 } }, '🌿 Coherencia de Ramas'),
                    React.createElement('p', { style: { color: '#666', marginBottom: '0.9375rem', fontSize: '0.875rem' } },
                        'Verifica que todos los nodos de cada rama tengan el mismo "Proyecto Asociado".'),

                    // Botones de acción
                    React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '1.25rem' } },
                        React.createElement('button', {
                            onClick: handleBulkVerifyAll,
                            disabled: isBulkVerifying,
                            style: {
                                padding: '0.75rem 1.5rem',
                                backgroundColor: isBulkVerifying ? '#ccc' : '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: isBulkVerifying ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 'bold'
                            }
                        }, isBulkVerifying ? '⏳ Verificando...' : '🔍 Verificar Todo')
                    ),

                    // Status
                    bulkVerifyStatus && React.createElement('div', {
                        style: {
                            marginBottom: '0.9375rem',
                            padding: '0.625rem',
                            backgroundColor: bulkVerifyStatus.includes('✅') ? '#e8f5e9' :
                                bulkVerifyStatus.includes('⚠️') ? '#fff3e0' :
                                    bulkVerifyStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                            borderRadius: '0.25rem',
                            fontWeight: 'bold'
                        }
                    }, bulkVerifyStatus),

                    // Dashboard de contadores
                    bulkVerificationResults.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '1.25rem' } },
                        React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#e8f5e9', borderRadius: '0.25rem', textAlign: 'center', flex: 1 } },
                            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#4CAF50' } },
                                bulkVerificationResults.filter(r => r.status === 'coherent').length),
                            React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '✅ Coherentes')
                        ),
                        React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#fff3e0', borderRadius: '0.25rem', textAlign: 'center', flex: 1 } },
                            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#ff9800' } },
                                bulkVerificationResults.filter(r => r.status === 'different').length),
                            React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '⚠️ Diferente')
                        ),
                        React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#ffebee', borderRadius: '0.25rem', textAlign: 'center', flex: 1 } },
                            React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#f44336' } },
                                bulkVerificationResults.filter(r => r.status === 'missing').length),
                            React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '❌ Sin proyecto')
                        )
                    ),

                    // Lista de ramas (layout vertical, texto completo)
                    bulkVerificationResults.length > 0 && React.createElement('div', { style: { marginBottom: '1.25rem' } },
                        React.createElement('div', {
                            style: { maxHeight: '15.625rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem' }
                        },
                            bulkVerificationResults.map(result =>
                                React.createElement('div', {
                                    key: result.question.pageUid,
                                    onClick: () => handleBulkSelectQuestion(result),
                                    style: {
                                        padding: '0.75rem 0.9375rem',
                                        borderBottom: '1px solid #eee',
                                        cursor: 'pointer',
                                        backgroundColor: selectedBulkQuestion?.question.pageUid === result.question.pageUid ? '#e3f2fd' : 'white',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem'
                                    }
                                },
                                    React.createElement('span', { style: { fontSize: '1.125rem', flexShrink: 0, marginTop: '0.125rem' } },
                                        result.status === 'coherent' ? '✅' : result.status === 'different' ? '⚠️' : '❌'),
                                    React.createElement('div', { style: { flex: 1 } },
                                        React.createElement('div', { style: { fontSize: '0.875rem', fontWeight: '500', lineHeight: '1.4', marginBottom: '0.25rem' } },
                                            result.question.pageTitle.replace('[[QUE]] - ', '')),
                                        React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } },
                                            `📁 ${result.coherence.rootProject || 'Sin proyecto'} • ${result.branchNodes.length} nodos`)
                                    )
                                )
                            )
                        )
                    ),

                    // Panel de detalle (debajo de la lista)
                    selectedBulkQuestion && React.createElement('div', { style: { border: '1px solid #2196F3', borderRadius: '0.25rem', padding: '0.9375rem', backgroundColor: '#f8f9fa' } },
                        React.createElement('h4', { style: { margin: '0 0 0.9375rem 0', fontSize: '0.9375rem', lineHeight: '1.4' } },
                            selectedBulkQuestion.question.pageTitle.replace('[[QUE]] - ', '')),

                        // Proyecto editable
                        React.createElement('div', { style: { marginBottom: '0.9375rem', display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' } },
                            React.createElement('span', { style: { fontWeight: 'bold', whiteSpace: 'nowrap' } }, '📁 Proyecto:'),
                            React.createElement('input', {
                                type: 'text',
                                value: editableProject,
                                onChange: (e) => setEditableProject(e.target.value),
                                style: { flex: 1, minWidth: '12.5rem', padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '0.25rem', fontSize: '0.875rem' }
                            }),
                            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
                            React.createElement('button', {
                                onClick: handleBulkPropagateProject,
                                disabled: isPropagating || !editableProject.trim(),
                                style: {
                                    padding: '0.5rem 1rem',
                                    backgroundColor: (isPropagating || !editableProject.trim()) ? '#ccc' : '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    cursor: (isPropagating || !editableProject.trim()) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: 'bold'
                                }
                            }, isPropagating ? '⏳ Propagando...' : `🔄 Propagar a ${selectedBulkQuestion.coherence.different.length + selectedBulkQuestion.coherence.missing.length} nodos`)
                        ),

                        // Resumen
                        React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '0.9375rem', fontSize: '0.8125rem' } },
                            React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#e8f5e9', borderRadius: '0.1875rem' } },
                                `✅ ${selectedBulkQuestion.coherence.coherent.length} coherentes`),
                            React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#fff3e0', borderRadius: '0.1875rem' } },
                                `⚠️ ${selectedBulkQuestion.coherence.different.length} diferentes`),
                            React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#ffebee', borderRadius: '0.1875rem' } },
                                `❌ ${selectedBulkQuestion.coherence.missing.length} sin proyecto`)
                        ),

                        // Lista de nodos problemáticos (texto completo en múltiples líneas)
                        (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
                        React.createElement('div', { style: { maxHeight: '12.5rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: 'white' } },
                            selectedBulkQuestion.coherence.different.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.625rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' } },
                                    React.createElement('span', { style: { color: '#ff9800', fontSize: '0.875rem', flexShrink: 0 } }, '⚠️'),
                                    React.createElement('div', { style: { flex: 1, lineHeight: '1.4' } },
                                        React.createElement('span', { style: { fontSize: '0.6875rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', marginRight: '0.5rem' } }, node.type),
                                        React.createElement('span', { style: { fontSize: '0.8125rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))
                                    ),
                                    React.createElement('button', {
                                        onClick: () => handleNavigateToPage(node.uid),
                                        style: { padding: '0.25rem 0.625rem', fontSize: '0.75rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.1875rem', cursor: 'pointer', flexShrink: 0 }
                                    }, '→ Ir')
                                )
                            ),
                            selectedBulkQuestion.coherence.missing.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.625rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' } },
                                    React.createElement('span', { style: { color: '#f44336', fontSize: '0.875rem', flexShrink: 0 } }, '❌'),
                                    React.createElement('div', { style: { flex: 1, lineHeight: '1.4' } },
                                        React.createElement('span', { style: { fontSize: '0.6875rem', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', marginRight: '0.5rem' } }, node.type),
                                        React.createElement('span', { style: { fontSize: '0.8125rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))
                                    ),
                                    React.createElement('button', {
                                        onClick: () => handleNavigateToPage(node.uid),
                                        style: { padding: '0.25rem 0.625rem', fontSize: '0.75rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.1875rem', cursor: 'pointer', flexShrink: 0 }
                                    }, '→ Ir')
                                )
                            )
                        )
                    )
                ),

                activeTab === 'exportar' && React.createElement('div', null,
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
                            style: { padding: '0.625rem 1.25rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '0.25rem' }
                        }, 'Exportar Markdown')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '0.625rem', fontWeight: 'bold' } }, exportStatus),
                    previewPages.length > 0 && React.createElement('div', { style: { marginTop: '0.9375rem', maxHeight: '12.5rem', overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem' } },
                        React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
                        React.createElement('ul', { style: { paddingLeft: '1.25rem' } },
                            previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
                        )
                    )
                ),

                activeTab === 'importar' && React.createElement('div', null,
                    React.createElement('h3', null, 'Importar Grafos'),
                    React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

                    React.createElement('div', { style: { marginTop: '1.25rem', padding: '1.25rem', border: '2px dashed #ccc', borderRadius: '0.5rem', textAlign: 'center' } },
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
                                display: 'inline-block', padding: '0.625rem 1.25rem', backgroundColor: '#2196F3', color: 'white',
                                borderRadius: '0.25rem', cursor: 'pointer', fontSize: '1rem'
                            }
                        }, 'Seleccionar Archivo JSON')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '1.25rem', padding: '0.625rem', backgroundColor: '#f5f5f5', borderRadius: '0.25rem', fontFamily: 'monospace' } }, exportStatus)
                ),

                activeTab === 'verificar' && React.createElement('div', null,
                    React.createElement('h3', { style: { marginTop: 0, marginBottom: '0.625rem' } }, '🔍 Verificar Proyecto Asociado'),
                    React.createElement('p', { style: { color: '#666', marginBottom: '1.25rem' } },
                        'Verifica que todos los nodos de una rama tengan la propiedad "Proyecto Asociado::".'),

                    // Selector de pregunta
                    React.createElement('div', { style: { marginBottom: '0.9375rem' } },
                        React.createElement('label', { style: { display: 'block', marginBottom: '0.3125rem', fontWeight: 'bold' } },
                            'Selecciona una pregunta:'),
                        React.createElement('select', {
                            value: selectedQuestion ? selectedQuestion.pageUid : '',
                            onChange: (e) => {
                                const q = availableQuestions.find(q => q.pageUid === e.target.value);
                                setSelectedQuestion(q || null);
                                setVerificationResult(null);
                                setCoherenceResult(null);
                            },
                            style: { width: '100%', padding: '0.625rem', fontSize: '0.875rem', borderRadius: '0.25rem', border: '1px solid #ccc' }
                        },
                            React.createElement('option', { value: '' }, '-- Seleccionar pregunta --'),
                            availableQuestions.map(q =>
                                React.createElement('option', { key: q.pageUid, value: q.pageUid },
                                    q.pageTitle.replace('[[QUE]] - ', '').substring(0, 100) + (q.pageTitle.length > 100 ? '...' : '')
                                )
                            )
                        )
                    ),

                    // Botones de acción
                    React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '1.25rem' } },
                        React.createElement('button', {
                            onClick: handleVerifyBranch,
                            disabled: isVerifying || !selectedQuestion,
                            style: {
                                padding: '0.625rem 1.25rem',
                                backgroundColor: selectedQuestion ? '#2196F3' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: selectedQuestion ? 'pointer' : 'not-allowed',
                                fontSize: '0.875rem'
                            }
                        }, isVerifying ? '⏳ Verificando...' : '🔍 Verificar Rama'),
                        React.createElement('button', {
                            onClick: handleLoadQuestions,
                            style: {
                                padding: '0.625rem 1.25rem',
                                backgroundColor: 'white',
                                color: '#666',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }
                        }, '🔄 Refrescar Preguntas')
                    ),

                    // Status
                    verifyStatus && React.createElement('div', {
                        style: {
                            marginBottom: '0.9375rem',
                            padding: '0.625rem',
                            backgroundColor: verifyStatus.includes('✅') ? '#e8f5e9' :
                                verifyStatus.includes('⚠️') ? '#fff3e0' :
                                    verifyStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                            borderRadius: '0.25rem',
                            fontWeight: 'bold'
                        }
                    }, verifyStatus),

                    // Cabecera: Proyecto de la Rama (NUEVO)
                    coherenceResult && React.createElement('div', {
                        style: {
                            marginBottom: '0.9375rem',
                            padding: '0.75rem 0.9375rem',
                            backgroundColor: coherenceResult.rootProject ? '#e3f2fd' : '#ffebee',
                            borderRadius: '0.25rem',
                            border: coherenceResult.rootProject ? '1px solid #2196F3' : '1px solid #f44336',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }
                    },
                        React.createElement('div', null,
                            React.createElement('span', { style: { fontWeight: 'bold', marginRight: '0.625rem' } }, '📁 Proyecto de la Rama:'),
                            React.createElement('span', {
                                style: {
                                    padding: '0.25rem 0.625rem',
                                    backgroundColor: coherenceResult.rootProject ? '#bbdefb' : '#ffcdd2',
                                    borderRadius: '0.25rem',
                                    fontWeight: 'bold'
                                }
                            }, coherenceResult.rootProject || '❌ Sin proyecto')
                        ),
                        (coherenceResult.different.length > 0 || coherenceResult.missing.length > 0) && coherenceResult.rootProject &&
                        React.createElement('button', {
                            onClick: handlePropagateProject,
                            disabled: isPropagating,
                            style: {
                                padding: '0.5rem 1rem',
                                backgroundColor: isPropagating ? '#ccc' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: isPropagating ? 'not-allowed' : 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: 'bold'
                            }
                        }, isPropagating ? '⏳ Propagando...' : `🔄 Propagar a ${coherenceResult.different.length + coherenceResult.missing.length} nodos`)
                    ),

                    // Problemas de Estructura (NUEVO)
                    structureResult && structureResult.structureIssues.length > 0 && React.createElement('div', {
                        style: {
                            marginBottom: '15px',
                            border: '2px solid #f44336',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }
                    },
                        React.createElement('div', {
                            style: {
                                padding: '10px',
                                backgroundColor: '#ffebee',
                                fontWeight: 'bold',
                                borderBottom: '1px solid #f44336',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                            React.createElement('span', null, `🔧 Problemas de Estructura (${structureResult.structureIssues.length})`),
                            React.createElement('span', {
                                style: {
                                    fontSize: '11px',
                                    color: '#c62828',
                                    fontWeight: 'normal'
                                }
                            }, '⚠️ Afecta la exportación')
                        ),
                        React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
                            structureResult.structureIssues.map((issue, idx) =>
                                React.createElement('div', {
                                    key: idx,
                                    style: {
                                        padding: '10px',
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: 'white'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }
                                    },
                                        React.createElement('span', null,
                                            React.createElement('span', {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    marginRight: '8px',
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1565c0'
                                                }
                                            }, issue.type),
                                            (issue.title || '').replace(/\[\[(QUE|CLM|EVD)\]\] - /, '').substring(0, 60) + ((issue.title || '').length > 60 ? '...' : '')
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleFixStructure(issue.uid),
                                            style: {
                                                padding: '4px 12px',
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, '🔧 Corregir')
                                    ),
                                    issue.issues.map((problemText, pIdx) =>
                                        React.createElement('div', {
                                            key: pIdx,
                                            style: {
                                                fontSize: '12px',
                                                color: '#c62828',
                                                marginLeft: '10px',
                                                paddingLeft: '10px',
                                                borderLeft: '2px solid #ffcdd2'
                                            }
                                        }, `❌ ${problemText}`)
                                    )
                                )
                            )
                        )
                    ),

                    // Resultados basados en coherencia
                    coherenceResult && React.createElement('div', null,
                        // Nodos con proyecto diferente (⚠️ naranja)
                        coherenceResult.different.length > 0 && React.createElement('div', {
                            style: {
                                marginBottom: '15px',
                                border: '1px solid #ff9800',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#fff3e0',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #ff9800'
                                }
                            }, `⚠️ Nodos con Proyecto Diferente (${coherenceResult.different.length})`),
                            React.createElement('div', { style: { maxHeight: '250px', overflowY: 'auto' } },
                                coherenceResult.different.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white'
                                        }
                                    },
                                        React.createElement('div', { style: { flex: 1 } },
                                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
                                                React.createElement('span', {
                                                    style: {
                                                        display: 'inline-block',
                                                        padding: '2px 6px',
                                                        borderRadius: '3px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px',
                                                        backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                        color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                                    }
                                                }, node.type),
                                                React.createElement('span', null, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60))
                                            ),
                                            React.createElement('div', { style: { fontSize: '11px', color: '#666', marginLeft: '10px' } },
                                                `Tiene: `,
                                                React.createElement('span', { style: { color: '#e65100', fontWeight: 'bold' } }, node.project || '?'),
                                                ` → Debería: `,
                                                React.createElement('span', { style: { color: '#1565c0', fontWeight: 'bold' } }, coherenceResult.rootProject)
                                            )
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleNavigateToPage(node.uid),
                                            style: {
                                                padding: '4px 10px',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }
                                        }, '→ Ir')
                                    )
                                )
                            )
                        ),

                        // Nodos sin proyecto (❌ rojo)
                        coherenceResult.missing.length > 0 && React.createElement('div', {
                            style: {
                                marginBottom: '15px',
                                border: '1px solid #f44336',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#ffebee',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #f44336'
                                }
                            }, `❌ Nodos sin Proyecto (${coherenceResult.missing.length})`),
                            React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
                                coherenceResult.missing.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white'
                                        }
                                    },
                                        React.createElement('span', { style: { flex: 1 } },
                                            React.createElement('span', {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    marginRight: '8px',
                                                    backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                    color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                                }
                                            }, node.type),
                                            (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60)
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleNavigateToPage(node.uid),
                                            style: {
                                                padding: '4px 10px',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }
                                        }, '→ Ir')
                                    )
                                )
                            )
                        ),

                        // Nodos coherentes (✅ verde) - colapsados
                        coherenceResult.coherent.length > 0 && React.createElement('div', {
                            style: {
                                border: '1px solid #4CAF50',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#e8f5e9',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #4CAF50',
                                    cursor: 'pointer'
                                },
                                onClick: (e) => {
                                    const content = e.target.nextSibling;
                                    if (content) {
                                        content.style.display = content.style.display === 'none' ? 'block' : 'none';
                                    }
                                }
                            }, `✅ Nodos Coherentes (${coherenceResult.coherent.length}) - Click para expandir`),
                            React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto', display: 'none' } },
                                coherenceResult.coherent.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            padding: '6px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white',
                                            fontSize: '13px',
                                            color: '#666'
                                        }
                                    },
                                        React.createElement('span', {
                                            style: {
                                                display: 'inline-block',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                marginRight: '8px',
                                                backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                            }
                                        }, node.type),
                                        (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60)
                                    )
                                )
                            )
                        )
                    )
                )
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


