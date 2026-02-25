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
        orphanResults, setOrphanResults,
        isSearchingOrphans, setIsSearchingOrphans
    } = DiscourseGraphToolkit.useToolkit();

    // --- Estado para popover de nodos problemáticos ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | 'orphans' | null

    // --- Árbol jerárquico (calculado) ---
    const projectTree = React.useMemo(() => {
        if (bulkVerificationResults.length === 0) return {};
        return DiscourseGraphToolkit.buildProjectTree(bulkVerificationResults);
    }, [bulkVerificationResults]);

    // --- Contadores ---
    const counts = React.useMemo(() => ({
        coherent: bulkVerificationResults.filter(r => r.status === 'coherent').length,
        specialized: bulkVerificationResults.filter(r => r.status === 'specialized').length,
        different: bulkVerificationResults.flatMap(r => r.coherence.different).length,
        missing: bulkVerificationResults.flatMap(r => r.coherence.missing).length,
        orphans: orphanResults.length
    }), [bulkVerificationResults, orphanResults]);

    // --- Helpers ---
    const parseMarkdownBold = (text) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return React.createElement('strong', { key: index }, part.slice(2, -2));
            }
            return part;
        });
    };

    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
            DiscourseGraphToolkit.minimizeModal();
        } catch (e) {
            console.error("Error navigating to page:", e);
            window.open(`https://roamresearch.com/#/app/${DiscourseGraphToolkit.getGraphName()}/page/${uid}`, '_blank');
        }
    };

    // --- Handlers ---
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
            const coherent = results.filter(r => r.status === 'coherent').length;
            const specialized = results.filter(r => r.status === 'specialized').length;
            const different = results.filter(r => r.status === 'different').length;
            const missing = results.filter(r => r.status === 'missing').length;
            const statusMsg = `✅ ${coherent} coherentes, ${specialized} esp., ${different} dif., ${missing} sin proy.`;
            setBulkVerifyStatus(statusMsg);
            DiscourseGraphToolkit.saveVerificationCache(results, statusMsg);

            // Refrescar huérfanos si ya se habían buscado previamente
            if (orphanResults.length > 0) {
                setBulkVerifyStatus(`${statusMsg} ⏳ Actualizando huérfanos...`);
                const orphans = await DiscourseGraphToolkit.findOrphanNodes();
                setOrphanResults(orphans);
                setBulkVerifyStatus(`${statusMsg} 👻 ${orphans.length} huérfanos.`);
            }
        } catch (e) {
            console.error('Bulk verification error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsBulkVerifying(false);
        }
    };

    const handleFindOrphans = async () => {
        setIsSearchingOrphans(true);
        setBulkVerifyStatus('⏳ Buscando huérfanos...');
        try {
            const orphans = await DiscourseGraphToolkit.findOrphanNodes();
            setOrphanResults(orphans);
            setBulkVerifyStatus(`✅ Encontrados ${orphans.length} huérfanos.`);
        } catch (e) {
            console.error('Orphan search error:', e);
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsSearchingOrphans(false);
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

        return React.createElement('div', {
            onClick: toggleFn,
            className: `dgt-accordion-header ${depthClass}`
        },
            React.createElement('span', { style: { color: 'var(--dgt-text-muted)', fontSize: '0.75rem', width: '16px', textAlign: 'center' } },
                hasChildren ? (isExpanded ? '▼' : '▶') : '•'),
            React.createElement('div', { style: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' } },
                React.createElement('span', { title: node.project },
                    node.project ? node.project.split('/').pop() : '(sin proyecto)'),
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral'
                }, `${totalQuestions} pregunta${totalQuestions !== 1 ? 's' : ''}`)
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
                    style: {
                        padding: '0.6rem 0.75rem',
                        paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                        borderBottom: '1px solid var(--dgt-border-color)',
                        cursor: 'pointer',
                        backgroundColor: selectedBulkQuestion?.question.pageUid === result.question.pageUid ? 'var(--dgt-bg-secondary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        fontSize: '0.8125rem'
                    }
                },
                    React.createElement('span', { style: { fontSize: '0.875rem', flexShrink: 0, marginTop: '1px' } },
                        result.status === 'coherent' ? '✅' : result.status === 'specialized' ? '🔀' : result.status === 'different' ? '⚠️' : '❌'),
                    React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' } },
                        React.createElement('div', { style: { lineHeight: '1.4', color: 'var(--dgt-text-primary)' } },
                            parseMarkdownBold(result.question.pageTitle.replace('[[QUE]] - ', ''))),
                        React.createElement('span', { style: { fontSize: '0.6875rem', color: 'var(--dgt-text-secondary)' } },
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
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        // Header compacto con badges a la derecha
        React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                gap: '1rem',
                flexWrap: 'wrap'
            }
        },
            // Lado izquierdo: título y botones
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
                React.createElement('h3', { style: { margin: 0, fontSize: '1.125rem' } }, 'Coherencia de Ramas'),
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                    React.createElement('button', {
                        onClick: handleBulkVerifyAll,
                        title: 'Procesar y verificar coherencia de todas las ramas',
                        disabled: isBulkVerifying,
                        className: 'dgt-btn dgt-btn-primary'
                    }, isBulkVerifying ? '⏳...' : '🔄 Procesar'),
                    React.createElement('button', {
                        onClick: handleFindOrphans,
                        title: 'Buscar ramas o nodos que no tienen un proyecto asignado',
                        disabled: isSearchingOrphans,
                        className: 'dgt-btn dgt-btn-secondary'
                    }, isSearchingOrphans ? '⏳...' : '👻 Ver Huérfanos')
                )
            ),
            // Lado derecho: badges y status
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' } },
                // Badges en línea
                bulkVerificationResults.length > 0 && React.createElement('div', {
                    style: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end', position: 'relative' }
                },
                    React.createElement(Badge, { emoji: '✅', count: counts.coherent, type: 'success', title: 'Nodos Coherentes' }),
                    React.createElement(Badge, { emoji: '🔀', count: counts.specialized, type: 'info', title: 'Nodos Especializados' }),
                    // Badge Diferente (clickeable)
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '⚠️', count: counts.different, type: 'warning', title: 'Nodos Diferentes',
                            onClick: () => counts.different > 0 && setOpenPopover(openPopover === 'different' ? null : 'different'),
                            isActive: openPopover === 'different'
                        }),
                        // Badge Sin proyecto (clickeable)
                        React.createElement('div', { style: { position: 'relative' } },
                            React.createElement(Badge, {
                                emoji: '❌', count: counts.missing, type: 'error', title: 'Nodos Sin Proyecto',
                                onClick: () => counts.missing > 0 && setOpenPopover(openPopover === 'missing' ? null : 'missing'),
                                isActive: openPopover === 'missing'
                            }),
                            // Popover Sin proyecto
                            openPopover === 'missing' && React.createElement('div', { className: 'dgt-popover' },
                                React.createElement('div', { className: 'dgt-popover-header' },
                                    React.createElement('span', null, `❌ ${counts.missing} sin proyecto`),
                                    React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--dgt-text-secondary)' } }, '✕')
                                ),
                                bulkVerificationResults.flatMap(r => r.coherence.missing.map(node =>
                                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                                        React.createElement('span', { className: 'dgt-badge dgt-badge-error' }, node.type),
                                        React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                        React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-primary', style: { padding: '2px 6px', fontSize: '0.625rem' } }, '→')
                                    )
                                ))
                            )
                        ),
                        // Badge Huérfanos (clickeable)
                        orphanResults.length > 0 && React.createElement('div', { style: { position: 'relative' } },
                            React.createElement(Badge, {
                                emoji: '👻', count: counts.orphans, type: 'neutral', title: 'Nodos Huérfanos',
                                onClick: () => setOpenPopover(openPopover === 'orphans' ? null : 'orphans'),
                                isActive: openPopover === 'orphans'
                            }),
                            // Popover Huérfanos
                            openPopover === 'orphans' && React.createElement('div', { className: 'dgt-popover' },
                                React.createElement('div', { className: 'dgt-popover-header' },
                                    React.createElement('span', null, `👻 ${counts.orphans} huérfanos`),
                                    React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--dgt-text-secondary)' } }, '✕')
                                ),
                                orphanResults.map(node =>
                                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                                        React.createElement('span', { className: 'dgt-badge dgt-badge-neutral' }, node.type),
                                        React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                        React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, className: 'dgt-btn dgt-btn-secondary', style: { padding: '2px 6px', fontSize: '0.625rem' } }, '→')
                                    )
                                )
                            )
                        )
                    )
                ),
                // Status compacto
                bulkVerifyStatus && React.createElement('span', {
                    style: {
                        fontSize: '0.75rem',
                        color: bulkVerifyStatus.includes('✅') ? (DiscourseGraphToolkit.THEME?.colors?.success || '#4CAF50') :
                            bulkVerifyStatus.includes('⚠️') ? (DiscourseGraphToolkit.THEME?.colors?.warning || '#ff9800') :
                                bulkVerifyStatus.includes('❌') ? (DiscourseGraphToolkit.THEME?.colors?.danger || '#f44336') : (DiscourseGraphToolkit.THEME?.colors?.neutral || '#666'),
                        fontWeight: '500'
                    }
                }, bulkVerifyStatus)
            )
        ),

        // Vista de árbol jerárquico por proyectos (más altura)
        bulkVerificationResults.length > 0 && React.createElement('div', { style: { flex: 1, minHeight: 0, marginBottom: '0.75rem' } },
            React.createElement('div', {
                style: { height: '100%', maxHeight: '28rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: '#fafafa' }
            },
                React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                    tree: projectTree,
                    renderNodeHeader: renderBranchesNodeHeader,
                    renderNodeContent: renderBranchesNodeContent,
                    defaultExpanded: true
                })
            )
        ),

        // Panel de detalle (más compacto)
        selectedBulkQuestion && React.createElement('div', { style: { border: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.primary || '#2196F3'}`, borderRadius: '0.25rem', padding: '0.75rem', backgroundColor: '#f8f9fa' } },
            React.createElement('h4', { style: { margin: '0 0 0.75rem 0', fontSize: '0.875rem', lineHeight: '1.4' } },
                parseMarkdownBold(selectedBulkQuestion.question.pageTitle.replace('[[QUE]] - ', ''))),

            // Proyecto editable y botones de propagación
            React.createElement('div', { style: { marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' } },
                React.createElement('span', { style: { fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8125rem' } }, 'Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    className: 'dgt-input',
                    style: { flex: 1, minWidth: '10rem' }
                })
            ),

            // Botones de propagación (separados por tipo de error)
            React.createElement('div', { style: { marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
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
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' } },
                React.createElement('span', { className: 'dgt-badge dgt-badge-success' },
                    `✅ ${selectedBulkQuestion.coherence.coherent.length}`),
                React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                    `🔀 ${selectedBulkQuestion.coherence.specialized.length}`),
                React.createElement('span', { className: 'dgt-badge dgt-badge-warning' },
                    `⚠️ ${selectedBulkQuestion.coherence.different.length}`),
                React.createElement('span', { className: 'dgt-badge dgt-badge-error' },
                    `❌ ${selectedBulkQuestion.coherence.missing.length}`)
            ),

            // Lista de nodos problemáticos
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { className: 'dgt-scrollable', style: { maxHeight: '10rem', overflowY: 'auto', border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', backgroundColor: '#ffffff' } },
                selectedBulkQuestion.coherence.different.map(node =>
                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                        React.createElement('span', { style: { color: 'var(--dgt-accent-yellow)', fontSize: '0.8125rem', flexShrink: 0 } }, '⚠️'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { marginRight: '0.375rem' } }, node.type),
                            React.createElement('div', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-primary)' } }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                            React.createElement('div', { style: { fontSize: '0.625rem', color: 'var(--dgt-text-secondary)', marginTop: '0.125rem' } },
                                React.createElement('span', null, `Debería heredar: ${node.parentProject}`),
                                React.createElement('span', { style: { marginLeft: '0.5rem' } }, `Tiene: ${node.project}`)
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            className: 'dgt-btn dgt-btn-primary', style: { padding: '2px 6px', fontSize: '0.625rem', flexShrink: 0 }
                        }, '→ Ir')
                    )
                ),
                selectedBulkQuestion.coherence.missing.map(node =>
                    React.createElement('div', { key: node.uid, className: 'dgt-popover-item' },
                        React.createElement('span', { style: { color: 'var(--dgt-accent-red)', fontSize: '0.8125rem', flexShrink: 0 } }, '❌'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { className: 'dgt-badge dgt-badge-error', style: { marginRight: '0.375rem' } }, node.type),
                            React.createElement('div', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-primary)' } }, parseMarkdownBold((node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, ''))),
                            node.parentProject && React.createElement('div', { style: { fontSize: '0.625rem', color: 'var(--dgt-text-secondary)', marginTop: '0.125rem' } },
                                `Debería heredar: ${node.parentProject}`
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            className: 'dgt-btn dgt-btn-primary', style: { padding: '2px 6px', fontSize: '0.625rem', flexShrink: 0 }
                        }, '→ Ir')
                    )
                )
            )
        )
    );
};
