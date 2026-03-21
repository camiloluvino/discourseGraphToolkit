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
        isPropagating, setIsPropagating
    } = DiscourseGraphToolkit.useBranches();

    // --- Estado para popover (mantener para resumen) y Filtro de Árbol ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | null
    const [activeFilter, setActiveFilter] = React.useState(null); // 'different' | 'missing' | null

    // --- Árbol jerárquico (calculado y filtrado) ---
    const projectTree = React.useMemo(() => {
        if (bulkVerificationResults.length === 0) return {};
        const baseTree = DiscourseGraphToolkit.buildProjectTree(bulkVerificationResults);

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

        // Función para filtrar el árbol manteniendo la estructura
        const filterTreeRecursive = (treeNodes) => {
            const filtered = {};
            for (const key in treeNodes) {
                const node = treeNodes[key];
                const hasError = nodeHasErrorStatus(node, activeFilter);

                if (hasError) {
                    // Si este nodo tiene el error, debemos incluirlo
                    filtered[key] = { ...node };
                    // Filtrar recursivamente sus hijos
                    if (node.children) {
                        const filteredChildren = filterTreeRecursive(node.children);
                        // Si los hijos no tienen el error, pero el padre sí (por una pregunta directa del padre), 
                        // mantenemos los hijos vacíos o lo que devuelva el filtro. En este caso, solo nos quedamos 
                        // con lo estrictamente necesario.
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

    }, [bulkVerificationResults, activeFilter]);

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

        try {
            const questions = await DiscourseGraphToolkit.getAllRootNodes();
            const results = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${questions.length}...`);

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

    const handleBulkPropagateProject = async () => {
        if (!selectedBulkQuestion || !editableProject.trim()) {
            return;
        }

        const nodesToUpdate = [
            ...selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization'),
            ...selectedBulkQuestion.coherence.missing
        ];
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
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const handlePropagateFromParents = async () => {
        if (!selectedBulkQuestion) return;

        const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
        if (generalizations.length === 0) return;

        setIsPropagating(true);
        setBulkVerifyStatus(`⏳ Heredando proyectos de padres para ${generalizations.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateFromParents(generalizations);

            if (result.success) {
                await refreshSelectedQuestion();
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
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
                className: 'dgt-btn dgt-btn-primary'
            }, isBulkVerifying ? '⏳...' : '🔄 Procesar')
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

        // Vista de árbol jerárquico por proyectos (más altura)
        bulkVerificationResults.length > 0 && React.createElement('div', { className: 'dgt-mb-sm', style: { flex: 1, minHeight: 0 } },
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

            // Proyecto editable y botones de propagación
            React.createElement('div', { className: 'dgt-form-group' },
                React.createElement('span', { className: 'dgt-form-label' }, 'Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    className: 'dgt-input',
                    style: { flex: 1, minWidth: '10rem' }
                })
            ),

            // Botones de propagación (separados por tipo de error)
            React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm dgt-flex-wrap dgt-mb-sm' },
                // Botón 1: Propagar raíz
                (() => {
                    const nonGeneralizations = selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization');
                    const count = nonGeneralizations.length + selectedBulkQuestion.coherence.missing.length;
                    return count > 0 && React.createElement('button', {
                        onClick: handleBulkPropagateProject,
                        disabled: isPropagating || !editableProject.trim(),
                        className: 'dgt-btn dgt-btn-primary',
                        style: {
                            backgroundColor: (isPropagating || !editableProject.trim()) ? 'var(--dgt-text-muted)' : 'var(--dgt-accent-green)'
                        }
                    }, isPropagating ? '⏳...' : `🔄 Propagar raíz (${count})`);
                })(),

                // Botón 2: Heredar de padres
                (() => {
                    const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
                    return generalizations.length > 0 && React.createElement('button', {
                        onClick: handlePropagateFromParents,
                        disabled: isPropagating,
                        className: 'dgt-btn dgt-btn-secondary'
                    }, isPropagating ? '⏳...' : `⬆️ Heredar de padres (${generalizations.length})`);
                })()
            ),

            // Resumen compacto
            React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm dgt-mb-sm dgt-flex-wrap' },
                React.createElement('span', { className: 'dgt-badge dgt-badge-success', title: 'Coherentes y Especializados' },
                    `✅ ${selectedBulkQuestion.coherence.coherent.length + selectedBulkQuestion.coherence.specialized.length}`),
                React.createElement('span', { className: 'dgt-badge dgt-badge-warning' },
                    `⚠️ ${selectedBulkQuestion.coherence.different.length}`),
                React.createElement('span', { className: 'dgt-badge dgt-badge-error' },
                    `❌ ${selectedBulkQuestion.coherence.missing.length}`)
            ),

            // Lista de nodos problemáticos
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { className: 'dgt-list-container dgt-scrollable dgt-p-sm' },
                selectedBulkQuestion.coherence.different.map(node =>
                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                        React.createElement('span', { className: 'dgt-text-warning dgt-text-sm', style: { flexShrink: 0 } }, '⚠️'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { className: 'dgt-badge dgt-badge-warning dgt-mr-xs' }, node.type),
                            React.createElement('div', { className: 'dgt-text-xs dgt-text-primary' }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                            React.createElement('div', { className: 'dgt-text-secondary dgt-mt-sm', style: { fontSize: '0.625rem' } },
                                React.createElement('span', null, `Debería heredar: ${node.parentProject}`),
                                React.createElement('span', { style: { marginLeft: '0.5rem' } }, `Tiene: ${node.project}`)
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 }
                        }, '→ Ir')
                    )
                ),
                selectedBulkQuestion.coherence.missing.map(node =>
                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                        React.createElement('span', { className: 'dgt-text-error dgt-text-sm', style: { flexShrink: 0 } }, '❌'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { className: 'dgt-badge dgt-badge-error dgt-mr-xs' }, node.type),
                            React.createElement('div', { className: 'dgt-text-xs dgt-text-primary' }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                            node.parentProject && React.createElement('div', { className: 'dgt-text-secondary dgt-mt-sm', style: { fontSize: '0.625rem' } },
                                `Debería heredar: ${node.parentProject}`
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '2px 6px', flexShrink: 0 }
                        }, '→ Ir')
                    )
                )
            )
        )
    );
};
