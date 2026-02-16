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

        return React.createElement('div', {
            onClick: toggleFn,
            style: {
                padding: '0.5rem 0.75rem',
                backgroundColor: depth === 0 ? '#f0f0f0' : '#f8f8f8',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: depth === 0 ? 'bold' : '500'
            }
        },
            React.createElement('span', { style: { color: '#666', fontSize: '0.75rem' } },
                isExpanded ? '▼' : '▶'),
            React.createElement('span', null, '📁'),
            React.createElement('span', { style: { flex: 1 } },
                node.project || '(sin proyecto)'),
            React.createElement('span', {
                style: {
                    fontSize: '0.6875rem',
                    color: '#666',
                    backgroundColor: '#f5f5f5',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.1875rem'
                }
            }, `${totalQuestions} pregunta${totalQuestions !== 1 ? 's' : ''}`)
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
                        padding: '0.5rem 0.75rem',
                        paddingLeft: `${0.75 + (depth + 1) * 0.75}rem`,
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: selectedBulkQuestion?.question.pageUid === result.question.pageUid ? '#e3f2fd' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8125rem'
                    }
                },
                    React.createElement('span', { style: { fontSize: '0.875rem', flexShrink: 0 } },
                        result.status === 'coherent' ? '✅' : result.status === 'specialized' ? '🔀' : result.status === 'different' ? '⚠️' : '❌'),
                    React.createElement('span', { style: { flex: 1, lineHeight: '1.3' } },
                        result.question.pageTitle.replace('[[QUE]] - ', '')),
                    React.createElement('span', { style: { fontSize: '0.6875rem', color: '#999', whiteSpace: 'nowrap' } },
                        `${result.branchNodes.length} nodos`)
                )
            )
        );
    };

    // --- Badge Component ---
    const Badge = ({ emoji, count, label, bgColor, textColor, onClick, isActive }) => {
        return React.createElement('span', {
            onClick: onClick,
            style: {
                padding: '0.25rem 0.5rem',
                backgroundColor: bgColor,
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: textColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                cursor: onClick ? 'pointer' : 'default',
                border: isActive ? `2px solid ${textColor}` : '2px solid transparent',
                whiteSpace: 'nowrap'
            }
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
                React.createElement('h3', { style: { margin: 0, fontSize: '1.125rem' } }, '🌿 Coherencia de Ramas'),
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                    React.createElement('button', {
                        onClick: handleBulkVerifyAll,
                        disabled: isBulkVerifying,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: isBulkVerifying ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isBulkVerifying ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 'bold'
                        }
                    }, isBulkVerifying ? '⏳...' : '🔍 Verificar'),
                    React.createElement('button', {
                        onClick: handleFindOrphans,
                        disabled: isSearchingOrphans,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: isSearchingOrphans ? '#ccc' : '#9C27B0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isSearchingOrphans ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 'bold'
                        }
                    }, isSearchingOrphans ? '⏳...' : '👻 Huérfanos')
                )
            ),
            // Lado derecho: badges y status
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' } },
                // Badges en línea
                bulkVerificationResults.length > 0 && React.createElement('div', {
                    style: { display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end', position: 'relative' }
                },
                    React.createElement(Badge, { emoji: '✅', count: counts.coherent, bgColor: '#e8f5e9', textColor: '#4CAF50' }),
                    React.createElement(Badge, { emoji: '🔀', count: counts.specialized, bgColor: '#e3f2fd', textColor: '#2196F3' }),
                    // Badge Diferente (clickeable)
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '⚠️', count: counts.different, bgColor: '#fff3e0', textColor: '#ff9800',
                            onClick: () => counts.different > 0 && setOpenPopover(openPopover === 'different' ? null : 'different'),
                            isActive: openPopover === 'different'
                        }),
                        // Popover Diferente
                        openPopover === 'different' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #ff9800', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#fff3e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `⚠️ ${counts.different} nodos diferentes`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            bulkVerificationResults.flatMap(r => r.coherence.different.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            ))
                        )
                    ),
                    // Badge Sin proyecto (clickeable)
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '❌', count: counts.missing, bgColor: '#ffebee', textColor: '#f44336',
                            onClick: () => counts.missing > 0 && setOpenPopover(openPopover === 'missing' ? null : 'missing'),
                            isActive: openPopover === 'missing'
                        }),
                        // Popover Sin proyecto
                        openPopover === 'missing' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #f44336', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#ffebee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `❌ ${counts.missing} sin proyecto`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            bulkVerificationResults.flatMap(r => r.coherence.missing.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            ))
                        )
                    ),
                    // Badge Huérfanos (clickeable)
                    orphanResults.length > 0 && React.createElement('div', { style: { position: 'relative' } },
                        React.createElement(Badge, {
                            emoji: '👻', count: counts.orphans, bgColor: '#f3e5f5', textColor: '#9C27B0',
                            onClick: () => setOpenPopover(openPopover === 'orphans' ? null : 'orphans'),
                            isActive: openPopover === 'orphans'
                        }),
                        // Popover Huérfanos
                        openPopover === 'orphans' && React.createElement('div', {
                            style: {
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid #9C27B0', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
                                minWidth: '18rem', maxWidth: '24rem', maxHeight: '14rem', overflowY: 'auto'
                            }
                        },
                            React.createElement('div', {
                                style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '0.75rem', backgroundColor: '#f3e5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                            },
                                React.createElement('span', null, `👻 ${counts.orphans} huérfanos`),
                                React.createElement('button', { onClick: () => setOpenPopover(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' } }, '✕')
                            ),
                            orphanResults.map(node =>
                                React.createElement('div', { key: node.uid, style: { padding: '0.375rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' } },
                                    React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#f3e5f5', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' } }, node.type),
                                    React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 35)),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); }, style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer' } }, '→')
                                )
                            )
                        )
                    )
                ),
                // Status compacto
                bulkVerifyStatus && React.createElement('span', {
                    style: {
                        fontSize: '0.75rem',
                        color: bulkVerifyStatus.includes('✅') ? '#4CAF50' :
                            bulkVerifyStatus.includes('⚠️') ? '#ff9800' :
                                bulkVerifyStatus.includes('❌') ? '#f44336' : '#666',
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
        selectedBulkQuestion && React.createElement('div', { style: { border: '1px solid #2196F3', borderRadius: '0.25rem', padding: '0.75rem', backgroundColor: '#f8f9fa' } },
            React.createElement('h4', { style: { margin: '0 0 0.75rem 0', fontSize: '0.875rem', lineHeight: '1.4' } },
                selectedBulkQuestion.question.pageTitle.replace('[[QUE]] - ', '')),

            // Proyecto editable y botones de propagación
            React.createElement('div', { style: { marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' } },
                React.createElement('span', { style: { fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8125rem' } }, '📁 Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    style: { flex: 1, minWidth: '10rem', padding: '0.375rem 0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem', fontSize: '0.8125rem' }
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
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: (isPropagating || !editableProject.trim()) ? '#ccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: (isPropagating || !editableProject.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isPropagating ? '⏳...' : `🔄 Propagar raíz (${count})`);
                })(),

                // Botón 2: Heredar de padres
                (() => {
                    const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
                    return generalizations.length > 0 && React.createElement('button', {
                        onClick: handlePropagateFromParents,
                        disabled: isPropagating,
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: isPropagating ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isPropagating ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isPropagating ? '⏳...' : `⬆️ Heredar de padres (${generalizations.length})`);
                })()
            ),

            // Resumen compacto
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap' } },
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#e8f5e9', borderRadius: '0.1875rem' } },
                    `✅ ${selectedBulkQuestion.coherence.coherent.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#e3f2fd', borderRadius: '0.1875rem' } },
                    `🔀 ${selectedBulkQuestion.coherence.specialized.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#fff3e0', borderRadius: '0.1875rem' } },
                    `⚠️ ${selectedBulkQuestion.coherence.different.length}`),
                React.createElement('span', { style: { padding: '0.25rem 0.5rem', backgroundColor: '#ffebee', borderRadius: '0.1875rem' } },
                    `❌ ${selectedBulkQuestion.coherence.missing.length}`)
            ),

            // Lista de nodos problemáticos
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { style: { maxHeight: '10rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: 'white' } },
                selectedBulkQuestion.coherence.different.map(node =>
                    React.createElement('div', { key: node.uid, style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' } },
                        React.createElement('span', { style: { color: '#ff9800', fontSize: '0.8125rem', flexShrink: 0 } }, '⚠️'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.25rem', borderRadius: '0.125rem', marginRight: '0.375rem' } }, node.type),
                            React.createElement('span', { style: { fontSize: '0.75rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            React.createElement('div', { style: { fontSize: '0.625rem', color: '#666', marginTop: '0.125rem' } },
                                React.createElement('span', null, `Debería heredar: ${node.parentProject}`),
                                React.createElement('span', { style: { marginLeft: '0.5rem' } }, `Tiene: ${node.project}`)
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer', flexShrink: 0 }
                        }, '→ Ir')
                    )
                ),
                selectedBulkQuestion.coherence.missing.map(node =>
                    React.createElement('div', { key: node.uid, style: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' } },
                        React.createElement('span', { style: { color: '#f44336', fontSize: '0.8125rem', flexShrink: 0 } }, '❌'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.3' } },
                            React.createElement('span', { style: { fontSize: '0.625rem', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '0.125rem 0.25rem', borderRadius: '0.125rem', marginRight: '0.375rem' } }, node.type),
                            React.createElement('span', { style: { fontSize: '0.75rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            node.parentProject && React.createElement('div', { style: { fontSize: '0.625rem', color: '#666', marginTop: '0.125rem' } },
                                `Debería heredar: ${node.parentProject}`
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            style: { padding: '0.125rem 0.375rem', fontSize: '0.625rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.125rem', cursor: 'pointer', flexShrink: 0 }
                        }, '→ Ir')
                    )
                )
            )
        )
    );
};
