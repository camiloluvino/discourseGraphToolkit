// ============================================================================
// UI: Panoramic Tab Component
// Vista sintética de todas las ramas del grafo de discurso
// ============================================================================

DiscourseGraphToolkit.PanoramicTab = function () {
    const React = window.React;

    // Desestructurar de los contextos específicos
    const { projects } = DiscourseGraphToolkit.useProjects();
    const {
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions: expandedQuestions, setPanoramicExpandedQuestions: setExpandedQuestions,
        panoramicLoadStatus: loadStatus, setPanoramicLoadStatus: setLoadStatus,
        panoramicSelectedProject: selectedProject, setPanoramicSelectedProject: setSelectedProject
    } = DiscourseGraphToolkit.usePanoramic();

    // Estado de carga (local, no necesita persistir)
    const [isLoading, setIsLoading] = React.useState(false);
    const loadAttemptedRef = React.useRef(false);

    // Orden de nodos (solo lectura — se edita en Exportación › Paso 3)
    const [orderedQuestionUIDs, setOrderedQuestionUIDs] = React.useState([]);
    const [orderedGroupKeys, setOrderedGroupKeys] = React.useState([]);

    // Estado para tracking del timestamp del cache
    const [cacheTimestamp, setCacheTimestamp] = React.useState(null);

    // --- Estado D&D ---
    const [dragType, setDragType] = React.useState(null); // 'group' | 'node'
    const [dragGroupKey, setDragGroupKey] = React.useState(null);
    const [dragIdx, setDragIdx] = React.useState(null);
    const [dragOverIdx, setDragOverIdx] = React.useState(null);

    // --- D&D handlers para grupos ---
    const handleGroupDragStart = (e, idx) => { setDragType('group'); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleGroupDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleGroupDragOver = (e) => { e.preventDefault(); };
    const handleGroupDragEnd = () => { setDragType(null); setDragIdx(null); setDragOverIdx(null); };
    const handleGroupDrop = (e, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) { handleGroupDragEnd(); return; }
        const newGroups = [...orderedGroupKeys];
        const [item] = newGroups.splice(dragIdx, 1);
        newGroups.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        setOrderedGroupKeys(newGroups);
        DiscourseGraphToolkit.saveGroupOrder(selectedProject, newGroups);
        handleGroupDragEnd();
    };

    // --- D&D handlers para nodos ---
    const handleNodeDragStart = (e, groupKey, idx) => { setDragType('node'); setDragGroupKey(groupKey); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleNodeDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleNodeDragOver = (e) => { e.preventDefault(); };
    const handleNodeDragEnd = () => { setDragType(null); setDragGroupKey(null); setDragIdx(null); setDragOverIdx(null); };
    const handleNodeDrop = (e, groupKey, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx || dragGroupKey !== groupKey) { handleNodeDragEnd(); return; }
        
        let targetList = groupKey ? orderedQuestionUIDsForGroup(groupKey) : [...orderedQuestionUIDs];
        
        const [item] = targetList.splice(dragIdx, 1);
        targetList.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        
        if (groupKey) {
            DiscourseGraphToolkit.saveQuestionOrder(groupKey, targetList);
            // We force a re-render of this specific group by updating a dummy state or relying on the fact that we can just update the group Nodes in cache. Wait.
            // In grouped mode, we don't have a single orderedQuestionUIDs array. Let's just save it to localStorage and trigger a re-render by updating a timestamp.
            setCacheTimestamp(Date.now());
        } else {
            setOrderedQuestionUIDs(targetList);
            DiscourseGraphToolkit.saveQuestionOrder(selectedProject, targetList);
        }
        handleNodeDragEnd();
    };

    const orderedQuestionUIDsForGroup = (groupKey) => {
        const groupNodes = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === groupKey || q.project.startsWith(groupKey + '/');
        });
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(groupKey);
        if (savedOrder && savedOrder.length > 0) {
            const validSaved = savedOrder.filter(uid => groupNodes.some(q => q.uid === uid));
            const newUids = groupNodes.filter(q => !savedOrder.includes(q.uid)).map(q=>q.uid);
            return [...validSaved, ...newUids];
        }
        return groupNodes.map(q=>q.uid);
    };


    // --- Computar sub-proyectos inmediatos y modo agrupado ---
    const immediateSubProjects = React.useMemo(() => {
        if (!panoramicData || !selectedProject) return [];
        const selectedDepth = selectedProject.split('/').length;
        const subProjects = new Set();
        Object.values(panoramicData.allNodes).forEach(node => {
            if (node.project && node.project.startsWith(selectedProject + '/')) {
                const parts = node.project.split('/');
                if (parts.length > selectedDepth) {
                    const immediateChild = parts.slice(0, selectedDepth + 1).join('/');
                    subProjects.add(immediateChild);
                }
            }
        });
        return Array.from(subProjects).sort();
    }, [panoramicData, selectedProject]);

    const isGroupedMode = selectedProject && immediateSubProjects.length > 0;

    // Cargar orden guardado (escrito por ExportTab › Paso 3) cuando cambia el proyecto
    React.useEffect(() => {
        if (!panoramicData || !selectedProject) {
            setOrderedQuestionUIDs([]);
            setOrderedGroupKeys([]);
            return;
        }
        if (isGroupedMode) {
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(selectedProject);
            if (savedGroupOrder && savedGroupOrder.length > 0) {
                const valid = savedGroupOrder.filter(g => immediateSubProjects.includes(g));
                const newOnes = immediateSubProjects.filter(g => !savedGroupOrder.includes(g));
                setOrderedGroupKeys([...valid, ...newOnes]);
            } else {
                setOrderedGroupKeys([...immediateSubProjects]);
            }
            setOrderedQuestionUIDs([]);
        } else {
            const projectQuestions = panoramicData.questions.filter(q => {
                if (!q.project) return false;
                return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
            });
            const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(selectedProject);
            if (savedOrder && savedOrder.length > 0) {
                const ordered = savedOrder.filter(uid => projectQuestions.some(q => q.uid === uid));
                const unseen = projectQuestions.filter(q => !savedOrder.includes(q.uid)).map(q => q.uid);
                setOrderedQuestionUIDs([...ordered, ...unseen]);
            } else {
                setOrderedQuestionUIDs(projectQuestions.map(q => q.uid));
            }
            setOrderedGroupKeys([]);
        }
    }, [panoramicData, selectedProject, isGroupedMode, immediateSubProjects.length]);


    // --- Helpers ---
    const cleanTitle = (title, type) => {
        return (title || '').replace(new RegExp(`\\[\\[${type}\\]\\]\\s*-\\s*`), '');
    };

    const renderMarkdownTitle = (text) => {
        if (!text) return null;
        // Divide el texto por secuencias de negrita (**texto** o __texto__)
        const parts = text.split(/(\*\*.*?\*\*|__.*?__)/g);
        return parts.map((part, index) => {
            if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
                return React.createElement('strong', { key: index }, part.slice(2, -2));
            }
            return part; // Texto normal (String)
        });
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
    const relevanceCache = React.useMemo(() => new Map(), [panoramicData, selectedProject]);

    const isNodeRelevant = React.useCallback((uid, allNodes, targetProject, visited = new Set()) => {
        if (!targetProject) return true;
        if (relevanceCache.has(uid)) return relevanceCache.get(uid);
        if (visited.has(uid)) return false;

        visited.add(uid);
        const node = allNodes[uid];
        if (!node) return false;

        // Is it a direct match?
        if (node.project && (node.project === targetProject || node.project.startsWith(targetProject + '/'))) {
            relevanceCache.set(uid, true);
            return true;
        }

        // Check descendants
        const nodeType = node.type || DiscourseGraphToolkit.getNodeType(node.title);
        let childrenUids = [];
        if (nodeType === 'GRI') {
            childrenUids = [
                ...(node.contained_nodes || []),
                ...(node.related_clms || []),
                ...(node.direct_evds || []),
                ...(node.related_gris || []),
                ...(node.supporting_clms || []),
                ...(node.related_evds || []),
                ...(node.supporting_gris || []),
                ...(node.connected_clms || []),
                ...(node.connected_gris || [])
            ];
        } else if (nodeType === 'QUE') {
            childrenUids = [
                ...(node.related_clms || []),
                ...(node.direct_evds || []),
                ...(node.related_gris || [])
            ];
        } else if (nodeType === 'CLM') {
            childrenUids = [
                ...(node.related_evds || []),
                ...(node.supporting_clms || []),
                ...(node.supporting_gris || [])
            ];
        }

        for (const childUid of childrenUids) {
            if (isNodeRelevant(childUid, allNodes, targetProject, new Set(visited))) {
                relevanceCache.set(uid, true);
                return true;
            }
        }

        relevanceCache.set(uid, false);
        return false;
    }, [relevanceCache]);

    // --- Cargar datos panorámicos ---
    const handleLoadPanoramic = React.useCallback(async () => {
        setIsLoading(true);
        setLoadStatus('⏳ Buscando nodos raíz (GRI + QUE)...');

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

            // 4. Analizar dependencias y cargar nodos faltantes RECURSIVAMENTE
            setLoadStatus('⏳ Analizando relaciones...');

            let missingUids = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            missingUids = [...missingUids].filter(uid => !allNodes[uid]);

            let depth = 0;
            const maxDepth = 5; // Evitar loops infinitos en caso de referencias circulares muy complejas

            while (missingUids.length > 0 && depth < maxDepth) {
                setLoadStatus(`⏳ Cargando ${missingUids.length} nodos relacionados (nivel ${depth + 1})...`);
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, true, false);

                const newNodesFetched = [];
                extraData.data.forEach(node => {
                    if (node.uid && !allNodes[node.uid]) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                        newNodesFetched.push(node);
                    }
                });

                // Buscar si los nuevos nodos traen más dependencias
                const newDependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(newNodesFetched);
                missingUids = [...newDependencies].filter(uid => !allNodes[uid]);
                depth++;
            }

            if (depth === maxDepth && missingUids.length > 0) {
                console.warn(`Vista Panorámica: Se alcanzó la profundidad máxima de relaciones anidadas, faltan ${missingUids.length} referencias.`);
            }

            // 5. Mapear relaciones
            console.log(`📊 Vista Panorámica (v${DiscourseGraphToolkit.VERSION}): ${Object.keys(allNodes).length} nodos en allNodes antes de mapear relaciones.`);
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // 5.1 Debug: Verificar que las relaciones se mapearon correctamente
            const clmsWithSupporting = Object.values(allNodes).filter(n => n.type === 'CLM' && (n.supporting_clms || []).length > 0);
            const clmsWithEvds = Object.values(allNodes).filter(n => n.type === 'CLM' && (n.related_evds || []).length > 0);
            console.log(`📊 CLMs con supporting_clms: ${clmsWithSupporting.length}, CLMs con related_evds: ${clmsWithEvds.length}`);

            // 5.5 Construir set de nodos que son hijos de algún nodo (para excluirlos como raíz)
            const childNodeUids = new Set();
            Object.values(allNodes).forEach(node => {
                if (node.contained_nodes) node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                if (node.related_clms) node.related_clms.forEach(uid => childNodeUids.add(uid));
                if (node.direct_evds) node.direct_evds.forEach(uid => childNodeUids.add(uid));
                if (node.related_gris) node.related_gris.forEach(uid => childNodeUids.add(uid));
                if (node.supporting_clms) node.supporting_clms.forEach(uid => childNodeUids.add(uid));
                if (node.supporting_gris) node.supporting_gris.forEach(uid => childNodeUids.add(uid));
                if (node.related_evds) node.related_evds.forEach(uid => childNodeUids.add(uid));
                if (node.connected_clms) node.connected_clms.forEach(uid => childNodeUids.add(uid));
                if (node.connected_gris) node.connected_gris.forEach(uid => childNodeUids.add(uid));
            });

            // 6. Obtener proyectos de *todos* los nodos cargados en allNodes
            setLoadStatus('⏳ Obteniendo proyectos...');
            const allNodeUids = Object.keys(allNodes);

            // Usar query en bloque para mayor eficiencia
            const PM = DiscourseGraphToolkit.ProjectManager;
            const escapedPattern = PM.getEscapedFieldPattern();
            const projectQuery = `[:find ?page-uid ?string
                                   :in $ [?page-uid ...]
                                   :where 
                                   [?page :block/uid ?page-uid]
                                   [?page :block/children ?block]
                                   [?block :block/string ?string]
                                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            try {
                const projectResults = await window.roamAlphaAPI.data.async.q(projectQuery, allNodeUids);
                const fieldPattern = PM.getFieldPattern();
                const regex = PM.getFieldRegex();

                projectResults.forEach(r => {
                    const docUid = r[0];
                    const blockString = r[1];
                    if (!DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                        const match = blockString.match(regex);
                        if (match && allNodes[docUid]) {
                            allNodes[docUid].project = match[1].trim();
                        }
                    }
                });
            } catch (e) {
                console.warn("No se pudieron obtener los proyectos en bulk:", e);
                // Fallback: procesar uno a uno los rootNodes
                for (const q of rootNodes) {
                    const project = await DiscourseGraphToolkit.getProjectFromNode(q.pageUid);
                    if (allNodes[q.pageUid]) {
                        allNodes[q.pageUid].project = project;
                    }
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
    }, [setPanoramicData, setLoadStatus]);

    // Efecto para restaurar cache al montar y autocargar si no hay datos
    React.useEffect(() => {
        if (!panoramicData && !loadAttemptedRef.current) {
            loadAttemptedRef.current = true;
            const cached = DiscourseGraphToolkit.loadPanoramicCache();
            if (cached && cached.panoramicData) {
                setPanoramicData(cached.panoramicData);
                setCacheTimestamp(cached.timestamp);
                setLoadStatus(`📦 Datos restaurados del cache.`);
            }
            handleLoadPanoramic();
        }
    }, [panoramicData, handleLoadPanoramic, setPanoramicData, setLoadStatus]);

    // --- Renderizar un nodo raíz (QUE o GRI) como fila plana ---
    const renderQuestion = (question, allNodes, showDragHandle = false, qIndex = -1, groupKey = null) => {
        const isNodeDragOver = dragType === 'node' && dragGroupKey === groupKey && dragOverIdx === qIndex;
        const nodeType = DiscourseGraphToolkit.getNodeType(question.title) || 'QUE';
        const badgeClass = nodeType === 'GRI' ? 'dgt-badge-info' : 'dgt-badge-neutral';

        let displayProject = question.project;
        if (selectedProject && question.project && question.project.startsWith(selectedProject)) {
            displayProject = question.project.substring(selectedProject.length).replace(/^\//, '');
        }

        return React.createElement('div', {
            key: question.uid,
            draggable: true,
            onDragStart: e => handleNodeDragStart(e, groupKey, qIndex),
            onDragEnter: e => handleNodeDragEnter(e, qIndex),
            onDragOver: handleNodeDragOver,
            onDragEnd: handleNodeDragEnd,
            onDrop: e => handleNodeDrop(e, groupKey, qIndex),
            style: { 
                borderTop: isNodeDragOver ? '2px dashed var(--dgt-accent-purple)' : '1px solid var(--dgt-border-color)', 
                opacity: dragType === 'node' && dragGroupKey === groupKey && dragIdx === qIndex ? 0.4 : 1,
                cursor: 'grab'
            },
            className: `dgt-panoramic-root dgt-panoramic-root-${nodeType.toLowerCase()}`
        },
            React.createElement('div', {
                className: 'dgt-panoramic-node-row',
                style: { padding: '8px 8px 8px 0', gap: '6px' }
            },
                // Badge de tipo (QUE/GRI)
                React.createElement('span', {
                    className: `dgt-badge ${badgeClass}`,
                    style: { flexShrink: 0, marginTop: '2px' }
                }, nodeType),
                React.createElement('span', {
                    className: 'dgt-text-primary dgt-text-bold',
                    style: { fontSize: '0.8125rem', flex: 1, wordBreak: 'break-word' },
                    title: question.title
                }, renderMarkdownTitle(cleanTitle(question.title, nodeType))),
                displayProject && React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral',
                    style: { fontSize: '0.625rem', backgroundColor: 'transparent', border: '1px solid var(--dgt-border-color)' }
                }, displayProject)
            )
        );
    };

    // --- Obtener nodos ordenados para un sub-proyecto específico ---
    const getOrderedNodesForGroup = (groupKey) => {
        if (!panoramicData) return [];
        // Obtener nodos que pertenecen a este grupo (o a sus sub-sub-proyectos)
        const groupNodes = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === groupKey || q.project.startsWith(groupKey + '/');
        });
        
        // Intentar cargar el orden guardado para este sub-proyecto
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(groupKey);
        if (savedOrder && savedOrder.length > 0) {
            const orderedNodes = savedOrder
                .map(uid => groupNodes.find(q => q.uid === uid))
                .filter(Boolean);
            const newNodes = groupNodes.filter(q => !savedOrder.includes(q.uid));
            return [...orderedNodes, ...newNodes];
        }
        return groupNodes;
    };

    // --- Renderizar un grupo de sub-proyecto (solo lectura) ---
    const renderSubProjectGroup = (groupKey, groupIndex) => {
        const isGroupDragOver = dragType === 'group' && dragOverIdx === groupIndex;
        const groupNodes = getOrderedNodesForGroup(groupKey);
        const groupLabel = groupKey.split('/').pop();
        const isExpanded = expandedQuestions[`group:${groupKey}`] === true;

        return React.createElement('div', {
            key: groupKey,
            draggable: true,
            onDragStart: e => handleGroupDragStart(e, groupIndex),
            onDragEnter: e => handleGroupDragEnter(e, groupIndex),
            onDragOver: handleGroupDragOver,
            onDragEnd: handleGroupDragEnd,
            onDrop: e => handleGroupDrop(e, groupIndex),
            style: { 
                border: isGroupDragOver ? '2px dashed var(--dgt-accent-purple)' : undefined,
                opacity: dragType === 'group' && dragIdx === groupIndex ? 0.4 : 1,
                cursor: 'grab'
            },
            className: 'dgt-panoramic-group'
        },
            // Header del grupo
            React.createElement('div', {
                className: 'dgt-panoramic-group-header',
                onClick: () => {
                    setExpandedQuestions(prev => {
                        const key = `group:${groupKey}`;
                        const newState = { ...prev, [key]: !prev[key] };
                        DiscourseGraphToolkit.savePanoramicExpandedQuestions(newState);
                        return newState;
                    });
                }
            },
                // Flecha de expandir/colapsar
                React.createElement('span', {
                    className: 'dgt-text-muted',
                    style: { fontSize: '0.6rem', width: '0.75rem', display: 'flex', alignItems: 'center', flexShrink: 0 }
                }, isExpanded ? '▼' : '▶'),

                // Nombre del grupo
                React.createElement('span', {
                    className: 'dgt-text-primary dgt-text-bold',
                    style: { fontSize: '0.875rem', flex: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }
                }, groupLabel),

                // Contador de nodos
                React.createElement('span', {
                    className: 'dgt-badge dgt-badge-neutral',
                    style: { fontSize: '0.625rem' }
                }, `${groupNodes.length} nodo${groupNodes.length !== 1 ? 's' : ''}`),

                // Botón de navegación al sub-proyecto
                React.createElement('button', {
                    className: 'dgt-panoramic-group-nav',
                    title: `Ir a ${groupKey}`,
                    onClick: (e) => {
                        e.stopPropagation();
                        setSelectedProject(groupKey);
                    }
                }, '→')
            ),

            // Cuerpo expandible con los nodos del grupo
            isExpanded && React.createElement('div', {
                className: 'dgt-panoramic-group-body'
            },
                groupNodes.length > 0
                    ? groupNodes.map((q, idx) => renderQuestion(q, panoramicData.allNodes, false, idx, groupKey))
                    : React.createElement('span', {
                        className: 'dgt-text-muted dgt-text-xs',
                        style: { fontStyle: 'italic', padding: '8px' }
                    }, 'Sin nodos en este sub-proyecto')
            )
        );
    };

    // --- Filtrar preguntas por proyecto (respetando orden) — para modo INDIVIDUAL ---
    const getFilteredQuestions = () => {
        if (!panoramicData) return [];
        if (!selectedProject) return panoramicData.questions;
        // Si hay orden guardado, usarlo
        if (orderedQuestionUIDs.length > 0) {
            return orderedQuestionUIDs
                .map(uid => panoramicData.questions.find(q => q.uid === uid))
                .filter(Boolean)
                .filter(q => isNodeRelevant(q.uid, panoramicData.allNodes, selectedProject));
        }
        return panoramicData.questions.filter(q => isNodeRelevant(q.uid, panoramicData.allNodes, selectedProject));
    };

    // --- Computar breadcrumbs del proyecto seleccionado ---
    const breadcrumbSegments = React.useMemo(() => {
        if (!selectedProject) return [];
        const parts = selectedProject.split('/');
        return parts.map((part, index) => ({
            label: part,
            path: parts.slice(0, index + 1).join('/')
        }));
    }, [selectedProject]);

    // --- Computar hijos directos con sus conteos ---
    const directChildProjects = React.useMemo(() => {
        if (!panoramicData) return [];
        const parentPrefix = selectedProject || '';
        const parentDepth = parentPrefix ? parentPrefix.split('/').length : 0;
        const childrenMap = new Map();

        Object.values(panoramicData.allNodes).forEach(node => {
            if (!node.project) return;
            const parts = node.project.split('/');
            if (parentPrefix) {
                if (node.project.startsWith(parentPrefix + '/') && parts.length > parentDepth) {
                    const childPath = parts.slice(0, parentDepth + 1).join('/');
                    childrenMap.set(childPath, (childrenMap.get(childPath) || 0) + 1);
                }
            } else {
                const rootPath = parts[0];
                childrenMap.set(rootPath, (childrenMap.get(rootPath) || 0) + 1);
            }
        });

        return Array.from(childrenMap.entries())
            .map(([path, count]) => ({ path, label: path.split('/').pop(), count }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [panoramicData, selectedProject]);

    const filteredQuestions = isGroupedMode ? [] : getFilteredQuestions();

    // --- Render ---
    return React.createElement('div', { className: 'dgt-panoramic-split-layout' },
        // PANEL IZQUIERDO: Sidebar de Navegación por Proyectos
        panoramicData && React.createElement('div', { className: 'dgt-panoramic-sidebar' },
            // Sección 1: Ruta Actual (Breadcrumbs)
            React.createElement('div', { className: 'dgt-panoramic-sidebar-section' },
                React.createElement('div', { className: 'dgt-panoramic-sidebar-title' }, '📍 Ruta Actual'),
                React.createElement('div', { className: 'dgt-panoramic-breadcrumbs' },
                    React.createElement('span', {
                        className: selectedProject === '' ? 'dgt-panoramic-breadcrumb-current' : 'dgt-panoramic-breadcrumb-item',
                        onClick: () => setSelectedProject('')
                    }, `Todos (${panoramicData.questions.length})`),
                    
                    breadcrumbSegments.map((seg, idx) => {
                        const isLast = idx === breadcrumbSegments.length - 1;
                        return React.createElement(React.Fragment, { key: seg.path },
                            React.createElement('span', { className: 'dgt-panoramic-breadcrumb-separator' }, '›'),
                            React.createElement('span', {
                                className: isLast ? 'dgt-panoramic-breadcrumb-current' : 'dgt-panoramic-breadcrumb-item',
                                onClick: () => setSelectedProject(seg.path)
                            }, seg.label)
                        );
                    })
                )
            ),

            // Sección 2: Subproyectos (Lista vertical limpia a 1 clic)
            directChildProjects.length > 0 && React.createElement('div', { className: 'dgt-panoramic-sidebar-section' },
                React.createElement('div', { className: 'dgt-panoramic-sidebar-title' }, '📁 Subproyectos'),
                directChildProjects.map(c => React.createElement('div', {
                    key: c.path,
                    className: `dgt-panoramic-sidebar-item ${selectedProject === c.path ? 'active' : ''}`,
                    onClick: () => setSelectedProject(c.path),
                    title: `Ir a ${c.path}`
                },
                    React.createElement('span', { className: 'dgt-text-truncate', style: { flex: 1 } }, c.label),
                    React.createElement('span', { className: 'dgt-panoramic-sidebar-count' }, `(${c.count})`)
                ))
            )
        ),

        // PANEL DERECHO: Contenido Principal
        React.createElement('div', { className: 'dgt-panoramic-main' },
            // Header global (Título y Actualizar)
            React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm', style: { alignItems: 'center', flexShrink: 0 } },
                React.createElement('h3', { className: 'dgt-mb-0', style: { marginTop: 0 } }, 'Vista Panorámica'),
                React.createElement('button', {
                    onClick: handleLoadPanoramic,
                    disabled: isLoading,
                    className: 'dgt-btn-ghost dgt-text-xs',
                    title: 'Actualizar datos desde Roam',
                    style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', padding: '3px 8px' }
                }, isLoading ? '⏳ Actualizando...' : '🔄 Actualizar')
            ),

            // Barra de herramientas de la lista (Status + Acciones)
            panoramicData && React.createElement('div', { className: 'dgt-panoramic-toolbar', style: { flexShrink: 0 } },
                // Status de carga
                React.createElement('div', { style: { flex: '1', minWidth: 0 } },
                    loadStatus && !loadStatus.includes('📦') && React.createElement('span', {
                        className: `dgt-text-xs dgt-text-bold ${loadStatus.includes('✅') ? 'dgt-text-success' : loadStatus.includes('❌') ? 'dgt-text-error' : 'dgt-text-muted'}`
                    }, loadStatus)
                ),
                // Botones y estadísticas
                React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs', style: { flexShrink: 0 } },
                    React.createElement('button', {
                        onClick: () => {
                            const allExpanded = {};
                            if (isGroupedMode) {
                                orderedGroupKeys.forEach(gk => allExpanded[`group:${gk}`] = true);
                            }
                            setExpandedQuestions(allExpanded);
                            DiscourseGraphToolkit.savePanoramicExpandedQuestions(allExpanded);
                        },
                        className: 'dgt-btn-ghost dgt-text-xs',
                        style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', padding: '2px 6px' }
                    }, '➕ Expandir'),
                    React.createElement('button', {
                        onClick: () => {
                            setExpandedQuestions({});
                            DiscourseGraphToolkit.savePanoramicExpandedQuestions({});
                        },
                        className: 'dgt-btn-ghost dgt-text-xs',
                        style: { border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-sm)', padding: '2px 6px' }
                    }, '➖ Colapsar'),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `QUE: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => (DiscourseGraphToolkit.getNodeType(n.title) || 'QUE') === 'QUE').length}`),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `GRI: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length}`)
                )
            ),

            // Indicador de modo agrupado
            isGroupedMode && React.createElement('div', {
                className: 'dgt-p-sm dgt-mb-sm dgt-text-xs',
                style: { backgroundColor: 'rgba(108, 92, 153, 0.06)', borderRadius: 'var(--dgt-radius-sm)', border: '1px solid rgba(108, 92, 153, 0.15)', color: 'var(--dgt-accent-purple)', flexShrink: 0 }
            }, `📦 Vista agrupada: ${orderedGroupKeys.length} sub-proyecto${orderedGroupKeys.length !== 1 ? 's' : ''}. Arrastra los bloques para reordenar.`),

            // Lista de contenido principal
            panoramicData && React.createElement('div', { className: 'dgt-list-container dgt-p-sm', style: { flex: 1, overflowY: 'auto' } },
                isGroupedMode
                    // Modo agrupado: renderizar grupos de sub-proyectos
                    ? (orderedGroupKeys.length > 0
                        ? orderedGroupKeys.map((gk, index) => renderSubProjectGroup(gk, index))
                        : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                            'No hay sub-proyectos para mostrar.')
                    )
                    // Modo individual: renderizar nodos planos (comportamiento original)
                    : (filteredQuestions.length > 0
                        ? filteredQuestions.map((q, index) => renderQuestion(q, panoramicData.allNodes, true, index, null))
                        : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                            'No hay preguntas para mostrar' + (selectedProject ? ' en este proyecto.' : '.'))
                    )
            ),

            // Mensaje inicial de carga
            !panoramicData && isLoading && React.createElement('div', {
                className: 'dgt-p-md dgt-text-muted dgt-text-center',
                style: {
                    backgroundColor: 'var(--dgt-bg-primary)',
                    borderRadius: 'var(--dgt-radius-sm)',
                    border: '1px dashed var(--dgt-border-focus)'
                }
            },
                React.createElement('p', null, '⏳ Cargando vista panorámica...')
            )
        )
    );
};
