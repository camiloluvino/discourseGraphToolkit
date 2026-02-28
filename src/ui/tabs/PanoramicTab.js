// ============================================================================
// UI: Panoramic Tab Component
// Vista sintética de todas las ramas del grafo de discurso
// ============================================================================

DiscourseGraphToolkit.PanoramicTab = function () {
    const React = window.React;

    // Desestructurar del contexto (algunos nombres difieren de los props originales)
    const {
        projects,
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions: expandedQuestions, setPanoramicExpandedQuestions: setExpandedQuestions,
        panoramicLoadStatus: loadStatus, setPanoramicLoadStatus: setLoadStatus,
        panoramicSelectedProject: selectedProject, setPanoramicSelectedProject: setSelectedProject
    } = DiscourseGraphToolkit.useToolkit();

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
    const toggleQuestion = (uid) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    const cleanTitle = (title, type) => {
        return (title || '').replace(new RegExp(`\\[\\[${type}\\]\\]\\s*-\\s*`), '');
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
        setLoadStatus('⏳ Buscando nodos raíz (GRI + QUE)...');
        setPanoramicData(null);

        try {
            // 1. Obtener todos los nodos raíz (GRI y QUE) del grafo
            const rootNodes = await DiscourseGraphToolkit.getAllRootNodes();
            setLoadStatus(`⏳ Encontrados ${rootNodes.length} nodos raíz. Cargando datos...`);

            // 2. Obtener datos completos de los nodos raíz
            const uids = rootNodes.map(q => q.pageUid);
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

            // 5.5 Construir set de nodos que son hijos de algún GRI (para excluirlos como raíz)
            const childNodeUids = new Set();
            Object.values(allNodes).forEach(node => {
                if (node.type === 'GRI' && node.contained_nodes) {
                    node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                }
            });

            // 6. Obtener proyectos de cada nodo raíz
            setLoadStatus('⏳ Obteniendo proyectos...');
            for (const q of rootNodes) {
                const project = await DiscourseGraphToolkit.getProjectFromNode(q.pageUid);
                if (allNodes[q.pageUid]) {
                    allNodes[q.pageUid].project = project;
                }
            }

            // 7. Filtrar GRI y QUE del resultado como nodos raíz (excluyendo hijos de otro GRI)
            const rootNodeResults = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
            }).map(node => ({
                ...node,
                project: allNodes[node.uid]?.project || null
            }));

            setPanoramicData({ questions: rootNodeResults, allNodes });
            // Guardar en cache
            DiscourseGraphToolkit.savePanoramicCache({ questions: rootNodeResults, allNodes });
            setCacheTimestamp(Date.now());
            const griCount = rootNodeResults.filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length;
            const queCount = rootNodeResults.filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'QUE').length;
            setLoadStatus(`✅ Cargados ${rootNodeResults.length} nodos raíz (${griCount} GRI, ${queCount} QUE) con ${Object.keys(allNodes).length} nodos totales.`);

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
                style: {
                    color: '#4CAF50',
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
                        style: {
                            color: '#ff9800',
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

    // --- Renderizar nodo contenido (recursivo) ---
    const renderContainedNode = (uid, allNodes, depth = 1, isLast = false, prefix = '') => {
        const node = allNodes[uid];
        if (!node) return null;

        const maxDepth = 7;
        if (depth > maxDepth) return React.createElement('div', { style: { color: '#999', fontSize: '0.6875rem', paddingLeft: `${depth}rem` } }, '...');

        const nodeType = node.type || DiscourseGraphToolkit.getNodeType(node.title);
        const icon = nodeType === 'QUE' ? '📝' : nodeType === 'GRI' ? '📂' : nodeType === 'EVD' ? '📎' : '📌';
        const color = nodeType === 'QUE' ? '#2196F3' : nodeType === 'GRI' ? '#6c5c99' : nodeType === 'EVD' ? '#ff9800' : '#4CAF50';
        const bgColor = nodeType === 'QUE' ? '#e3f2fd' : nodeType === 'GRI' ? '#ede9f6' : nodeType === 'EVD' ? '#fff3e0' : '#e8f5e9';

        // Determinar ramas/hijos según el tipo
        let childrenUids = [];
        if (nodeType === 'GRI') childrenUids = node.contained_nodes || [];
        else if (nodeType === 'QUE') childrenUids = [...(node.related_clms || []), ...(node.direct_evds || [])];
        else if (nodeType === 'CLM') childrenUids = [...(node.related_evds || []), ...(node.supporting_clms || [])];

        const connector = isLast ? '└─ ' : '├─ ';

        // Función auxiliar para renderizar el prefijo visual manteniendo el espaciado
        const renderPrefix = (pfx) => {
            return pfx.split('').map((char, i) => {
                if (char === ' ') return React.createElement('span', { key: i, style: { display: 'inline-block', width: '0.5rem' } });
                return React.createElement('span', { key: i, style: { display: 'inline-block', width: '0.5rem', textAlign: 'center' } }, char);
            });
        };

        const nextPrefix = prefix + (isLast ? '   ' : '│  ');

        const hasChildren = childrenUids.length > 0;
        const isExpanded = expandedQuestions[uid] === true;

        return React.createElement('div', { key: uid },
            // Fila del nodo actual
            React.createElement('div', {
                onClick: hasChildren ? (e) => { e.stopPropagation(); toggleQuestion(uid); } : undefined,
                style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '0.25rem',
                    cursor: hasChildren ? 'pointer' : 'default'
                }
            },
                React.createElement('div', {
                    style: {
                        color: '#ccc',
                        marginRight: '0.25rem',
                        fontSize: '0.6875rem',
                        fontFamily: 'monospace',
                        display: 'flex',
                        flexShrink: 0,
                        whiteSpace: 'pre'
                    }
                }, prefix + connector),

                // Icono de expandir/colapsar si tiene hijos
                hasChildren && React.createElement('span', {
                    style: { color: '#666', fontSize: '0.6rem', marginRight: '0.25rem', display: 'flex', alignItems: 'center', marginTop: '0.15rem' }
                }, isExpanded ? '▼' : '▶'),

                // Badge de tipo (solo para contenedores estructurales como QUE y GRI)
                (nodeType === 'QUE' || nodeType === 'GRI') && React.createElement('span', {
                    style: {
                        fontSize: '0.5rem',
                        fontWeight: 'bold',
                        color: color,
                        backgroundColor: bgColor,
                        padding: '0.0625rem 0.25rem',
                        borderRadius: '0.125rem',
                        marginRight: '0.25rem',
                        letterSpacing: '0.03em'
                    }
                }, nodeType),

                // Título del nodo
                React.createElement('span', {
                    style: {
                        color: color,
                        padding: '0.125rem 0.25rem',
                        borderRadius: '0.125rem',
                        backgroundColor: bgColor,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap'
                    },
                    title: node.title
                }, `${icon} ${cleanTitle(node.title, nodeType)}`)
            ),

            // Hijos recursivos
            hasChildren && isExpanded && React.createElement('div', null,
                childrenUids.map((childUid, index) =>
                    renderContainedNode(childUid, allNodes, depth + 1, index === childrenUids.length - 1, nextPrefix)
                )
            )
        );
    };

    // --- Renderizar un nodo raíz (QUE o GRI) con sus ramas ---
    const renderQuestion = (question, allNodes) => {
        const nodeType = DiscourseGraphToolkit.getNodeType(question.title) || 'QUE';
        const isExpanded = expandedQuestions[question.uid] === true; // Colapsado por defecto

        // Determinar ramas según el tipo
        let clms, directEvds, containedNodes, totalBranches;
        if (nodeType === 'GRI') {
            containedNodes = question.contained_nodes || [];
            clms = [];
            directEvds = [];
            totalBranches = containedNodes.length;
        } else {
            clms = question.related_clms || [];
            directEvds = question.direct_evds || [];
            containedNodes = [];
            totalBranches = clms.length + directEvds.length;
        }

        const borderColor = nodeType === 'GRI' ? '#6c5c99' : '#2196F3';
        const textColor = nodeType === 'GRI' ? '#6c5c99' : '#2196F3';
        const icon = nodeType === 'GRI' ? '📂' : '📝';
        const badgeBg = nodeType === 'GRI' ? '#ede9f6' : '#e3f2fd';

        return React.createElement('div', {
            key: question.uid,
            style: {
                marginBottom: '0.5rem',
                borderLeft: `3px solid ${borderColor}`,
                paddingLeft: '0.75rem',
                backgroundColor: '#fafafa',
                borderRadius: '0 0.25rem 0.25rem 0'
            }
        },
            // Header del nodo raíz
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
                // Badge de tipo (QUE/GRI)
                React.createElement('span', {
                    style: {
                        fontSize: '0.5625rem',
                        fontWeight: 'bold',
                        color: textColor,
                        backgroundColor: badgeBg,
                        padding: '0.0625rem 0.3rem',
                        borderRadius: '0.1875rem',
                        border: `1px solid ${borderColor}40`,
                        letterSpacing: '0.03em',
                        flexShrink: 0
                    }
                }, nodeType),
                React.createElement('span', {
                    style: {
                        color: textColor,
                        fontWeight: 'bold',
                        fontSize: '0.8125rem'
                    },
                    title: question.title
                }, `${icon} ${cleanTitle(question.title, nodeType)}`),
                React.createElement('span', {
                    style: {
                        fontSize: '0.625rem',
                        color: '#999',
                        backgroundColor: badgeBg,
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
                }, `${question.project}`)
            ),

            // Ramas (expandidas)
            isExpanded && React.createElement('div', {
                style: { paddingLeft: '1rem', paddingBottom: '0.5rem' }
            },
                // Renderizar todos los nodos contenidos directamente (que se encargarán de sus propios hijos recursivamente)
                nodeType === 'GRI' ?
                    containedNodes.map((cnUid, index) => renderContainedNode(cnUid, allNodes, 1, index === containedNodes.length - 1, '')) :
                    React.createElement(React.Fragment, null,
                        clms.map((clmUid, index) => renderContainedNode(clmUid, allNodes, 1, index === clms.length - 1 && directEvds.length === 0, '')),
                        directEvds.map((evdUid, index) => renderContainedNode(evdUid, allNodes, 1, index === directEvds.length - 1, ''))
                    ),

                // Mensaje si no hay ramas
                totalBranches === 0 && React.createElement('span', {
                    style: { color: '#999', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: '1.5rem' }
                }, nodeType === 'GRI' ? 'Sin nodos contenidos' : 'Sin respuestas')
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

    // --- Obtener lista jerárquica de proyectos (incluyendo prefijos intermedios) ---
    const getHierarchicalProjects = () => {
        if (!panoramicData) return [];
        const allPrefixes = new Set();
        const leafProjects = new Set();

        panoramicData.questions.forEach(q => {
            if (q.project) {
                // Agregar la rama completa (es una hoja)
                leafProjects.add(q.project);
                allPrefixes.add(q.project);
                // Agregar todos los prefijos intermedios
                const parts = q.project.split('/');
                for (let i = 1; i < parts.length; i++) {
                    allPrefixes.add(parts.slice(0, i).join('/'));
                }
            }
        });

        // Ordenar y agregar metadata (es grupo o hoja, contador)
        const sorted = Array.from(allPrefixes).sort();
        return sorted.map(prefix => {
            const isLeaf = leafProjects.has(prefix);
            const count = panoramicData.questions.filter(q =>
                q.project && (q.project === prefix || q.project.startsWith(prefix + '/'))
            ).length;
            const depth = prefix.split('/').length - 1;
            return { prefix, isLeaf, count, depth };
        });
    };

    const filteredQuestions = getFilteredQuestions();
    const hierarchicalProjects = getHierarchicalProjects();

    // --- Render ---
    return React.createElement('div', null,
        // Header con layout de dos columnas: título a la izquierda, controles a la derecha
        React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
                gap: '1rem'
            }
        },
            // Columna izquierda: título y descripción
            React.createElement('div', { style: { flex: '1' } },
                React.createElement('h3', { style: { marginTop: 0, marginBottom: '0.25rem' } }, 'Vista Panorámica'),
                React.createElement('p', { style: { color: '#666', margin: 0, fontSize: '0.875rem' } },
                    'Vista sintética de todas las ramas del grafo de discurso.')
            ),
            // Columna derecha: controles compactos
            React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.375rem',
                    flexShrink: 0
                }
            },
                // Fila 1: Botón cargar + dropdown
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        disabled: isLoading,
                        style: {
                            padding: '0.375rem 0.75rem',
                            backgroundColor: isLoading ? (DiscourseGraphToolkit.THEME?.colors?.neutral || '#ccc') : (DiscourseGraphToolkit.THEME?.colors?.primary || '#2196F3'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }
                    }, isLoading ? '⏳...' : '🔄 Cargar'),
                    // Filtro de proyecto (jerárquico)
                    panoramicData && hierarchicalProjects.length > 0 && React.createElement('select', {
                        value: selectedProject,
                        onChange: (e) => setSelectedProject(e.target.value),
                        style: {
                            padding: '0.25rem 0.375rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            fontSize: '0.6875rem',
                            maxWidth: '250px'
                        }
                    },
                        React.createElement('option', { value: '' }, `Todos (${panoramicData.questions.length})`),
                        hierarchicalProjects.map(p => {
                            const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(p.depth);
                            const icon = '';
                            const label = p.prefix.split('/').pop(); // Solo mostrar el último segmento
                            return React.createElement('option', {
                                key: p.prefix,
                                value: p.prefix
                            }, `${indent}${icon} ${label} (${p.count})`);
                        })
                    )
                ),
                // Fila 2: Botones expandir/colapsar
                panoramicData && React.createElement('div', { style: { display: 'flex', gap: '0.375rem' } },
                    React.createElement('button', {
                        onClick: () => {
                            const allExpanded = {};
                            // Expandir raíces
                            filteredQuestions.forEach(q => allExpanded[q.uid] = true);
                            // Expandir todos los nodos internos que tengan hijos
                            Object.values(panoramicData.allNodes).forEach(node => {
                                const nType = node.type || DiscourseGraphToolkit.getNodeType(node.title);
                                let hasCh = false;
                                if (nType === 'GRI') hasCh = (node.contained_nodes || []).length > 0;
                                else if (nType === 'QUE') hasCh = ((node.related_clms || []).length + (node.direct_evds || []).length) > 0;
                                else if (nType === 'CLM') hasCh = ((node.related_evds || []).length + (node.supporting_clms || []).length) > 0;

                                if (hasCh) allExpanded[node.uid] = true;
                            });
                            setExpandedQuestions(allExpanded);
                        },
                        style: {
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.6875rem',
                            backgroundColor: DiscourseGraphToolkit.THEME?.colors?.secondary || '#f5f5f5'
                        }
                    }, '➕ Expandir'),
                    React.createElement('button', {
                        onClick: () => setExpandedQuestions({}),
                        style: {
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.6875rem',
                            backgroundColor: DiscourseGraphToolkit.THEME?.colors?.secondary || '#f5f5f5'
                        }
                    }, '➖ Colapsar')
                ),
                // Fila 3: Cache info (si existe)
                cacheTimestamp && !isLoading && React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.625rem',
                        color: DiscourseGraphToolkit.THEME?.colors?.warning || '#f57c00'
                    }
                },
                    React.createElement('span', null, `📦 ${formatTimeAgo(cacheTimestamp)}`),
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: DiscourseGraphToolkit.THEME?.colors?.warning || '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.5625rem'
                        }
                    }, '🔄')
                ),
                // Fila 4: Estadísticas compactas
                panoramicData && React.createElement('div', {
                    style: { display: 'flex', gap: '0.375rem' }
                },
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: DiscourseGraphToolkit.THEME?.colors?.secondaryHover || '#e3f2fd',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: DiscourseGraphToolkit.THEME?.colors?.primaryHover || '#2196F3'
                        }
                    }, `📝 ${filteredQuestions.filter(n => (DiscourseGraphToolkit.getNodeType(n.title) || 'QUE') === 'QUE').length}`),
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#ede9f6',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: '#6c5c99'
                        }
                    }, `📂 ${filteredQuestions.filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length}`),
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: DiscourseGraphToolkit.THEME?.colors?.successHover || '#e8f5e9',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: DiscourseGraphToolkit.THEME?.colors?.success || '#4CAF50'
                        }
                    }, `📌 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'CLM').length}`),
                    React.createElement('span', {
                        style: {
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#fff3e0',
                            borderRadius: '0.5rem',
                            fontSize: '0.625rem',
                            color: '#ff9800'
                        }
                    }, `📎 ${Object.values(panoramicData.allNodes).filter(n => n.type === 'EVD').length}`)
                )
            )
        ),

        // Status (compacto, solo si hay mensajes de carga activa)
        loadStatus && !loadStatus.includes('📦') && React.createElement('div', {
            style: {
                marginBottom: '0.5rem',
                padding: '0.375rem 0.625rem',
                backgroundColor: loadStatus.includes('✅') ? '#e8f5e9' :
                    loadStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                borderRadius: '0.25rem',
                fontWeight: 'bold',
                fontSize: '0.75rem'
            }
        }, loadStatus),

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
            React.createElement('p', { style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, ''),
            React.createElement('p', null, 'Haz clic en "Cargar Panorámica" para visualizar todas las ramas del grafo.')
        )
    );
};
