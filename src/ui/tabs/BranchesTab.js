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

    // --- Estado para popover (mantener para resumen) y Filtro de Árbol ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | null
    const [activeFilter, setActiveFilter] = React.useState(null); // 'different' | 'missing' | null
    const [showProjectFilter, setShowProjectFilter] = React.useState(false);

    const allProjects = React.useMemo(() => DiscourseGraphToolkit.getProjects(), []);
    
    // Función para alternar la selección de un proyecto individual y sus subproyectos
    const handleToggleProjectSelect = (project, isSelected) => {
        const newSelected = new Set(selectedProjects);
        const toggleRecursive = (proj, select) => {
            if (select) newSelected.add(proj);
            else newSelected.delete(proj);
            
            // Alternar también todos los subproyectos
            const prefix = proj + '/';
            for (const p of allProjects) {
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
        if (selectedProjects.size >= allProjects.length + 1) { 
            setSelectedProjects(new Set());
        } else {
            setSelectedProjects(new Set(['(sin proyecto)', ...allProjects]));
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
        missing: bulkVerificationResults.flatMap(r => r.coherence.missing).length
    }), [bulkVerificationResults]);

    // --- Helpers (shared) ---
    const parseMarkdownBold = DiscourseGraphToolkit.parseMarkdownBold;
    const handleNavigateToPage = DiscourseGraphToolkit.navigateToPage;

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

            // Aplicar el filtro
            const filteredQuestions = allQuestions.filter(q => {
                const proj = projectMap.get(q.pageUid) || '(sin proyecto)';
                return selectedProjects.has(proj);
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

                results.push({
                    question: q,
                    branchNodes,
                    coherence: cohResult,
                    status
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

    const refreshSelectedQuestion = async () => {
        setBulkVerifyStatus(`✅ Completado. Sincronizando con Roam...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        setBulkVerifyStatus(`✅ Refrescando datos...`);
        const branchNodes = await DiscourseGraphToolkit.getBranchNodes(selectedBulkQuestion.question.pageUid);
        const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(selectedBulkQuestion.question.pageUid, branchNodes);

        let status = 'coherent';
        if (cohResult.missing.length > 0) status = 'missing';
        else if (cohResult.different.length > 0) status = 'different';
        else if (cohResult.specialized.length > 0) status = 'specialized';

        const updatedResult = { ...selectedBulkQuestion, branchNodes, coherence: cohResult, status };
        const updatedResults = bulkVerificationResults.map(r =>
            r.question.pageUid === selectedBulkQuestion.question.pageUid ? updatedResult : r
        );
        setBulkVerificationResults(updatedResults);
        setSelectedBulkQuestion(updatedResult);
        const statusMsg = `✅ Propagación completada.`;
        setBulkVerifyStatus(statusMsg);
        DiscourseGraphToolkit.saveVerificationCache(updatedResults, statusMsg);
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
                // Indicadores de error visuales en la carpeta
                (miss > 0 || diff > 0) && React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs', style: { marginLeft: 'auto' } },
                    miss > 0 && React.createElement('span', { title: `${miss} ramas sin proyecto`, style: { fontSize: '0.75rem' } }, '❌'),
                    diff > 0 && React.createElement('span', { title: `${diff} ramas con proyecto diferente`, style: { fontSize: '0.75rem' } }, '⚠️')
                ),
                // Contador total
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral'
                }, `${totalQuestions} rama${totalQuestions !== 1 ? 's' : ''}`)
            )
        );
    };

    const renderBranchesNodeContent = (node, depth) => {
        if (!node.questions || node.questions.length === 0) return null;

        return React.createElement('div', null,
            node.questions.map(result =>
                React.createElement('div', {
                    key: result.question.pageUid,
                    onClick: (e) => { e.stopPropagation(); handleBulkSelectQuestion(result); },
                    className: 'dgt-flex-row dgt-text-sm',
                    style: {
                        padding: '0.6rem 0.75rem',
                        paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                        borderBottom: '1px solid var(--dgt-border-color)',
                        cursor: 'pointer',
                        backgroundColor: selectedBulkQuestion?.question.pageUid === result.question.pageUid ? 'var(--dgt-bg-secondary)' : 'transparent',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                    }
                },
                    React.createElement('span', { style: { fontSize: '0.875rem', flexShrink: 0, marginTop: '1px' }, title: result.status },
                        (result.status === 'coherent' || result.status === 'specialized') ? '✅' : result.status === 'different' ? '⚠️' : '❌'),
                    React.createElement('div', { className: 'dgt-flex-column', style: { flex: 1, gap: '0.25rem' } },
                        React.createElement('div', { className: 'dgt-text-primary', style: { lineHeight: '1.4' } },
                            parseMarkdownBold(result.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, ''))),
                        React.createElement('span', { className: 'dgt-text-secondary', style: { fontSize: '0.6875rem' } },
                            `${result.branchNodes.length} nodos`)
                    )
                )
            )
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

        // Barra de resumen con badges y status
        (bulkVerificationResults.length > 0 || bulkVerifyStatus) && React.createElement('div', { className: 'dgt-summary-bar' },
            // Badges — cada uno en su propio wrapper
            bulkVerificationResults.length > 0 && React.createElement('div', {
                className: 'dgt-flex-row dgt-gap-xs dgt-flex-wrap'
            },
                React.createElement(Badge, { emoji: '✅', count: counts.coherent, type: 'success', title: 'Nodos Coherentes' }),
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
        React.createElement('div', { className: 'dgt-mb-sm', style: { flex: 1, minHeight: 0 } },
            React.createElement('div', {
                className: 'dgt-tree-container'
            },
                React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                    tree: projectTree,
                    renderNodeHeader: renderBranchesNodeHeader,
                    renderNodeContent: renderBranchesNodeContent,
                    defaultExpanded: activeFilter !== null // Auto expandir si hay un filtro
                })
            )
        ),

        // Panel de detalle (más compacto)
        selectedBulkQuestion && React.createElement('div', { className: 'dgt-card dgt-card-body' },
            React.createElement('h4', { className: 'dgt-mb-sm', style: { margin: 0, fontSize: '0.875rem', lineHeight: '1.4' } },
                parseMarkdownBold(selectedBulkQuestion.question.pageTitle.replace(/\[\[(QUE|GRI)\]\] - /, ''))),

            // Proyecto editable y botón de propagar unificado
            React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm dgt-mb-md', style: { alignItems: 'center', marginTop: '0.5rem' } },
                React.createElement('span', { className: 'dgt-text-sm dgt-text-bold', style: { flexShrink: 0 } }, 'Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    className: 'dgt-input',
                    style: { flex: 1, minWidth: '10rem', padding: '6px 10px', fontSize: '0.875rem' }
                }),
                (() => {
                    const totalProblematic = selectedBulkQuestion.coherence.different.length + selectedBulkQuestion.coherence.missing.length;
                    return totalProblematic > 0 && React.createElement('button', {
                        onClick: handlePropagate,
                        disabled: isPropagating || !editableProject.trim(),
                        className: 'dgt-btn dgt-btn-primary',
                        title: 'Aplica el proyecto de los padres y corrige ramas sin proyecto automáticamente.',
                        style: {
                            backgroundColor: (isPropagating || !editableProject.trim()) ? 'var(--dgt-text-muted)' : 'var(--dgt-accent-green)',
                            flexShrink: 0,
                            padding: '6px 12px'
                        }
                    }, isPropagating ? '⏳ Propagando...' : `🔄 Propagar (${totalProblematic})`);
                })()
            ),

            // Lista de nodos problemáticos con layout mejorado
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { className: 'dgt-list-container dgt-scrollable', style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-md)' } },
                // Sección: Proyecto Diferente
                selectedBulkQuestion.coherence.different.length > 0 && React.createElement('details', { open: true, style: { borderBottom: selectedBulkQuestion.coherence.missing.length > 0 ? '1px solid var(--dgt-border-color)' : 'none' } },
                    React.createElement('summary', { className: 'dgt-p-sm dgt-bg-secondary dgt-text-sm', style: { cursor: 'pointer', userSelect: 'none', fontWeight: '500' } }, 
                        `⚠️ Diferencias de proyecto (${selectedBulkQuestion.coherence.different.length})`
                    ),
                    React.createElement('div', { className: 'dgt-p-0' },
                        selectedBulkQuestion.coherence.different.map((node, i, arr) =>
                            React.createElement('div', { 
                                key: node.uid, 
                                className: 'dgt-flex-row dgt-p-xs dgt-popover-item', 
                                style: { alignItems: 'center', gap: '0.5rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' },
                                title: `Debería heredar: ${node.parentProject}\nTiene: ${node.project}`
                            },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { flexShrink: 0, fontSize: '0.65rem' } }, node.type),
                                React.createElement('div', { className: 'dgt-text-sm dgt-text-primary dgt-text-truncate', style: { flex: 1, paddingRight: '4px' } }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                                React.createElement('button', {
                                    onClick: () => handleNavigateToPage(node.uid),
                                    className: 'dgt-btn dgt-btn-ghost dgt-text-xs', style: { padding: '2px 8px', flexShrink: 0, border: '1px solid var(--dgt-border-color)' }
                                }, '→ Ir')
                            )
                        )
                    )
                ),
                // Sección: Sin Proyecto
                selectedBulkQuestion.coherence.missing.length > 0 && React.createElement('details', { open: true },
                    React.createElement('summary', { className: 'dgt-p-sm dgt-bg-secondary dgt-text-sm', style: { cursor: 'pointer', userSelect: 'none', fontWeight: '500' } }, 
                        `❌ Sin proyecto (${selectedBulkQuestion.coherence.missing.length})`
                    ),
                    React.createElement('div', { className: 'dgt-p-0' },
                        selectedBulkQuestion.coherence.missing.map((node, i, arr) =>
                            React.createElement('div', { 
                                key: node.uid, 
                                className: 'dgt-flex-row dgt-p-xs dgt-popover-item', 
                                style: { alignItems: 'center', gap: '0.5rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' },
                                title: node.parentProject ? `Debería heredar: ${node.parentProject}` : ''
                            },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-error', style: { flexShrink: 0, fontSize: '0.65rem' } }, node.type),
                                React.createElement('div', { className: 'dgt-text-sm dgt-text-primary dgt-text-truncate', style: { flex: 1, paddingRight: '4px' } }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                                React.createElement('button', {
                                    onClick: () => handleNavigateToPage(node.uid),
                                    className: 'dgt-btn dgt-btn-ghost dgt-text-xs', style: { padding: '2px 8px', flexShrink: 0, border: '1px solid var(--dgt-border-color)' }
                                }, '→ Ir')
                            )
                        )
                    )
                )
            )
        )
    );
};
