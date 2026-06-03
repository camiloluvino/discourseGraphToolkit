// ============================================================================
// UI: Branches Tab Component
// ============================================================================

DiscourseGraphToolkit.BranchesTab = function () {
    const React = window.React;
    const {
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        selectedProjects, setSelectedProjects,
        verificationProgress, setVerificationProgress
    } = DiscourseGraphToolkit.useBranches();

    // --- Favorites ---
    const [favorites, setFavorites] = React.useState([]);

    // Cargar favoritos al montar
    React.useEffect(() => {
        setFavorites(DiscourseGraphToolkit.FavoritesService.getAll('branches'));
    }, []);

    const handleSaveFavorite = () => {
        const data = {
            selectedProjects: Array.from(selectedProjects)
        };
        // El nombre se genera automáticamente desde selectedProjects (por namespace)
        const updated = DiscourseGraphToolkit.FavoritesService.add('branches', null, data);
        setFavorites(updated);
        // Mostrar toast con el nombre generado
        const name = DiscourseGraphToolkit.computeFavoriteName(selectedProjects);
        DiscourseGraphToolkit.showToast('Favorito guardado: ' + name, 'success');
    };

    const handleApplyFavorite = (fav) => {
        const data = fav.data;
        if (data.selectedProjects && Array.isArray(data.selectedProjects)) {
            setSelectedProjects(new Set(data.selectedProjects));
        }
        DiscourseGraphToolkit.showToast('Favorito aplicado: ' + fav.name, 'success');
    };

    const handleDeleteFavorite = (favId, favName, e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar favorito "' + favName + '"?')) return;
        const updated = DiscourseGraphToolkit.FavoritesService.remove('branches', favId);
        setFavorites(updated);
    };

    const handleRenameFavorite = (favId, currentName) => {
        const newName = prompt('Nuevo nombre:', currentName);
        if (!newName || newName.trim() === currentName) return;
        const updated = DiscourseGraphToolkit.FavoritesService.rename('branches', favId, newName.trim());
        setFavorites(updated);
    };

    const isFavoriteActive = (fav) => {
        const current = Array.from(selectedProjects).sort();
        const saved = (fav.data.selectedProjects || []).sort();
        if (current.length !== saved.length) return false;
        return current.every((v, i) => v === saved[i]);
    };

    // --- Estado para popover (mantener para resumen) y Filtro de Árbol ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | 'container' | null
    const [activeFilter, setActiveFilter] = React.useState(null); // 'different' | 'missing' | null
    const [showProjectFilter, setShowProjectFilter] = React.useState(false);

    const allProjects = React.useMemo(() => DiscourseGraphToolkit.getProjects(), []);
    
    // Generar caché de todos los paths (incluyendo intermedios) para selecciones correctas
    const allProjectsPathsSet = React.useMemo(() => {
        const paths = new Set(['(sin proyecto)']);
        for (const proj of allProjects) {
            const parts = proj.split('/');
            let currentPath = '';
            for (const part of parts) {
                currentPath = currentPath ? currentPath + '/' + part : part;
                paths.add(currentPath);
            }
        }
        return paths;
    }, [allProjects]);
    
    // Función para alternar la selección de un proyecto individual y sus subproyectos
    const handleToggleProjectSelect = (project, isSelected) => {
        const newSelected = new Set(selectedProjects);
        const toggleRecursive = (proj, select) => {
            if (select) newSelected.add(proj);
            else newSelected.delete(proj);
            
            // Alternar también todos los subproyectos e intermedios
            const prefix = proj + '/';
            for (const p of allProjectsPathsSet) {
                if (p.startsWith(prefix)) {
                    if (select) newSelected.add(p);
                    else newSelected.delete(p);
                }
            }
        };

        toggleRecursive(project, isSelected);
        setSelectedProjects(newSelected);
    };

    const handleToggleSelectAll = () => {
        if (selectedProjects.size >= allProjectsPathsSet.size) { 
            setSelectedProjects(new Set());
        } else {
            setSelectedProjects(new Set(allProjectsPathsSet));
        }
    };

    // --- Árbol jerárquico (calculado y filtrado) ---
    const projectTree = React.useMemo(() => {
        const baseTree = {};
        const noProject = { project: null, questions: [], children: {}, aggregatedStatus: 'missing', issueCount: 0 };
        
        // 1. Inicializar estructura con todos los proyectos disponibles
        for (const project of allProjects) {
            const parts = project.split('/');
            let currentLevel = baseTree;
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = currentPath ? currentPath + '/' + part : part;

                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        project: currentPath,
                        questions: [],
                        children: {},
                        aggregatedStatus: 'coherent',
                        issueCount: 0
                    };
                }
                currentLevel = currentLevel[part].children;
            }
        }
        
        baseTree['(sin proyecto)'] = noProject;
        
        // 2. Insertar resultados
        for (const result of bulkVerificationResults) {
            const project = result.coherence.rootProject;

            if (!project) {
                if (baseTree['(sin proyecto)']) baseTree['(sin proyecto)'].questions.push(result);
                continue;
            }

            const parts = project.split('/');
            let currentLevel = baseTree;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (currentLevel[part]) {
                    if (i === parts.length - 1) {
                        currentLevel[part].questions.push(result);
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        }
        
        // 3. Recalcular contadores
        DiscourseGraphToolkit._calculateAggregatedStatus(baseTree);

        // Función auxiliar para verificar si un nodo o sus hijos tienen un error específico
        const nodeHasErrorStatus = (node, targetStatus) => {
            if (node.questions && node.questions.some(q => q.status === targetStatus)) {
                return true;
            }
            if (node.children) {
                for (const childKey in node.children) {
                    if (nodeHasErrorStatus(node.children[childKey], targetStatus)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // Función para filtrar el árbol manteniendo la estructura según los filtros activos de estatus (diferente, missing)
        const filterTreeRecursive = (treeNodes) => {
            const filtered = {};
            for (const key in treeNodes) {
                const node = treeNodes[key];
                const hasError = nodeHasErrorStatus(node, activeFilter);

                if (hasError) {
                    filtered[key] = { ...node };
                    if (node.children) {
                        const filteredChildren = filterTreeRecursive(node.children);
                        filtered[key].children = Object.keys(filteredChildren).length > 0 ? filteredChildren : {};
                    }
                }
            }
            return filtered;
        };

        if (!activeFilter) {
            return baseTree;
        }

        return filterTreeRecursive(baseTree);

    }, [bulkVerificationResults, activeFilter, allProjects]);

    // Calcular estatus globales de un nodo (para el encabezado de carpetas)
    const getProjectErrorCounts = React.useCallback((node) => {
        let diff = 0;
        let miss = 0;

        const countErrors = (n) => {
            if (n.questions) {
                n.questions.forEach(q => {
                    if (q.status === 'different') diff++;
                    if (q.status === 'missing') miss++;
                });
            }
            if (n.children) {
                for (const k in n.children) {
                    countErrors(n.children[k]);
                }
            }
        };
        countErrors(node);
        return { diff, miss };
    }, []);

    // --- Contadores ---
    const counts = React.useMemo(() => ({
        coherent: bulkVerificationResults.filter(r => r.status === 'coherent' || r.status === 'specialized').length,
        different: bulkVerificationResults.flatMap(r => r.coherence.different).length,
        missing: bulkVerificationResults.flatMap(r => r.coherence.missing).length,
        containerMismatch: bulkVerificationResults.filter(r =>
            r.containerPage?.containerStatus === 'mismatched' ||
            r.containerPage?.containerStatus === 'no_project'
        ).length
    }), [bulkVerificationResults]);

    // --- Helpers (shared) ---
    const parseMarkdownBold = DiscourseGraphToolkit.parseMarkdownBold;
    const handleNavigateToPage = DiscourseGraphToolkit.navigateToPage.bind(DiscourseGraphToolkit);

    // --- Handlers ---
    const handleBulkVerifyAll = async () => {
        setIsBulkVerifying(true);
        setBulkVerifyStatus('⏳ Cargando ramas y preguntas...');
        setBulkVerificationResults([]);
        setSelectedBulkQuestion(null);
        setVerificationProgress({ current: 0, total: 0, currentQuestion: '' });

        try {
            const allQuestions = await DiscourseGraphToolkit.getAllRootNodes();
            const results = [];

            // Filtrar preguntas por proyectos seleccionados de manera eficiente
            // Primero obtenemos los proyectos de todas las preguntas en una sola consulta
            const PM = DiscourseGraphToolkit.ProjectManager;
            const escapedPattern = PM.getEscapedFieldPattern();
            const allUids = allQuestions.map(q => q.pageUid);
            const query = `[:find ?page-uid ?string
                       :in $ [?page-uid ...]
                       :where 
                       [?page :block/uid ?page-uid]
                       [?block :block/page ?page]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "${escapedPattern}")]]`;
            
            const rawProjectResults = await window.roamAlphaAPI.data.async.q(query, allUids);
            const projectMap = new Map();
            const regex = PM.getFieldRegex();
            const fieldPattern = PM.getFieldPattern();
            
            if (rawProjectResults) {
                rawProjectResults.forEach(r => {
                    const pageUid = r[0];
                    const blockString = r[1];
                    if (!DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                        const match = blockString.match(regex);
                        if (match) {
                            projectMap.set(pageUid, match[1].trim());
                        }
                    }
                });
            }

            // Obtener páginas contenedoras para todas las preguntas en lote antes de filtrar
            setBulkVerifyStatus('⏳ Buscando páginas contenedoras...');
            const containerPageMap = await DiscourseGraphToolkit.getContainerPagesForNodes(allUids);

            // Aplicar el filtro: incluir si su propio proyecto coincide o si el proyecto de su contenedor coincide
            const filteredQuestions = allQuestions.filter(q => {
                const proj = projectMap.get(q.pageUid) || '(sin proyecto)';
                if (selectedProjects.has(proj)) {
                    return true;
                }
                const containerInfo = containerPageMap.get(q.pageUid);
                const containerProj = containerInfo ? (containerInfo.project || '(sin proyecto)') : null;
                if (containerProj && selectedProjects.has(containerProj)) {
                    return true;
                }
                return false;
            });

            if (filteredQuestions.length === 0) {
                setBulkVerifyStatus('⚠️ No hay preguntas en los proyectos seleccionados.');
                setIsBulkVerifying(false);
                return;
            }

            setVerificationProgress({ current: 0, total: filteredQuestions.length, currentQuestion: '' });

            for (let i = 0; i < filteredQuestions.length; i++) {
                // Cedemos control brevemente para permitir que el frontend repinte la UI
                await new Promise(r => setTimeout(r, 10));

                const q = filteredQuestions[i];
                const cleanTitle = q.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '');
                
                setVerificationProgress({ current: i, total: filteredQuestions.length, currentQuestion: cleanTitle });
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${filteredQuestions.length}...`);

                const branchNodes = await DiscourseGraphToolkit.getBranchNodes(q.pageUid);
                const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(q.pageUid, branchNodes);

                let status = 'coherent';
                if (cohResult.missing.length > 0) status = 'missing';
                else if (cohResult.different.length > 0) status = 'different';
                else if (cohResult.specialized.length > 0) status = 'specialized';

                const rawContainerInfo = containerPageMap.get(q.pageUid) || null;
                const containerStatus = DiscourseGraphToolkit.calcContainerStatus(cohResult.rootProject, rawContainerInfo);
                const containerPage = rawContainerInfo ? { ...rawContainerInfo, containerStatus } : null;

                results.push({
                    question: q,
                    branchNodes,
                    coherence: cohResult,
                    status,
                    containerPage
                });
            }

            setVerificationProgress({ current: filteredQuestions.length, total: filteredQuestions.length, currentQuestion: '¡Completado!' });

            setBulkVerificationResults(results);
            const coherent = results.filter(r => r.status === 'coherent' || r.status === 'specialized').length;
            const different = results.filter(r => r.status === 'different').length;
            const missing = results.filter(r => r.status === 'missing').length;
            const statusMsg = `✅ ${coherent} coherentes, ${different} dif., ${missing} sin proy.`;
            setBulkVerifyStatus(statusMsg);
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

    const handlePropagate = async () => {
        if (!selectedBulkQuestion || !editableProject.trim()) {
            return;
        }

        const exactChanges = [
            ...selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization'),
            ...selectedBulkQuestion.coherence.missing
        ];
        
        const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
        
        const totalNodes = exactChanges.length + generalizations.length;
        if (totalNodes === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Propagando proyecto a ${totalNodes} nodos...`);

        try {
            let success = true;
            
            // 1. Propagar proyecto raíz a diferentes exactos y faltantes
            if (exactChanges.length > 0) {
                const resultExact = await DiscourseGraphToolkit.propagateProjectToBranch(
                    selectedBulkQuestion.question.pageUid,
                    editableProject.trim(),
                    exactChanges
                );
                if (!resultExact.success) success = false;
            }
            
            // 2. Heredar proyecto del padre directo para generalizaciones
            if (generalizations.length > 0) {
                const resultGen = await DiscourseGraphToolkit.propagateFromParents(generalizations);
                if (!resultGen.success) success = false;
            }

            if (success) {
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
                // Forzar refresco para ver lo que se arregló
                await refreshSelectedQuestion();
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const refreshQuestionByUid = async (rootUid) => {
        setBulkVerifyStatus(`✅ Sincronizando con Roam...`);
        await new Promise(resolve => setTimeout(resolve, 550));

        setBulkVerifyStatus(`✅ Refrescando datos...`);
        const branchNodes = await DiscourseGraphToolkit.getBranchNodes(rootUid);
        const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(rootUid, branchNodes);

        let status = 'coherent';
        if (cohResult.missing.length > 0) status = 'missing';
        else if (cohResult.different.length > 0) status = 'different';
        else if (cohResult.specialized.length > 0) status = 'specialized';

        // Re-obtener página contenedora para esta pregunta
        const singleContainerMap = await DiscourseGraphToolkit.getContainerPagesForNodes([rootUid]);
        const rawContainerInfo = singleContainerMap.get(rootUid) || null;
        const containerStatus = DiscourseGraphToolkit.calcContainerStatus(cohResult.rootProject, rawContainerInfo);
        const containerPage = rawContainerInfo ? { ...rawContainerInfo, containerStatus } : null;

        const existingResult = bulkVerificationResults.find(r => r.question.pageUid === rootUid);
        const updatedResult = { ...existingResult, question: existingResult?.question || { pageUid: rootUid }, branchNodes, coherence: cohResult, status, containerPage };
        
        const updatedResults = bulkVerificationResults.map(r =>
            r.question.pageUid === rootUid ? updatedResult : r
        );
        setBulkVerificationResults(updatedResults);
        if (selectedBulkQuestion?.question.pageUid === rootUid) {
            setSelectedBulkQuestion(updatedResult);
            setEditableProject(cohResult.rootProject || '');
        }
        const statusMsg = `✅ Sincronización completada.`;
        setBulkVerifyStatus(statusMsg);
        DiscourseGraphToolkit.saveVerificationCache(updatedResults, statusMsg);
    };

    const refreshSelectedQuestion = async () => {
        if (!selectedBulkQuestion) return;
        await refreshQuestionByUid(selectedBulkQuestion.question.pageUid);
    };

    const handleFixContainerAlignment = async (queUid, targetUid, newProject, promptMessage, isQue) => {
        if (promptMessage && !window.confirm(promptMessage)) {
            return;
        }

        setIsPropagating(true);
        setBulkVerifyStatus('⏳ Alineando proyectos...');

        try {
            const res = await DiscourseGraphToolkit.fixContainerAlignment(targetUid, newProject);
            if (res.success) {
                // Si el contenedor fue modificado, múltiples QUEs en ese contenedor podrían haberse visto afectadas.
                const affectedResults = bulkVerificationResults.filter(r => r.containerPage && r.containerPage.uid === targetUid);
                if (!isQue && affectedResults.length > 1) {
                    setBulkVerifyStatus('⏳ Refrescando ramas afectadas...');
                    for (const r of affectedResults) {
                        await refreshQuestionByUid(r.question.pageUid);
                    }
                } else {
                    await refreshQuestionByUid(queUid);
                }
                DiscourseGraphToolkit.showToast('Proyecto alineado con éxito', 'success');
            } else {
                setBulkVerifyStatus('❌ Error al alinear: ' + (res.error || 'error desconocido'));
                DiscourseGraphToolkit.showToast('Error al alinear proyecto: ' + (res.error || ''), 'error');
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
            DiscourseGraphToolkit.showToast('Error: ' + e.message, 'error');
        } finally {
            setIsPropagating(false);
        }
    };

    // --- Callbacks para ProjectTreeView ---
    const renderBranchesNodeHeader = (node, key, depth, isExpanded, toggleFn) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const totalQuestions = DiscourseGraphToolkit.countTreeQuestions(node);

        const depthClass = depth === 0 ? 'depth-0' : (depth % 2 !== 0 ? 'depth-odd' : 'depth-even');

        const { diff, miss } = getProjectErrorCounts(node);

        return React.createElement('div', {
            onClick: toggleFn,
            className: `dgt-accordion-header ${depthClass}`
        },
            React.createElement('span', { className: 'dgt-text-muted dgt-text-xs', style: { width: '16px', textAlign: 'center' } },
                hasChildren ? (isExpanded ? '▼' : '▶') : '•'),
            React.createElement('div', { className: 'dgt-flex-row', style: { flex: 1, gap: '0.75rem', alignItems: 'center' } },
                // Checkbox de selección (solo hasta nivel 1)
                (depth <= 1) && React.createElement('input', {
                    type: 'checkbox',
                    checked: selectedProjects.has(node.project || '(sin proyecto)'),
                    onChange: (e) => {
                        e.stopPropagation();
                        handleToggleProjectSelect(node.project || '(sin proyecto)', e.target.checked);
                    },
                    onClick: (e) => e.stopPropagation(),
                    style: { cursor: 'pointer', margin: 0 }
                }),
                React.createElement('span', { title: node.project },
                    node.project ? node.project.split('/').pop() : '(sin proyecto)'
                ),
                // Indicador de error minimalista (punto rojo)
                (miss > 0 || diff > 0) && React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center' } },
                    React.createElement('div', {
                        title: `${miss} sin proyecto, ${diff} con proyecto diferente`,
                        style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }
                    })
                ),
                // Contador total
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral'
                }, `${totalQuestions} rama${totalQuestions !== 1 ? 's' : ''}`)
            )
        );
    };

    // Helper: título corto de la página contenedora (segmento antes de /grafoDeDiscurso)
    const getContainerShortTitle = (title) => {
        if (!title) return '(sin página contenedora)';
        const suffix = DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX;
        const base = title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
        return base.split('/').pop() || base;
    };

    // Helper: icono y color según containerStatus
    const CONTAINER_STATUS_META = {
        coherent:    { icon: '🏛️', label: 'Proyecto coherente con página contenedora', color: 'var(--dgt-text-success)' },
        mismatched:  { icon: '⚠️', label: 'Proyecto desalineado respecto a página contenedora', color: 'var(--dgt-text-warning)' },
        no_project:  { icon: '❓', label: 'Página contenedora sin proyecto definido', color: 'var(--dgt-text-muted)' },
        no_container:{ icon: '📄', label: 'Sin página contenedora encontrada', color: 'var(--dgt-text-muted)' }
    };

    // Render de una fila de QUE individual
    const renderQueRow = (result, depth) => {
        const isSelected = selectedBulkQuestion?.question.pageUid === result.question.pageUid;
        const hasError = result.status === 'different' || result.status === 'missing';

        return React.createElement('div', {
            key: result.question.pageUid,
            className: 'dgt-flex-column',
            style: {
                borderBottom: '1px solid var(--dgt-border-color)',
                backgroundColor: isSelected ? 'var(--dgt-bg-secondary)' : 'transparent'
            }
        },
            // Fila cliqueable
            React.createElement('div', {
                onClick: (e) => { e.stopPropagation(); handleBulkSelectQuestion(result); },
                className: 'dgt-flex-row dgt-text-sm',
                style: {
                    padding: '0.6rem 0.75rem',
                    paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: '0.75rem'
                }
            },
                // Punto rojo sutil para errores, o nada para coherentes
                React.createElement('div', {
                    style: {
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: hasError ? '#ef4444' : 'transparent',
                        flexShrink: 0
                    },
                    title: result.status
                }),
                React.createElement('div', { className: 'dgt-flex-column', style: { flex: 1, gap: '0.15rem' } },
                    React.createElement('div', { className: 'dgt-text-primary', style: { lineHeight: '1.4' } },
                        parseMarkdownBold(result.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, ''))),
                    React.createElement('span', { className: 'dgt-text-secondary', style: { fontSize: '0.6875rem' } },
                        `${result.branchNodes.length} nodos`)
                )
            )
        );
    };

    // Render del overlay de resolución para la QUE seleccionada (Overlay Sheet)
    const renderQueResolutionOverlay = () => {
        if (!selectedBulkQuestion) return null;

        const result = selectedBulkQuestion;
        const totalProblematic = result.coherence.different.length + result.coherence.missing.length;
        const hasContainerMismatch = result.containerPage && (result.containerPage.containerStatus === 'mismatched' || result.containerPage.containerStatus === 'no_project');

        const renderContainerMismatchRow = () => {
            const cp = result.containerPage;
            const shortTitle = getContainerShortTitle(cp.title);
            const queProject = result.coherence.rootProject;
            const containerProject = cp.project;

            return React.createElement('div', {
                key: 'container-mismatch-' + cp.uid,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--dgt-radius-md)',
                    gap: '0.6rem'
                }
            },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                background: '#b45309',
                                color: '#fff',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }
                        }, 'CONT'),
                        React.createElement('span', { style: { fontWeight: 600, fontSize: '0.8125rem', color: '#b45309' } }, shortTitle)
                    ),
                    React.createElement('button', {
                        onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' },
                        title: `Ir a: ${cp.title}`
                    }, '→')
                ),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--dgt-text-primary)' } },
                    React.createElement('div', null, 'Desalineación de proyecto con la página contenedora:'),
                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem', color: 'var(--dgt-text-muted)' } },
                        React.createElement('span', { style: { textDecoration: 'line-through', wordBreak: 'break-all' } }, containerProject || '(sin proyecto)'),
                        React.createElement('span', null, '→'),
                        React.createElement('span', { style: { color: 'var(--dgt-text-success)', fontWeight: 'bold', wordBreak: 'break-all' } }, queProject || '(sin proyecto en QUE)')
                    )
                ),
                React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' } },
                    // Botón: Propagar al contenedor
                    (cp.containerStatus === 'no_project' && queProject) && React.createElement('button', {
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        disabled: isPropagating,
                        style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                        onClick: () => {
                            handleFixContainerAlignment(
                                result.question.pageUid,
                                cp.uid,
                                queProject,
                                `¿Asignar el proyecto "${queProject}" de la QUE a la página contenedora?`,
                                false
                            );
                        }
                    }, 'Propagar proyecto al contenedor'),

                    // Botón: Heredar del contenedor (cuando la QUE no tiene proyecto)
                    (cp.containerStatus === 'mismatched' && !queProject && containerProject) && React.createElement('button', {
                        className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                        disabled: isPropagating,
                        style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                        onClick: () => {
                            handleFixContainerAlignment(
                                result.question.pageUid,
                                result.question.pageUid,
                                containerProject,
                                `¿Asignar el proyecto del contenedor ("${containerProject}") a esta QUE?`,
                                true
                            );
                        }
                    }, 'Heredar proyecto del contenedor'),

                    // Botones bidireccionales cuando ambos tienen proyecto pero son diferentes
                    (cp.containerStatus === 'mismatched' && queProject && containerProject) && React.createElement(React.Fragment, null,
                        React.createElement('button', {
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            disabled: isPropagating,
                            style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                            onClick: () => {
                                handleFixContainerAlignment(
                                    result.question.pageUid,
                                    result.question.pageUid,
                                    containerProject,
                                    `¿Cambiar el proyecto de la QUE de "${queProject}" a "${containerProject}"?\nEsto afectará a toda la rama y sus nodos hijos podrían necesitar re-sincronización.`,
                                    true
                                );
                            }
                        }, 'Alinear QUE al contenedor (cambia rama)'),
                        React.createElement('button', {
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            disabled: isPropagating,
                            style: { padding: '4px 10px', cursor: 'pointer', backgroundColor: 'var(--dgt-accent-blue)', borderColor: 'var(--dgt-accent-blue)' },
                            onClick: () => {
                                const sharedCount = bulkVerificationResults.filter(res => res.containerPage && res.containerPage.uid === cp.uid).length;
                                handleFixContainerAlignment(
                                    result.question.pageUid,
                                    cp.uid,
                                    queProject,
                                    `¿Cambiar el proyecto del contenedor de "${containerProject}" a "${queProject}"?\nAdvertencia: Este contenedor es compartido por ${sharedCount} QUE(s) en la vista de verificación.`,
                                    false
                                );
                            }
                        }, 'Alinear contenedor a la QUE')
                    )
                )
            );
        };

        const renderDiscrepancyRow = (node, errorType) => {
            const badgeColor = errorType === 'different' ? '#fef3c7' : '#fee2e2';
            const textColor = errorType === 'different' ? '#92400e' : '#991b1b';
            const borderColor = errorType === 'different' ? '#fde68a' : '#fca5a5';
            const oldProject = errorType === 'different' ? (node.project || '(sin proyecto)') : '(sin proyecto)';
            const newProject = errorType === 'different' ? node.parentProject : (node.parentProject || editableProject);

            return React.createElement('div', {
                key: node.uid,
                style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    color: 'var(--dgt-text-primary)',
                    borderBottom: '1px solid var(--dgt-border-color)',
                    paddingBottom: '0.6rem',
                    gap: '0.75rem'
                }
            },
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { display: 'flex', gap: '0.4rem', alignItems: 'flex-start' } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.65rem',
                                padding: '1px 4px',
                                background: badgeColor,
                                color: textColor,
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                border: `1px solid ${borderColor}`,
                                marginTop: '2px',
                                flexShrink: 0
                            }
                        }, node.type),
                        React.createElement('span', { style: { fontWeight: 500, lineHeight: '1.4', wordBreak: 'break-word' }, title: node.title }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')))
                    ),
                    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--dgt-text-muted)', fontSize: '0.75rem', alignItems: 'center' } },
                        React.createElement('span', { style: { textDecoration: 'line-through', wordBreak: 'break-all' } }, oldProject),
                        React.createElement('span', null, '→'),
                        React.createElement('span', { style: { color: 'var(--dgt-text-success)', fontWeight: 'bold', wordBreak: 'break-all' } }, newProject)
                    )
                ),
                React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); },
                    className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                    title: `Ir a: ${node.title || ''}`,
                    style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' }
                }, '→')
            );
        };

        return React.createElement('div', {
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(2px)'
            },
            onClick: () => setSelectedBulkQuestion(null)
        },
            React.createElement('div', {
                style: {
                    width: '90%',
                    maxWidth: '1100px',
                    maxHeight: '85vh',
                    backgroundColor: 'var(--dgt-bg-primary)',
                    borderRadius: 'var(--dgt-radius-lg)',
                    boxShadow: 'var(--dgt-shadow-lg)',
                    border: '1px solid var(--dgt-border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                },
                onClick: (e) => e.stopPropagation()
            },
                // Cabecera
                React.createElement('div', {
                    style: {
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--dgt-border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        backgroundColor: 'var(--dgt-bg-secondary)'
                    }
                },
                    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 } },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                color: 'var(--dgt-text-muted)',
                                letterSpacing: '0.05em'
                            }
                        }, 'Coherencia de Rama'),
                        React.createElement('h4', {
                            style: {
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: 'var(--dgt-text-primary)',
                                lineHeight: '1.4'
                            }
                        }, parseMarkdownBold(result.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '')))
                    ),
                    React.createElement('button', {
                        onClick: () => setSelectedBulkQuestion(null),
                        style: {
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            color: 'var(--dgt-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                        },
                        title: 'Cerrar'
                    }, '✕')
                ),
                // Cuerpo
                React.createElement('div', {
                    className: 'dgt-scrollable',
                    style: {
                        padding: '1.25rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        flex: 1
                    }
                },
                    // Stats del proyecto
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--dgt-bg-secondary)',
                            borderRadius: 'var(--dgt-radius-md)',
                            border: '1px solid var(--dgt-border-color)'
                        }
                    },
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--dgt-text-secondary)' } },
                            React.createElement('span', null, `Nodos en la rama: ${result.branchNodes.length}`),
                            React.createElement('span', null, `Errores: ${totalProblematic + (hasContainerMismatch ? 1 : 0)}`)
                        ),
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.8125rem',
                                marginTop: '0.25rem'
                            }
                        },
                            React.createElement('span', { style: { fontWeight: '600', color: 'var(--dgt-text-primary)', whiteSpace: 'nowrap' } }, 'Proyecto de la Rama:'),
                            React.createElement('input', {
                                type: 'text',
                                value: editableProject,
                                onChange: (e) => setEditableProject(e.target.value),
                                placeholder: '(sin proyecto)',
                                style: {
                                    padding: '6px 10px',
                                    fontSize: '0.75rem',
                                    border: '1px solid var(--dgt-border-color)',
                                    borderRadius: 'var(--dgt-radius-sm)',
                                    flex: 1,
                                    backgroundColor: '#fff'
                                }
                            })
                        )
                    ),
                    // Lista de discrepancias
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }
                    },
                        React.createElement('span', {
                            style: {
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: 'var(--dgt-text-secondary)',
                                borderBottom: '1px solid var(--dgt-border-color)',
                                paddingBottom: '0.25rem'
                            }
                        }, 'Discrepancias identificadas'),
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }
                        },
                            hasContainerMismatch && renderContainerMismatchRow(),
                            result.coherence.different.map(node => renderDiscrepancyRow(node, 'different')),
                            result.coherence.missing.map(node => renderDiscrepancyRow(node, 'missing'))
                        )
                    )
                ),
                // Pie / Footer
                React.createElement('div', {
                    style: {
                        padding: '1rem 1.25rem',
                        borderTop: '1px solid var(--dgt-border-color)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        backgroundColor: 'var(--dgt-bg-secondary)'
                    }
                },
                    React.createElement('button', {
                        onClick: () => setSelectedBulkQuestion(null),
                        className: 'dgt-btn dgt-btn-secondary',
                        style: { padding: '6px 12px', fontSize: '0.8125rem', cursor: 'pointer' }
                    }, 'Cerrar'),
                    totalProblematic > 0 && React.createElement('button', {
                        onClick: (e) => { e.stopPropagation(); handlePropagate(); },
                        disabled: isPropagating || !editableProject.trim(),
                        className: 'dgt-btn dgt-btn-primary',
                        style: {
                            backgroundColor: (isPropagating || !editableProject.trim()) ? 'var(--dgt-text-muted)' : 'var(--dgt-accent-green)',
                            padding: '6px 16px',
                            fontSize: '0.8125rem',
                            cursor: 'pointer'
                        }
                    }, isPropagating ? '⏳ Sincronizando...' : `Sincronizar Rama (${totalProblematic})`)
                )
            )
        );
    };

    const renderBranchesNodeContent = (node, depth) => {
        if (!node.questions || node.questions.length === 0) return null;

        // Agrupar QUEs por página contenedora
        const groupMap = new Map();
        for (const result of node.questions) {
            const key = result.containerPage?.uid || '(sin página contenedora)';
            if (!groupMap.has(key)) {
                groupMap.set(key, { containerPage: result.containerPage || null, questions: [] });
            }
            groupMap.get(key).questions.push(result);
        }

        return React.createElement('div', null,
            Array.from(groupMap.entries()).map(([key, group]) => {
                const cp = group.containerPage;
                const cStatus = cp?.containerStatus || 'no_container';
                const meta = CONTAINER_STATUS_META[cStatus] || CONTAINER_STATUS_META.no_container;
                const shortTitle = cp ? getContainerShortTitle(cp.title) : '(sin página contenedora)';
                const projLabel = cp?.project ? `  ·  ${cp.project}` : '';
                const leftPad = `${0.75 + (depth + 1) * 0.75}rem`;

                return React.createElement('div', { key },
                    // Cabecera de la página contenedora
                    React.createElement('div', {
                        style: {
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: `0.35rem 0.75rem 0.35rem ${leftPad}`,
                            borderBottom: '1px solid var(--dgt-border-color)',
                            backgroundColor: 'var(--dgt-bg-secondary)',
                            borderLeft: `3px solid ${meta.color}`
                        },
                        title: `${meta.label}${cp ? '\n' + cp.title : ''}`
                    },
                        React.createElement('span', { style: { fontSize: '0.8rem' } }, meta.icon),
                        React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--dgt-text-primary)' } }, shortTitle),
                        React.createElement('span', { style: { fontSize: '0.65rem', color: 'var(--dgt-text-muted)', flex: 1 } }, projLabel),
                        React.createElement('span', { className: 'dgt-badge dgt-badge-neutral', style: { fontSize: '0.65rem' } },
                            `${group.questions.length} QUE${group.questions.length !== 1 ? 's' : ''}`),
                        cp && React.createElement('button', {
                            onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                            title: `Ir a: ${cp.title}`,
                            style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' }
                        }, '→')
                    ),
                    // Filas de QUEs dentro de este grupo
                    group.questions.map(result => renderQueRow(result, depth))
                );
            })
        );
    };

    // --- Badge Component ---
    const Badge = ({ emoji, count, label, type = 'neutral', onClick, isActive, title }) => {
        const baseClass = `dgt-badge dgt-badge-${type}`;
        const activeClass = isActive ? 'active' : '';
        const clickableClass = onClick ? 'clickable' : '';
        return React.createElement('span', {
            onClick: onClick,
            title: title || label,
            className: `${baseClass} ${activeClass} ${clickableClass}`.trim()
        }, `${emoji} ${count}`);
    };

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header: título + botón procesar
        React.createElement('div', {
            className: 'dgt-flex-row dgt-gap-sm dgt-mb-sm',
            style: { alignItems: 'center' }
        },
            React.createElement('h3', { className: 'dgt-mb-0', style: { fontSize: '1.125rem' } }, 'Coherencia de Ramas'),
            React.createElement('button', {
                onClick: handleBulkVerifyAll,
                title: 'Procesar y verificar coherencia de todas las ramas',
                disabled: isBulkVerifying,
                style: { minWidth: '120px' },
                className: 'dgt-btn dgt-btn-primary'
            }, isBulkVerifying ? (verificationProgress.total > 0 ? `⏳ (${verificationProgress.current}/${verificationProgress.total})` : '⏳ Iniciando...') : '🔄 Procesar')
        ),

        // --- Favorites Bar ---
        React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: 'var(--dgt-bg-secondary)',
                border: '1px solid var(--dgt-border-color)',
                borderRadius: 'var(--dgt-radius-md)',
                flexWrap: 'wrap',
                fontSize: '0.8125rem'
            }
        },
            React.createElement('span', { style: { fontWeight: 600, fontSize: '0.75rem', color: 'var(--dgt-text-secondary)', whiteSpace: 'nowrap' } }, '⭐ Favoritos:'),
            favorites.length === 0 && React.createElement('span', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-muted)' } }, '(guarda tu selección actual)'),
            favorites.map(function (fav) {
                var isActive = isFavoriteActive(fav);
                return React.createElement('span', {
                    key: fav.id,
                    onClick: function () { handleApplyFavorite(fav); },
                    title: fav.name + (isActive ? ' (activo)' : ''),
                    style: {
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: isActive ? 'var(--dgt-accent-green)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--dgt-text-primary)',
                        border: '1px solid ' + (isActive ? 'var(--dgt-accent-green)' : 'var(--dgt-border-color)'),
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                    }
                },
                    React.createElement('span', { style: { fontWeight: isActive ? 600 : 400 } }, '🔖'),
                    React.createElement('span', {
                        style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        title: fav.name
                    }, fav.name),
                    React.createElement('span', {
                        onClick: function (e) { handleDeleteFavorite(fav.id, fav.name, e); },
                        style: { cursor: 'pointer', opacity: 0.6, marginLeft: '2px', fontSize: '0.65rem', color: isActive ? '#fff' : 'var(--dgt-text-muted)' },
                        title: 'Eliminar favorito'
                    }, '✕')
                );
            }),
            React.createElement('button', {
                onClick: handleSaveFavorite,
                title: 'Guardar selección actual como favorito (nombre generado por namespace)',
                style: {
                    background: 'transparent', border: '1px dashed var(--dgt-border-color)',
                    borderRadius: '12px', padding: '2px 10px', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--dgt-text-secondary)'
                }
            }, '+ Guardar')
        ),

        // Barra de resumen con badges y status
        (bulkVerificationResults.length > 0 || bulkVerifyStatus) && React.createElement('div', { className: 'dgt-summary-bar' },
            // Badges — cada uno en su propio wrapper
            bulkVerificationResults.length > 0 && React.createElement('div', {
                className: 'dgt-flex-row dgt-gap-xs dgt-flex-wrap'
            },
                React.createElement(Badge, { emoji: '✅', count: counts.coherent, type: 'success', title: 'Nodos Coherentes' }),
                // 🏛️ Desalineamiento de página contenedora — wrapper con popover
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '🏛️', count: counts.containerMismatch, type: 'warning',
                        title: 'Clic para ver QUEs con proyecto desalineado respecto a su página contenedora',
                        onClick: counts.containerMismatch > 0 ? () => setOpenPopover(openPopover === 'container' ? null : 'container') : undefined,
                        className: counts.containerMismatch > 0 ? 'clickable' : ''
                    }),
                    openPopover === 'container' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `🏛️ ${counts.containerMismatch} con página contenedora desalineada`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults
                            .filter(r => r.containerPage?.containerStatus === 'mismatched' || r.containerPage?.containerStatus === 'no_project')
                            .map(r => {
                                const cp = r.containerPage;
                                const suffix = DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX;
                                const base = cp.title && cp.title.endsWith(suffix) ? cp.title.slice(0, -suffix.length) : (cp.title || '');
                                const shortName = base.split('/').pop() || base;
                                const queTitle = r.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, '');
                                const statusLabel = cp.containerStatus === 'no_project' ? '(sin proyecto en contenedor)' : `(contenedor: ${cp.project || '?'})`;
                                
                                const queUid = r.question.pageUid;
                                const queProject = r.coherence.rootProject;
                                const containerProject = cp.project;
                                const containerUid = cp.uid;
                                const sharedCount = bulkVerificationResults.filter(res => res.containerPage && res.containerPage.uid === containerUid).length;

                                return React.createElement('div', { key: r.question.pageUid, className: 'dgt-popover-item', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '6px' } },
                                    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', width: '100%' } },
                                        React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { flexShrink: 0 } }, '🏛️'),
                                        React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, fontWeight: 600 }, title: queTitle }, queTitle),
                                        React.createElement('button', {
                                            onClick: (e) => { e.stopPropagation(); handleNavigateToPage(cp.uid); },
                                            className: 'dgt-btn dgt-btn-primary dgt-text-xs',
                                            style: { padding: '2px 6px', flexShrink: 0, cursor: 'pointer' },
                                            title: `Ir a: ${cp.title}`
                                        }, '→')
                                    ),
                                    React.createElement('span', { className: 'dgt-text-muted', style: { fontSize: '0.65rem', paddingLeft: '2px' } },
                                        `${shortName} ${statusLabel} · QUE: ${queProject || '(sin proyecto)'}`
                                    ),
                                    React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs dgt-flex-wrap', style: { width: '100%', marginTop: '6px', gap: '6px', display: 'flex' } },
                                        // Botón: Propagar al contenedor
                                        (cp.containerStatus === 'no_project' && queProject) && React.createElement('button', {
                                            className: 'dgt-btn dgt-text-xs',
                                            disabled: isPropagating,
                                            style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                            title: `Asignar el proyecto de la QUE ("${queProject}") al contenedor.`,
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleFixContainerAlignment(
                                                    queUid,
                                                    containerUid,
                                                    queProject,
                                                    `¿Asignar el proyecto "${queProject}" de la QUE a la página contenedora?`,
                                                    false
                                                );
                                            }
                                        }, 'Propagar al contenedor'),

                                        // Botón: Heredar del contenedor (cuando la QUE no tiene proyecto)
                                        (cp.containerStatus === 'mismatched' && !queProject && containerProject) && React.createElement('button', {
                                            className: 'dgt-btn dgt-text-xs',
                                            disabled: isPropagating,
                                            style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                            title: `Asignar el proyecto del contenedor ("${containerProject}") a la QUE.`,
                                            onClick: (e) => {
                                                e.stopPropagation();
                                                handleFixContainerAlignment(
                                                    queUid,
                                                    queUid,
                                                    containerProject,
                                                    `¿Asignar el proyecto del contenedor ("${containerProject}") a esta QUE?`,
                                                    true
                                                 );
                                            }
                                        }, 'Heredar del contenedor'),

                                        // Botones bidireccionales cuando ambos tienen proyecto pero son diferentes
                                        (cp.containerStatus === 'mismatched' && queProject && containerProject) && React.createElement(React.Fragment, null,
                                            React.createElement('button', {
                                                className: 'dgt-btn dgt-text-xs',
                                                disabled: isPropagating,
                                                style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                                title: `Cambiar el proyecto de la QUE a "${containerProject}" (contenedor). Esto cambia el proyecto raíz de toda la rama.`,
                                                onClick: (e) => {
                                                     e.stopPropagation();
                                                     handleFixContainerAlignment(
                                                         queUid,
                                                         queUid,
                                                         containerProject,
                                                         `¿Cambiar el proyecto de la QUE de "${queProject}" a "${containerProject}"?\nEsto afectará a toda la rama y sus nodos hijos podrían necesitar re-sincronización.`,
                                                         true
                                                     );
                                                }
                                            }, 'QUE ← Contenedor'),
                                            React.createElement('button', {
                                                className: 'dgt-btn dgt-text-xs',
                                                disabled: isPropagating,
                                                style: { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'var(--dgt-bg-secondary)', border: '1px solid var(--dgt-border-color)' },
                                                title: `Cambiar el proyecto del contenedor a "${queProject}" (QUE). Este contenedor es compartido por ${sharedCount} QUE(s).`,
                                                onClick: (e) => {
                                                     e.stopPropagation();
                                                     handleFixContainerAlignment(
                                                         queUid,
                                                         containerUid,
                                                         queProject,
                                                         `¿Cambiar el proyecto del contenedor de "${containerProject}" a "${queProject}"?\nAdvertencia: Este contenedor es compartido por ${sharedCount} QUE(s) en la vista de verificación.`,
                                                         false
                                                     );
                                                }
                                            }, 'Contenedor ← QUE')
                                         )
                                     )
                                 );
                             })
                    )
                ),
                // ⚠️ Diferente — wrapper propio con popover
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '⚠️', count: counts.different, type: 'warning', title: 'Clic para filtrar árbol | Doble clic popover',
                        onClick: () => setActiveFilter(activeFilter === 'different' ? null : 'different'),
                        isActive: activeFilter === 'different'
                    }),
                    openPopover === 'different' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `⚠️ ${counts.different} con proyecto diferente`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults.flatMap(r => r.coherence.different.map(node =>
                            React.createElement('div', { key: node.uid, className: 'dgt-popover-item', title: node.title },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { flexShrink: 0 } }, node.type),
                                React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, display: 'block' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1')),
                                React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 } }, '→')
                            )
                        ))
                    )
                ),
                // ❌ Sin proyecto — wrapper propio con popover (hermano, no anidado)
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement(Badge, {
                        emoji: '❌', count: counts.missing, type: 'error', title: 'Clic para filtrar árbol | Doble clic popover',
                        onClick: () => setActiveFilter(activeFilter === 'missing' ? null : 'missing'),
                        isActive: activeFilter === 'missing'
                    }),
                    openPopover === 'missing' && React.createElement('div', { className: 'dgt-popover dgt-scrollable' },
                        React.createElement('div', { className: 'dgt-popover-header' },
                            React.createElement('span', null, `❌ ${counts.missing} sin proyecto`),
                            React.createElement('button', { onClick: () => setOpenPopover(null), className: 'dgt-btn-ghost dgt-text-sm', style: { border: 'none', cursor: 'pointer', padding: 0 } }, '✕')
                        ),
                        bulkVerificationResults.flatMap(r => r.coherence.missing.map(node =>
                            React.createElement('div', { key: node.uid, className: 'dgt-popover-item', title: node.title },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-error', style: { flexShrink: 0 } }, node.type),
                                React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1, minWidth: 0, display: 'block' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1')),
                                React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 } }, '→')
                            )
                        ))
                    )
                )
            ),
            // Status text
            bulkVerifyStatus && React.createElement('span', {
                className: `dgt-text-xs dgt-text-bold ${bulkVerifyStatus.includes('✅') ? 'dgt-text-success' :
                    bulkVerifyStatus.includes('⚠️') ? 'dgt-text-warning' :
                        bulkVerifyStatus.includes('❌') ? 'dgt-text-error' : 'dgt-text-muted'
                    }`,
                title: 'Estatus'
            }, bulkVerifyStatus)
        ),

        // Vista de árbol jerárquico por proyectos (siempre visible para poder filtrar)
        React.createElement('div', { className: 'dgt-mb-sm dgt-flex-column', style: { flex: 1, minHeight: 0, border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-md)', overflow: 'hidden' } },
            // Checkbox "Seleccionar todos"
            React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm', style: { alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--dgt-border-color)', backgroundColor: 'var(--dgt-bg-secondary)' } },
                React.createElement('input', {
                    type: 'checkbox',
                    id: 'selectAllProjectsBranches',
                    checked: selectedProjects.size >= allProjectsPathsSet.size,
                    onChange: handleToggleSelectAll,
                    style: { margin: 0, cursor: 'pointer' }
                }),
                React.createElement('label', { htmlFor: 'selectAllProjectsBranches', style: { cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, margin: 0, userSelect: 'none', color: 'var(--dgt-text-primary)' } }, 'Seleccionar / Deseleccionar todos los proyectos')
            ),
            React.createElement('div', {
                className: 'dgt-tree-container',
                style: { border: 'none', borderRadius: 0, flex: 1 }
            },
                React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                    tree: projectTree,
                    renderNodeHeader: renderBranchesNodeHeader,
                    renderNodeContent: renderBranchesNodeContent,
                    defaultExpanded: activeFilter !== null // Auto expandir si hay un filtro
                })
            )
        ),
        
        // Nuevo Overlay Flotante
        selectedBulkQuestion && renderQueResolutionOverlay()
    );
};
