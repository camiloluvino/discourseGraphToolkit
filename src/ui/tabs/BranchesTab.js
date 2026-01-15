// ============================================================================
// UI: Branches Tab Component
// ============================================================================

DiscourseGraphToolkit.BranchesTab = function (props) {
    const React = window.React;
    const {
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating
    } = props;

    // --- Estado local para vista de árbol ---
    const [expandedProjects, setExpandedProjects] = React.useState({});
    // --- Estado para popover de nodos problemáticos ---
    const [openPopover, setOpenPopover] = React.useState(null); // 'different' | 'missing' | null

    // --- Árbol jerárquico (calculado) ---
    const projectTree = React.useMemo(() => {
        if (bulkVerificationResults.length === 0) return {};
        return DiscourseGraphToolkit.buildProjectTree(bulkVerificationResults);
    }, [bulkVerificationResults]);

    // --- Toggle expandir/colapsar proyecto ---
    const toggleProjectExpand = (projectPath) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectPath]: !prev[projectPath]
        }));
    };

    // --- Helpers ---
    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
            // Minimizar el modal para poder ver el nodo (mantiene estado)
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
                setBulkVerifyStatus(`⏳ Verificando ${i + 1}/${questions.length}: ${q.pageTitle.substring(0, 40)}...`);

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
            const statusMsg = `✅ Verificación completada: ${coherent} coherentes, ${specialized} especializados, ${different} diferentes, ${missing} sin proyecto.`;
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

        // Solo propagar a nodos sin proyecto o con proyecto diferente (no generalizaciones)
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

        // Solo nodos con generalización (reason === 'generalization')
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
        // Delay para permitir que Roam sincronice los cambios en su cache interno
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

    // --- Render de nodo del árbol (recursivo) ---
    const renderTreeNode = (node, key, depth) => {
        const isExpanded = expandedProjects[node.project] !== false; // Expandido por defecto
        const hasChildren = Object.keys(node.children).length > 0;
        const hasQuestions = node.questions.length > 0;
        const totalQuestions = DiscourseGraphToolkit.countTreeQuestions(node);
        const statusIcon = node.aggregatedStatus === 'coherent' ? '✅' :
            node.aggregatedStatus === 'specialized' ? '🔀' :
                node.aggregatedStatus === 'different' ? '⚠️' : '❌';
        const statusColor = node.aggregatedStatus === 'coherent' ? '#4CAF50' :
            node.aggregatedStatus === 'specialized' ? '#2196F3' :
                node.aggregatedStatus === 'different' ? '#ff9800' : '#f44336';

        return React.createElement('div', { key: key, style: { marginLeft: depth > 0 ? '1rem' : 0 } },
            // Encabezado del proyecto (si tiene más de una pregunta o tiene hijos)
            (hasChildren || totalQuestions > 1 || depth === 0) && React.createElement('div', {
                onClick: () => toggleProjectExpand(node.project),
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
                        color: statusColor,
                        backgroundColor: node.aggregatedStatus === 'coherent' ? '#e8f5e9' :
                            node.aggregatedStatus === 'specialized' ? '#e3f2fd' :
                                node.aggregatedStatus === 'different' ? '#fff3e0' : '#ffebee',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.1875rem'
                    }
                }, `${statusIcon} ${totalQuestions} preg${totalQuestions !== 1 ? 's' : ''}${node.issueCount > 0 ? `, ${node.issueCount} ⚠️` : ''}`)
            ),

            // Contenido (preguntas + hijos)
            isExpanded && React.createElement('div', null,
                // Preguntas directas de este nodo
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
                ),
                // Hijos recursivos
                Object.keys(node.children).sort().map(childKey =>
                    renderTreeNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render ---
    return React.createElement('div', null,
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

        // Dashboard de contadores (barra compacta)
        bulkVerificationResults.length > 0 && React.createElement('div', {
            style: {
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                position: 'relative'
            }
        },
            React.createElement('span', {
                style: {
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '1rem',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#4CAF50',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }
            }, `✅ ${bulkVerificationResults.filter(r => r.status === 'coherent').length} Coherentes`),
            React.createElement('span', {
                style: {
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '1rem',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#2196F3',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }
            }, `🔀 ${bulkVerificationResults.filter(r => r.status === 'specialized').length} Especializados`),
            // Badge "Diferente" (clickeable)
            React.createElement('div', { style: { position: 'relative' } },
                React.createElement('span', {
                    onClick: () => {
                        const allDifferent = bulkVerificationResults.flatMap(r =>
                            r.coherence.different.map(n => ({ ...n, questionTitle: r.question.pageTitle }))
                        );
                        if (allDifferent.length > 0) {
                            setOpenPopover(openPopover === 'different' ? null : 'different');
                        }
                    },
                    style: {
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#fff3e0',
                        borderRadius: '1rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: '#ff9800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: bulkVerificationResults.some(r => r.coherence.different.length > 0) ? 'pointer' : 'default',
                        border: openPopover === 'different' ? '2px solid #ff9800' : '2px solid transparent'
                    }
                }, `⚠️ ${bulkVerificationResults.flatMap(r => r.coherence.different).length} Diferente`),
                // Popover para "Diferente"
                openPopover === 'different' && React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.5rem',
                        backgroundColor: 'white',
                        border: '1px solid #ff9800',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        minWidth: '20rem',
                        maxWidth: '28rem',
                        maxHeight: '18rem',
                        overflowY: 'auto'
                    }
                },
                    React.createElement('div', {
                        style: {
                            padding: '0.625rem 0.75rem',
                            borderBottom: '1px solid #eee',
                            fontWeight: 'bold',
                            fontSize: '0.8125rem',
                            backgroundColor: '#fff3e0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }
                    },
                        React.createElement('span', null, `⚠️ ${bulkVerificationResults.flatMap(r => r.coherence.different).length} nodos con proyecto diferente`),
                        React.createElement('button', {
                            onClick: () => setOpenPopover(null),
                            style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#666' }
                        }, '✕')
                    ),
                    bulkVerificationResults.flatMap(r =>
                        r.coherence.different.map(node =>
                            React.createElement('div', {
                                key: node.uid,
                                style: {
                                    padding: '0.5rem 0.75rem',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8125rem'
                                }
                            },
                                React.createElement('span', { style: { color: '#ff9800', flexShrink: 0 } }, '⚠️'),
                                React.createElement('span', {
                                    style: {
                                        fontSize: '0.6875rem',
                                        fontWeight: 'bold',
                                        backgroundColor: '#fff3e0',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '0.1875rem',
                                        flexShrink: 0
                                    }
                                }, node.type),
                                React.createElement('span', {
                                    style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 40) + ((node.title || '').length > 40 ? '...' : '')),
                                React.createElement('button', {
                                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); },
                                    style: {
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.1875rem',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }
                                }, '→ Ir')
                            )
                        )
                    )
                )
            ),
            // Badge "Sin proyecto" (clickeable)
            React.createElement('div', { style: { position: 'relative' } },
                React.createElement('span', {
                    onClick: () => {
                        const allMissing = bulkVerificationResults.flatMap(r =>
                            r.coherence.missing.map(n => ({ ...n, questionTitle: r.question.pageTitle }))
                        );
                        if (allMissing.length > 0) {
                            setOpenPopover(openPopover === 'missing' ? null : 'missing');
                        }
                    },
                    style: {
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#ffebee',
                        borderRadius: '1rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: '#f44336',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: bulkVerificationResults.some(r => r.coherence.missing.length > 0) ? 'pointer' : 'default',
                        border: openPopover === 'missing' ? '2px solid #f44336' : '2px solid transparent'
                    }
                }, `❌ ${bulkVerificationResults.flatMap(r => r.coherence.missing).length} Sin proyecto`),
                // Popover para "Sin proyecto"
                openPopover === 'missing' && React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: 'white',
                        border: '1px solid #f44336',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        minWidth: '20rem',
                        maxWidth: '28rem',
                        maxHeight: '18rem',
                        overflowY: 'auto'
                    }
                },
                    React.createElement('div', {
                        style: {
                            padding: '0.625rem 0.75rem',
                            borderBottom: '1px solid #eee',
                            fontWeight: 'bold',
                            fontSize: '0.8125rem',
                            backgroundColor: '#ffebee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }
                    },
                        React.createElement('span', null, `❌ ${bulkVerificationResults.flatMap(r => r.coherence.missing).length} nodos sin proyecto`),
                        React.createElement('button', {
                            onClick: () => setOpenPopover(null),
                            style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#666' }
                        }, '✕')
                    ),
                    bulkVerificationResults.flatMap(r =>
                        r.coherence.missing.map(node =>
                            React.createElement('div', {
                                key: node.uid,
                                style: {
                                    padding: '0.5rem 0.75rem',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8125rem'
                                }
                            },
                                React.createElement('span', { style: { color: '#f44336', flexShrink: 0 } }, '❌'),
                                React.createElement('span', {
                                    style: {
                                        fontSize: '0.6875rem',
                                        fontWeight: 'bold',
                                        backgroundColor: '#ffebee',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '0.1875rem',
                                        flexShrink: 0
                                    }
                                }, node.type),
                                React.createElement('span', {
                                    style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                }, (node.title || '').replace(/\[\[(CLM|EVD|QUE)\]\] - /, '').substring(0, 40) + ((node.title || '').length > 40 ? '...' : '')),
                                React.createElement('button', {
                                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(node.uid); },
                                    style: {
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: '#2196F3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.1875rem',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }
                                }, '→ Ir')
                            )
                        )
                    )
                )
            )
        ),

        // Vista de árbol jerárquico por proyectos
        bulkVerificationResults.length > 0 && React.createElement('div', { style: { marginBottom: '1.25rem' } },
            React.createElement('div', {
                style: { maxHeight: '18.75rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: '#fafafa' }
            },
                // Renderizar árbol recursivamente
                Object.keys(projectTree).sort().map(projectKey =>
                    renderTreeNode(projectTree[projectKey], projectKey, 0)
                )
            )
        ),

        // Panel de detalle
        selectedBulkQuestion && React.createElement('div', { style: { border: '1px solid #2196F3', borderRadius: '0.25rem', padding: '0.9375rem', backgroundColor: '#f8f9fa' } },
            React.createElement('h4', { style: { margin: '0 0 0.9375rem 0', fontSize: '0.9375rem', lineHeight: '1.4' } },
                selectedBulkQuestion.question.pageTitle.replace('[[QUE]] - ', '')),

            // Proyecto editable y botones de propagación
            React.createElement('div', { style: { marginBottom: '0.9375rem', display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' } },
                React.createElement('span', { style: { fontWeight: 'bold', whiteSpace: 'nowrap' } }, '📁 Proyecto:'),
                React.createElement('input', {
                    type: 'text',
                    value: editableProject,
                    onChange: (e) => setEditableProject(e.target.value),
                    style: { flex: 1, minWidth: '12.5rem', padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '0.25rem', fontSize: '0.875rem' }
                })
            ),

            // Botones de propagación (separados por tipo de error)
            React.createElement('div', { style: { marginBottom: '0.9375rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' } },
                // Botón 1: Propagar raíz (missing + different sin generalización)
                (() => {
                    const nonGeneralizations = selectedBulkQuestion.coherence.different.filter(n => n.reason !== 'generalization');
                    const count = nonGeneralizations.length + selectedBulkQuestion.coherence.missing.length;
                    return count > 0 && React.createElement('button', {
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
                    }, isPropagating ? '⏳...' : `🔄 Propagar raíz (${count})`);
                })(),

                // Botón 2: Heredar de padres (solo generalizaciones)
                (() => {
                    const generalizations = selectedBulkQuestion.coherence.different.filter(n => n.reason === 'generalization');
                    return generalizations.length > 0 && React.createElement('button', {
                        onClick: handlePropagateFromParents,
                        disabled: isPropagating,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: isPropagating ? '#ccc' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isPropagating ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 'bold'
                        }
                    }, isPropagating ? '⏳...' : `⬆️ Heredar de padres (${generalizations.length})`);
                })()
            ),

            // Resumen
            React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '0.9375rem', fontSize: '0.8125rem', flexWrap: 'wrap' } },
                React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#e8f5e9', borderRadius: '0.1875rem' } },
                    `✅ ${selectedBulkQuestion.coherence.coherent.length} coherentes`),
                React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#e3f2fd', borderRadius: '0.1875rem' } },
                    `🔀 ${selectedBulkQuestion.coherence.specialized.length} especializados`),
                React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#fff3e0', borderRadius: '0.1875rem' } },
                    `⚠️ ${selectedBulkQuestion.coherence.different.length} diferentes`),
                React.createElement('span', { style: { padding: '0.3125rem 0.625rem', backgroundColor: '#ffebee', borderRadius: '0.1875rem' } },
                    `❌ ${selectedBulkQuestion.coherence.missing.length} sin proyecto`)
            ),

            // Lista de nodos problemáticos
            (selectedBulkQuestion.coherence.different.length > 0 || selectedBulkQuestion.coherence.missing.length > 0) &&
            React.createElement('div', { style: { maxHeight: '12.5rem', overflowY: 'auto', border: '1px solid #eee', borderRadius: '0.25rem', backgroundColor: 'white' } },
                selectedBulkQuestion.coherence.different.map(node =>
                    React.createElement('div', { key: node.uid, style: { padding: '0.625rem 0.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' } },
                        React.createElement('span', { style: { color: '#ff9800', fontSize: '0.875rem', flexShrink: 0 } }, '⚠️'),
                        React.createElement('div', { style: { flex: 1, lineHeight: '1.4' } },
                            React.createElement('span', { style: { fontSize: '0.6875rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '0.125rem 0.375rem', borderRadius: '0.1875rem', marginRight: '0.5rem' } }, node.type),
                            React.createElement('span', { style: { fontSize: '0.8125rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            // Mostrar contexto del padre
                            React.createElement('div', { style: { fontSize: '0.6875rem', color: '#666', marginTop: '0.25rem' } },
                                node.reason === 'generalization'
                                    ? `⬆️ Generaliza: ${node.project} ← padre: ${node.parentProject}`
                                    : `📁 ${node.project} ≠ padre: ${node.parentProject}`
                            )
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
                            React.createElement('span', { style: { fontSize: '0.8125rem' } }, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '')),
                            // Mostrar proyecto esperado del padre
                            node.parentProject && React.createElement('div', { style: { fontSize: '0.6875rem', color: '#666', marginTop: '0.25rem' } },
                                `📁 Padre espera: ${node.parentProject}`
                            )
                        ),
                        React.createElement('button', {
                            onClick: () => handleNavigateToPage(node.uid),
                            style: { padding: '0.25rem 0.625rem', fontSize: '0.75rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '0.1875rem', cursor: 'pointer', flexShrink: 0 }
                        }, '→ Ir')
                    )
                )
            )
        )
    );
};
