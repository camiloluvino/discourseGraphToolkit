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

    // --- Helpers ---
    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
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
            } else {
                setBulkVerifyStatus(`⚠️ Propagación con errores.`);
            }
        } catch (e) {
            setBulkVerifyStatus('❌ Error: ' + e.message);
        } finally {
            setIsPropagating(false);
        }
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

        // Dashboard de contadores
        bulkVerificationResults.length > 0 && React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '1.25rem', flexWrap: 'wrap' } },
            React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#e8f5e9', borderRadius: '0.25rem', textAlign: 'center', flex: 1, minWidth: '70px' } },
                React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#4CAF50' } },
                    bulkVerificationResults.filter(r => r.status === 'coherent').length),
                React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '✅ Coherentes')
            ),
            React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#e3f2fd', borderRadius: '0.25rem', textAlign: 'center', flex: 1, minWidth: '70px' } },
                React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#2196F3' } },
                    bulkVerificationResults.filter(r => r.status === 'specialized').length),
                React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '🔀 Especializados')
            ),
            React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#fff3e0', borderRadius: '0.25rem', textAlign: 'center', flex: 1, minWidth: '70px' } },
                React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#ff9800' } },
                    bulkVerificationResults.filter(r => r.status === 'different').length),
                React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '⚠️ Diferente')
            ),
            React.createElement('div', { style: { padding: '0.9375rem', backgroundColor: '#ffebee', borderRadius: '0.25rem', textAlign: 'center', flex: 1, minWidth: '70px' } },
                React.createElement('div', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#f44336' } },
                    bulkVerificationResults.filter(r => r.status === 'missing').length),
                React.createElement('div', { style: { fontSize: '0.75rem', color: '#666' } }, '❌ Sin proyecto')
            )
        ),

        // Lista de ramas
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
                            result.status === 'coherent' ? '✅' : result.status === 'specialized' ? '🔀' : result.status === 'different' ? '⚠️' : '❌'),
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

        // Panel de detalle
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
