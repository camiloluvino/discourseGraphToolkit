// ============================================================================
// UI: Panoramic Tab Component
// Vista sintética de todas las ramas del grafo de discurso
// ============================================================================

DiscourseGraphToolkit.PanoramicTab = function (props) {
    const React = window.React;

    // Desestructurar props del padre (estados que persisten entre cambios de pestaña)
    const {
        projects,
        panoramicData, setPanoramicData,
        expandedQuestions, setExpandedQuestions,
        loadStatus, setLoadStatus,
        selectedProject, setSelectedProject
    } = props;

    // Estado de carga (local, no necesita persistir)
    const [isLoading, setIsLoading] = React.useState(false);

    // Estado local para el orden de preguntas
    const [orderedQuestionUIDs, setOrderedQuestionUIDs] = React.useState([]);

    // Estado para tracking del timestamp del cache
    const [cacheTimestamp, setCacheTimestamp] = React.useState(null);

    // --- Helpers de Reordenamiento ---
    const moveQuestionUp = (index) => {
        if (index === 0 || !selectedProject) return;
        const newOrder = [...orderedQuestionUIDs];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setOrderedQuestionUIDs(newOrder);
        DiscourseGraphToolkit.saveQuestionOrder(selectedProject, newOrder.map(uid => ({ uid })));
    };

    const moveQuestionDown = (index) => {
        if (index === orderedQuestionUIDs.length - 1 || !selectedProject) return;
        const newOrder = [...orderedQuestionUIDs];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrderedQuestionUIDs(newOrder);
        DiscourseGraphToolkit.saveQuestionOrder(selectedProject, newOrder.map(uid => ({ uid })));
    };

    // Efecto para cargar/sincronizar orden cuando cambia el proyecto o los datos
    React.useEffect(() => {
        if (!panoramicData || !selectedProject) {
            setOrderedQuestionUIDs([]);
            return;
        }
        // Obtener preguntas filtradas por proyecto
        const projectQuestions = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
        });
        // Cargar orden guardado
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(selectedProject);
        if (savedOrder && savedOrder.length > 0) {
            // Ordenar según guardado, agregar nuevas al final
            const orderedUIDs = savedOrder.filter(uid => projectQuestions.some(q => q.uid === uid));
            const newUIDs = projectQuestions.filter(q => !savedOrder.includes(q.uid)).map(q => q.uid);
            setOrderedQuestionUIDs([...orderedUIDs, ...newUIDs]);
        } else {
            setOrderedQuestionUIDs(projectQuestions.map(q => q.uid));
        }
    }, [panoramicData, selectedProject]);


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

    const toggleQuestion = (uid) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    const cleanTitle = (title, type) => {
        return (title || '').replace(new RegExp(`\\[\\[${type}\\]\\]\\s*-\\s*`), '').substring(0, 50);
    };

    const formatTimeAgo = (timestamp) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'menos de 1 minuto';
        if (mins < 60) return `${mins} minuto${mins !== 1 ? 's' : ''}`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''}`;
        const days = Math.floor(hours / 24);
        return `${days} día${days !== 1 ? 's' : ''}`;
    };

    // Efecto para restaurar cache al montar (solo si no hay datos)
    React.useEffect(() => {
        if (!panoramicData) {
            const cached = DiscourseGraphToolkit.loadPanoramicCache();
            if (cached && cached.panoramicData) {
                setPanoramicData(cached.panoramicData);
                setCacheTimestamp(cached.timestamp);
                setLoadStatus(`📦 Datos restaurados del cache.`);
            }
        }
    }, []); // Solo al montar

    // --- Cargar datos panorámicos ---
    const handleLoadPanoramic = async () => {
        setIsLoading(true);
        setLoadStatus('⏳ Buscando todas las preguntas...');
        setPanoramicData(null);

        try {
            // 1. Obtener todas las preguntas (QUE) del grafo
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            setLoadStatus(`⏳ Encontradas ${questions.length} preguntas. Cargando datos...`);

            // 2. Obtener datos completos de las preguntas
            const uids = questions.map(q => q.pageUid);
            const result = await DiscourseGraphToolkit.exportPagesNative(
                uids, null, (msg) => setLoadStatus(`⏳ ${msg}`), true, false
            );

            // 3. Construir mapa de nodos
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });

            // 4. Analizar dependencias y cargar nodos faltantes
            setLoadStatus('⏳ Analizando relaciones...');
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setLoadStatus(`⏳ Cargando ${missingUids.length} nodos relacionados...`);
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, true, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }

            // 5. Mapear relaciones
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // 6. Obtener proyectos de cada pregunta
            setLoadStatus('⏳ Obteniendo proyectos...');
            for (const q of questions) {
                const project = await DiscourseGraphToolkit.getProjectFromNode(q.pageUid);
                if (allNodes[q.pageUid]) {
                    allNodes[q.pageUid].project = project;
                }
            }

            // 7. Filtrar solo QUEs del resultado
            const questionNodes = result.data.filter(node =>
                DiscourseGraphToolkit.getNodeType(node.title) === 'QUE'
            ).map(node => ({
                ...node,
                project: allNodes[node.uid]?.project || null
            }));

            setPanoramicData({ questions: questionNodes, allNodes });
            // Guardar en cache
            DiscourseGraphToolkit.savePanoramicCache({ questions: questionNodes, allNodes });
            setCacheTimestamp(Date.now());
            setLoadStatus(`✅ Cargadas ${questionNodes.length} preguntas con ${Object.keys(allNodes).length} nodos totales.`);

        } catch (e) {
            console.error('Error loading panoramic:', e);
            setLoadStatus('❌ Error: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Renderizar rama de un CLM ---
    const renderCLMBranch = (clmUid, allNodes, depth = 0) => {
        const clm = allNodes[clmUid];
        if (!clm) return null;

        const maxDepth = 3;
        if (depth > maxDepth) return React.createElement('span', { style: { color: '#999', fontSize: '0.6875rem' } }, '...');

        return React.createElement('span', {
            key: clmUid,
            style: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }
        },
            // CLM node
            React.createElement('span', {
                onClick: (e) => { e.stopPropagation(); handleNavigateToPage(clmUid); },
                style: {
                    color: '#4CAF50',
                    cursor: 'pointer',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '0.125rem',
                    backgroundColor: '#e8f5e9',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                },
                title: clm.title
            }, `📌 ${cleanTitle(clm.title, 'CLM')}`),

            // EVDs del CLM
            clm.related_evds && clm.related_evds.length > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', { style: { color: '#999', margin: '0 0.25rem', fontSize: '0.6875rem' } }, '→'),
                clm.related_evds.slice(0, 3).map((evdUid, i) => {
                    const evd = allNodes[evdUid];
                    if (!evd) return null;
                    return React.createElement('span', {
                        key: evdUid,
                        onClick: (e) => { e.stopPropagation(); handleNavigateToPage(evdUid); },
                        style: {
                            color: '#ff9800',
                            cursor: 'pointer',
                            padding: '0.125rem 0.25rem',
                            borderRadius: '0.125rem',
                            backgroundColor: '#fff3e0',
                            fontSize: '0.6875rem',
                            marginRight: i < clm.related_evds.length - 1 ? '0.25rem' : 0,
                            whiteSpace: 'nowrap'
                        },
                        title: evd.title
                    }, `📎 ${cleanTitle(evd.title, 'EVD').substring(0, 20)}`);
                }),
                clm.related_evds.length > 3 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.625rem', marginLeft: '0.25rem' }
                }, `+${clm.related_evds.length - 3}`)
            ),

            // CLMs de soporte (recursivo)
            clm.supporting_clms && clm.supporting_clms.length > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', { style: { color: '#999', margin: '0 0.25rem', fontSize: '0.6875rem' } }, '⤷'),
                clm.supporting_clms.slice(0, 2).map(suppUid =>
                    renderCLMBranch(suppUid, allNodes, depth + 1)
                ),
                clm.supporting_clms.length > 2 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.625rem', marginLeft: '0.25rem' }
                }, `+${clm.supporting_clms.length - 2}`)
            )
        );
    };

    // --- Renderizar una pregunta con sus ramas ---
    const renderQuestion = (question, allNodes) => {
        const isExpanded = expandedQuestions[question.uid] === true; // Colapsado por defecto
        const clms = question.related_clms || [];
        const directEvds = question.direct_evds || [];
        const totalBranches = clms.length + directEvds.length;

        return React.createElement('div', {
            key: question.uid,
            style: {
                marginBottom: '0.5rem',
                borderLeft: '3px solid #2196F3',
                paddingLeft: '0.75rem',
                backgroundColor: '#fafafa',
                borderRadius: '0 0.25rem 0.25rem 0'
            }
        },
            // Header de la pregunta
            React.createElement('div', {
                onClick: () => toggleQuestion(question.uid),
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    cursor: 'pointer'
                }
            },
                // Botones de reordenamiento (solo si hay proyecto seleccionado)
                selectedProject && React.createElement('div', {
                    style: { display: 'flex', flexDirection: 'column', marginRight: '0.25rem' },
                    onClick: (e) => e.stopPropagation()
                },
                    React.createElement('button', {
                        onClick: () => moveQuestionUp(orderedQuestionUIDs.indexOf(question.uid)),
                        disabled: orderedQuestionUIDs.indexOf(question.uid) === 0,
                        style: {
                            padding: '0 0.25rem',
                            fontSize: '0.5rem',
                            lineHeight: '1',
                            cursor: orderedQuestionUIDs.indexOf(question.uid) === 0 ? 'not-allowed' : 'pointer',
                            opacity: orderedQuestionUIDs.indexOf(question.uid) === 0 ? 0.3 : 1,
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            backgroundColor: '#fff',
                            marginBottom: '1px'
                        }
                    }, '▲'),
                    React.createElement('button', {
                        onClick: () => moveQuestionDown(orderedQuestionUIDs.indexOf(question.uid)),
                        disabled: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1,
                        style: {
                            padding: '0 0.25rem',
                            fontSize: '0.5rem',
                            lineHeight: '1',
                            cursor: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: orderedQuestionUIDs.indexOf(question.uid) === orderedQuestionUIDs.length - 1 ? 0.3 : 1,
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            backgroundColor: '#fff'
                        }
                    }, '▼')
                ),
                React.createElement('span', { style: { color: '#666', fontSize: '0.6875rem' } },
                    isExpanded ? '▼' : '▶'),
                React.createElement('span', {
                    onClick: (e) => { e.stopPropagation(); handleNavigateToPage(question.uid); },
                    style: {
                        color: '#2196F3',
                        fontWeight: 'bold',
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                    },
                    title: question.title
                }, `📝 ${cleanTitle(question.title, 'QUE')}`),
                React.createElement('span', {
                    style: {
                        fontSize: '0.625rem',
                        color: '#999',
                        backgroundColor: '#e3f2fd',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.625rem'
                    }
                }, `${totalBranches} rama${totalBranches !== 1 ? 's' : ''}`),
                question.project && React.createElement('span', {
                    style: {
                        fontSize: '0.625rem',
                        color: '#666',
                        backgroundColor: '#f5f5f5',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.125rem'
                    }
                }, `📁 ${question.project}`)
            ),

            // Ramas (CLMs y EVDs directas)
            isExpanded && React.createElement('div', {
                style: { paddingLeft: '1rem', paddingBottom: '0.5rem' }
            },
                // CLMs
                clms.map((clmUid, index) =>
                    React.createElement('div', {
                        key: clmUid,
                        style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            marginBottom: '0.25rem',
                            flexWrap: 'wrap'
                        }
                    },
                        React.createElement('span', {
                            style: { color: '#ccc', marginRight: '0.5rem', fontSize: '0.6875rem' }
                        }, index === clms.length - 1 && directEvds.length === 0 ? '└─' : '├─'),
                        renderCLMBranch(clmUid, allNodes)
                    )
                ),
                // EVDs directas
                directEvds.map((evdUid, index) => {
                    const evd = allNodes[evdUid];
                    if (!evd) return null;
                    return React.createElement('div', {
                        key: evdUid,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.25rem'
                        }
                    },
                        React.createElement('span', {
                            style: { color: '#ccc', marginRight: '0.5rem', fontSize: '0.6875rem' }
                        }, index === directEvds.length - 1 ? '└─' : '├─'),
                        React.createElement('span', {
                            onClick: () => handleNavigateToPage(evdUid),
                            style: {
                                color: '#ff9800',
                                cursor: 'pointer',
                                padding: '0.125rem 0.25rem',
                                borderRadius: '0.125rem',
                                backgroundColor: '#fff3e0',
                                fontSize: '0.75rem'
                            },
                            title: evd.title
                        }, `📎 ${cleanTitle(evd.title, 'EVD')}`)
                    );
                }),
                // Mensaje si no hay ramas
                totalBranches === 0 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }
                }, 'Sin respuestas')
            )
        );
    };

    // --- Filtrar preguntas por proyecto (respetando orden) ---
    const getFilteredQuestions = () => {
        if (!panoramicData) return [];
        if (!selectedProject) return panoramicData.questions;
        // Si hay orden guardado, usarlo
        if (orderedQuestionUIDs.length > 0) {
            return orderedQuestionUIDs
                .map(uid => panoramicData.questions.find(q => q.uid === uid))
                .filter(Boolean);
        }
        return panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
        });
    };

    // --- Obtener lista única de proyectos ---
    const getUniqueProjects = () => {
        if (!panoramicData) return [];
        const projectSet = new Set();
        panoramicData.questions.forEach(q => {
            if (q.project) projectSet.add(q.project);
        });
        return Array.from(projectSet).sort();
    };

    const filteredQuestions = getFilteredQuestions();
    const uniqueProjects = getUniqueProjects();

    // --- Render ---
    return React.createElement('div', null,
        React.createElement('h3', { style: { marginTop: 0 } }, '🗺️ Vista Panorámica'),
        React.createElement('p', { style: { color: '#666', marginBottom: '0.9375rem', fontSize: '0.875rem' } },
            'Vista sintética de todas las ramas del grafo de discurso. Click en cualquier nodo para navegar a Roam.'),

        // Controles
        React.createElement('div', { style: { display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' } },
            React.createElement('button', {
                onClick: handleLoadPanoramic,
                disabled: isLoading,
                style: {
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isLoading ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                }
            }, isLoading ? '⏳ Cargando...' : '🔄 Cargar Panorámica'),

            // Filtro de proyecto
            panoramicData && uniqueProjects.length > 0 && React.createElement('select', {
                value: selectedProject,
                onChange: (e) => setSelectedProject(e.target.value),
                style: {
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '0.25rem',
                    fontSize: '0.8125rem'
                }
            },
                React.createElement('option', { value: '' }, `Todos los proyectos (${panoramicData.questions.length})`),
                uniqueProjects.map(p =>
                    React.createElement('option', { key: p, value: p }, p)
                )
            ),

            // Botones expandir/colapsar
            panoramicData && React.createElement(React.Fragment, null,
                React.createElement('button', {
                    onClick: () => {
                        const allExpanded = {};
                        filteredQuestions.forEach(q => allExpanded[q.uid] = true);
                        setExpandedQuestions(allExpanded);
                    },
                    style: {
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #ccc',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        backgroundColor: '#f5f5f5'
                    }
                }, '➕ Expandir Todo'),
                React.createElement('button', {
                    onClick: () => setExpandedQuestions({}),
                    style: {
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #ccc',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        backgroundColor: '#f5f5f5'
                    }
                }, '➖ Colapsar Todo')
            )
        ),

        // Banner de cache
        cacheTimestamp && !isLoading && React.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#fff8e1',
                border: '1px solid #ffecb3',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                color: '#f57c00'
            }
        },
            React.createElement('span', null,
                `📦 Datos de hace ${formatTimeAgo(cacheTimestamp)}. `),
            React.createElement('button', {
                onClick: handleLoadPanoramic,
                style: {
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.6875rem'
                }
            }, '🔄 Refrescar')
        ),

        // Status
        loadStatus && React.createElement('div', {
            style: {
                marginBottom: '0.75rem',
                padding: '0.625rem',
                backgroundColor: loadStatus.includes('✅') ? '#e8f5e9' :
                    loadStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                borderRadius: '0.25rem',
                fontWeight: 'bold',
                fontSize: '0.8125rem'
            }
        }, loadStatus),

        // Estadísticas
        panoramicData && React.createElement('div', {
            style: {
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
                flexWrap: 'wrap'
            }
        },
            React.createElement('span', {
                style: {
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    color: '#2196F3'
                }
            }, `📝 ${filteredQuestions.length} preguntas`),
            React.createElement('span', {
                style: {
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    color: '#4CAF50'
                }
            }, `📌 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'CLM').length} afirmaciones`),
            React.createElement('span', {
                style: {
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#fff3e0',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    color: '#ff9800'
                }
            }, `📎 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'EVD').length} evidencias`)
        ),

        // Lista de preguntas con sus ramas
        panoramicData && React.createElement('div', {
            style: {
                maxHeight: '28rem',
                overflowY: 'auto',
                border: '1px solid #eee',
                borderRadius: '0.25rem',
                padding: '0.75rem',
                backgroundColor: 'white'
            }
        },
            filteredQuestions.length > 0
                ? filteredQuestions.map(q => renderQuestion(q, panoramicData.allNodes))
                : React.createElement('p', { style: { color: '#999', textAlign: 'center' } },
                    'No hay preguntas para mostrar' + (selectedProject ? ' en este proyecto.' : '.'))
        ),

        // Mensaje inicial
        !panoramicData && !isLoading && React.createElement('div', {
            style: {
                padding: '3rem',
                textAlign: 'center',
                color: '#999',
                backgroundColor: '#fafafa',
                borderRadius: '0.25rem',
                border: '1px dashed #ddd'
            }
        },
            React.createElement('p', { style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, '🗺️'),
            React.createElement('p', null, 'Haz clic en "Cargar Panorámica" para visualizar todas las ramas del grafo.')
        )
    );
};
