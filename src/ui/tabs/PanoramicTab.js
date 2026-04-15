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

    // Estados para selector de proyectos colapsable
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
    const [expandedProjectFolders, setExpandedProjectFolders] = React.useState({});
    const projectDropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Estado local para el orden de preguntas (modo individual)
    const [orderedQuestionUIDs, setOrderedQuestionUIDs] = React.useState([]);

    // Estado local para el orden de grupos (modo agrupado)
    const [orderedGroupKeys, setOrderedGroupKeys] = React.useState([]);

    // Estados para Drag & Drop
    const [dragItemIndex, setDragItemIndex] = React.useState(null);
    const [dragOverItemIndex, setDragOverItemIndex] = React.useState(null);

    // Estado para tracking del timestamp del cache
    const [cacheTimestamp, setCacheTimestamp] = React.useState(null);

    // --- Computar sub-proyectos inmediatos y modo agrupado ---
    const immediateSubProjects = React.useMemo(() => {
        if (!panoramicData || !selectedProject) return [];
        // Buscar sub-proyectos directos (profundidad = selectedProject.depth + 1)
        const selectedDepth = selectedProject.split('/').length;
        const subProjects = new Set();

        Object.values(panoramicData.allNodes).forEach(node => {
            if (node.project && node.project.startsWith(selectedProject + '/')) {
                // Extraer el sub-proyecto inmediato
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

    // --- Helpers de Reordenamiento (Drag & Drop) ---
    const handleDragStart = (e, index) => {
        setDragItemIndex(index);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    };

    const handleDragEnter = (e, index) => {
        e.preventDefault();
        // Evitar triggers extras si ya es el mismo
        if (index !== dragOverItemIndex) setDragOverItemIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necesario para permitir el drop
    };

    const handleDragEnd = () => {
        setDragItemIndex(null);
        setDragOverItemIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (dragItemIndex === null || dropIndex === null || !selectedProject) return;
        
        if (dragItemIndex !== dropIndex) {
            if (isGroupedMode) {
                // Modo agrupado: reordenar grupos
                const newOrder = [...orderedGroupKeys];
                const draggedItem = newOrder.splice(dragItemIndex, 1)[0];
                let insertIndex = dropIndex;
                if (dragItemIndex < dropIndex) {
                    insertIndex = dropIndex - 1;
                }
                if (insertIndex < 0) insertIndex = 0;
                newOrder.splice(insertIndex, 0, draggedItem);
                setOrderedGroupKeys(newOrder);
                DiscourseGraphToolkit.saveGroupOrder(selectedProject, newOrder);
            } else {
                // Modo individual: reordenar nodos
                const newOrder = [...orderedQuestionUIDs];
                const draggedItem = newOrder.splice(dragItemIndex, 1)[0];
                let insertIndex = dropIndex;
                if (dragItemIndex < dropIndex) {
                    insertIndex = dropIndex - 1;
                }
                if (insertIndex < 0) insertIndex = 0;
                newOrder.splice(insertIndex, 0, draggedItem);
                setOrderedQuestionUIDs(newOrder);
                DiscourseGraphToolkit.saveQuestionOrder(selectedProject, newOrder.map(uid => ({ uid })));
            }
        }
        
        setDragItemIndex(null);
        setDragOverItemIndex(null);
    };

    // Efecto para cargar/sincronizar orden cuando cambia el proyecto o los datos
    React.useEffect(() => {
        if (!panoramicData || !selectedProject) {
            setOrderedQuestionUIDs([]);
            setOrderedGroupKeys([]);
            return;
        }

        if (isGroupedMode) {
            // Modo agrupado: cargar orden de grupos
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(selectedProject);
            if (savedGroupOrder && savedGroupOrder.length > 0) {
                // Filtrar grupos que ya no existen, agregar nuevos al final
                const validGroups = savedGroupOrder.filter(g => immediateSubProjects.includes(g));
                const newGroups = immediateSubProjects.filter(g => !savedGroupOrder.includes(g));
                setOrderedGroupKeys([...validGroups, ...newGroups]);
            } else {
                setOrderedGroupKeys([...immediateSubProjects]);
            }
            setOrderedQuestionUIDs([]);
        } else {
            // Modo individual: cargar orden de nodos (comportamiento original)
            const projectQuestions = panoramicData.questions.filter(q => {
                if (!q.project) return false;
                return q.project === selectedProject || q.project.startsWith(selectedProject + '/');
            });
            const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(selectedProject);
            if (savedOrder && savedOrder.length > 0) {
                const orderedUIDs = savedOrder.filter(uid => projectQuestions.some(q => q.uid === uid));
                const newUIDs = projectQuestions.filter(q => !savedOrder.includes(q.uid)).map(q => q.uid);
                setOrderedQuestionUIDs([...orderedUIDs, ...newUIDs]);
            } else {
                setOrderedQuestionUIDs(projectQuestions.map(q => q.uid));
            }
            setOrderedGroupKeys([]);
        }
    }, [panoramicData, selectedProject, isGroupedMode, immediateSubProjects.length]);


    // --- Helpers ---
    const toggleQuestion = (uid) => {
        setExpandedQuestions(prev => {
            const newState = { ...prev, [uid]: !prev[uid] };
            DiscourseGraphToolkit.savePanoramicExpandedQuestions(newState);
            return newState;
        });
    };

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

    // --- Helpers de Relevancia del Proyecto ---
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
        if (nodeType === 'GRI') childrenUids = node.contained_nodes || [];
        else if (nodeType === 'QUE') childrenUids = [...(node.related_clms || []), ...(node.direct_evds || [])];
        else if (nodeType === 'CLM') childrenUids = [...(node.related_evds || []), ...(node.supporting_clms || [])];

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

            // 4. Analizar dependencias y cargar nodos faltantes RECURSIVAMENTE
            setLoadStatus('⏳ Analizando relaciones...');

            let missingUids = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            missingUids = [...missingUids].filter(uid => !allNodes[uid]);

            let depth = 0;
            const maxDepth = 5; // Evitar loops infinitos en caso de referencias circulares muy complejas

            while (missingUids.length > 0 && depth < maxDepth) {
                setLoadStatus(`⏳ Cargando ${missingUids.length} nodos relacionados (nively ${depth + 1})...`);
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

            // 5.5 Construir set de nodos que son hijos de algún GRI (para excluirlos como raíz)
            const childNodeUids = new Set();
            Object.values(allNodes).forEach(node => {
                if (node.type === 'GRI' && node.contained_nodes) {
                    node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                }
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
                                   [?block :block/page ?page]
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
                className: 'dgt-badge dgt-badge-success',
                style: { fontSize: '0.75rem', textTransform: 'none', fontWeight: 'normal', padding: '2px 4px' },
                title: clm.title
            }, React.createElement(React.Fragment, null, "📌 ", renderMarkdownTitle(cleanTitle(clm.title, 'CLM')))),

            // EVDs del CLM
            clm.related_evds && clm.related_evds.length > 0 && React.createElement(React.Fragment, null,
                React.createElement('span', { style: { color: '#999', margin: '0 0.25rem', fontSize: '0.6875rem' } }, '→'),
                clm.related_evds.slice(0, 3).map((evdUid, i) => {
                    const evd = allNodes[evdUid];
                    if (!evd) return null;
                    return React.createElement('span', {
                        key: evdUid,
                        className: 'dgt-badge dgt-badge-warning',
                        style: { marginRight: i < clm.related_evds.length - 1 ? '0.25rem' : 0, textTransform: 'none', fontWeight: 'normal', fontSize: '0.6875rem', padding: '2px 4px' },
                        title: evd.title
                    }, React.createElement(React.Fragment, null, "📎 ", renderMarkdownTitle(cleanTitle(evd.title, 'EVD').substring(0, 20))));
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

    const renderContainedNode = (uid, allNodes, depth = 1, parentUid = null) => {
        const node = allNodes[uid];
        if (!node) return null;

        const maxDepth = 7;
        if (depth > maxDepth) return React.createElement('div', { style: { color: '#999', fontSize: '0.6875rem', paddingLeft: '1rem' } }, '...');

        const nodeType = node.type || DiscourseGraphToolkit.getNodeType(node.title);
        const badgeClass = nodeType === 'QUE' ? 'dgt-badge-neutral' : nodeType === 'GRI' ? 'dgt-badge-info' : nodeType === 'EVD' ? 'dgt-badge-warning' : 'dgt-badge-success';

        // Determinar ramas/hijos según el tipo
        let childrenUids = [];
        if (nodeType === 'GRI') childrenUids = node.contained_nodes || [];
        else if (nodeType === 'QUE') childrenUids = [...(node.related_clms || []), ...(node.direct_evds || [])];
        else if (nodeType === 'CLM') childrenUids = [...(node.related_evds || []), ...(node.supporting_clms || [])];

        // Filtrar hijos según proyecto seleccionado para recortar la rama
        if (selectedProject) {
            childrenUids = childrenUids.filter(childUid => isNodeRelevant(childUid, allNodes, selectedProject));
        }

        const hasChildren = childrenUids.length > 0;
        const isExpanded = expandedQuestions[uid] === true;

        // Determinar si este nodo es una especialización válida de su padre
        let isSpecialized = false;
        if (parentUid && allNodes[parentUid]) {
            const parentProject = allNodes[parentUid].project;
            const nodeProject = node.project;
            if (parentProject && nodeProject && nodeProject !== parentProject && nodeProject.startsWith(parentProject + '/')) {
                isSpecialized = true;
            }
        }

        return React.createElement('div', {
            key: uid,
            className: depth === 1 ? '' : 'dgt-panoramic-branch-line'
        },
            // Fila del nodo actual
            React.createElement('div', {
                onClick: hasChildren ? (e) => { e.stopPropagation(); toggleQuestion(uid); } : undefined,
                className: `dgt-panoramic-node-row ${hasChildren ? 'has-children' : ''}`,
                style: { cursor: hasChildren ? 'pointer' : 'default' }
            },
                // Icono de expandir/colapsar (espacio reservado aunque no tenga hijos)
                React.createElement('span', {
                    className: 'dgt-text-muted',
                    style: {
                        color: hasChildren ? 'var(--dgt-text-muted)' : 'transparent',
                        fontSize: '0.6rem', width: '0.75rem', display: 'flex', alignItems: 'center', marginTop: '0.25rem', flexShrink: 0
                    }
                }, isExpanded ? '▼' : '▶'),

                // Badge de tipo (para todos)
                React.createElement('span', {
                    className: `dgt-badge ${badgeClass} dgt-mr-xs`,
                    style: { fontSize: '0.5625rem', flexShrink: 0, marginTop: '2px', padding: '2px 4px' }
                }, nodeType),

                // Indicador de nodo especializado
                isSpecialized && React.createElement('span', {
                    className: 'dgt-mr-xs',
                    style: { fontSize: '0.625rem', marginTop: '2px', display: 'flex' },
                    title: `Nodo Especializado: Su proyecto (${node.project}) es un sub-proyecto de su nodo padre (${allNodes[parentUid]?.project}).`
                }, '🔀'),

                // Título del nodo
                React.createElement('span', {
                    className: 'dgt-text-primary',
                    style: { fontSize: '0.8125rem', wordBreak: 'break-word', flex: 1 },
                    title: node.title
                }, renderMarkdownTitle(cleanTitle(node.title, nodeType)))
            ),

            // Hijos recursivos
            hasChildren && isExpanded && React.createElement('div', null,
                childrenUids.map((childUid) =>
                    renderContainedNode(childUid, allNodes, depth + 1, uid)
                )
            )
        );
    };

    // --- Renderizar un nodo raíz (QUE o GRI) con sus ramas ---
    // showDragHandle: controla si se muestra el drag handle (false en modo agrupado, los nodos dentro de un grupo no se arrastran)
    const renderQuestion = (question, allNodes, showDragHandle = true, qIndex = -1) => {
        const nodeType = DiscourseGraphToolkit.getNodeType(question.title) || 'QUE';
        const isExpanded = expandedQuestions[question.uid] === true; // Colapsado por defecto

        // Determinar ramas según el tipo
        let clms, directEvds, containedNodes, totalBranches;
        if (nodeType === 'GRI') {
            containedNodes = question.contained_nodes || [];
            clms = [];
            directEvds = [];
        } else {
            clms = question.related_clms || [];
            directEvds = question.direct_evds || [];
            containedNodes = [];
        }

        if (selectedProject) {
            containedNodes = containedNodes.filter(uid => isNodeRelevant(uid, allNodes, selectedProject));
            clms = clms.filter(uid => isNodeRelevant(uid, allNodes, selectedProject));
            directEvds = directEvds.filter(uid => isNodeRelevant(uid, allNodes, selectedProject));
        }

        totalBranches = containedNodes.length + clms.length + directEvds.length;

        const badgeClass = nodeType === 'GRI' ? 'dgt-badge-info' : 'dgt-badge-neutral';

        const isDragging = showDragHandle && dragItemIndex === qIndex;
        const isDragOver = showDragHandle && dragOverItemIndex === qIndex;

        let displayProject = question.project;
        if (selectedProject && question.project && question.project.startsWith(selectedProject)) {
            displayProject = question.project.substring(selectedProject.length).replace(/^\//, '');
        }

        return React.createElement('div', {
            key: question.uid,
            className: `dgt-panoramic-root dgt-panoramic-root-${nodeType.toLowerCase()} ${isDragOver ? 'dgt-drag-over' : ''}`,
            draggable: showDragHandle && selectedProject ? true : false,
            onDragStart: showDragHandle && selectedProject ? (e) => handleDragStart(e, qIndex) : undefined,
            onDragEnter: showDragHandle && selectedProject ? (e) => handleDragEnter(e, qIndex) : undefined,
            onDragOver: showDragHandle && selectedProject ? handleDragOver : undefined,
            onDragEnd: showDragHandle && selectedProject ? handleDragEnd : undefined,
            onDrop: showDragHandle && selectedProject ? (e) => handleDrop(e, qIndex) : undefined,
            style: { opacity: isDragging ? 0.4 : 1 }
        },
            // Header del nodo raíz
            React.createElement('div', {
                onClick: () => toggleQuestion(question.uid),
                className: 'dgt-panoramic-node-row',
                style: { padding: '8px 8px 8px 0', gap: '6px' }
            },
                // Drag handle (solo si showDragHandle y hay proyecto seleccionado)
                showDragHandle && selectedProject && React.createElement('div', {
                    className: 'dgt-drag-handle dgt-mr-xs',
                    title: 'Mantén presionado y arrastra para reordenar',
                    onClick: (e) => e.stopPropagation()
                }, '⋮⋮'),
                React.createElement('span', {
                    className: 'dgt-text-muted dgt-text-xs',
                    style: { marginTop: '4px', width: '12px', textAlign: 'center' }
                }, isExpanded ? '▼' : '▶'),
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
            ),

            // Ramas (expandidas)
            isExpanded && React.createElement('div', {
                style: { paddingLeft: '0.5rem', paddingBottom: '0.5rem' }
            },
                // Renderizar todos los nodos contenidos directamente (que se encargarán de sus propios hijos recursivamente)
                nodeType === 'GRI' ?
                    containedNodes.map((cnUid) => renderContainedNode(cnUid, allNodes, 1, question.uid)) :
                    React.createElement(React.Fragment, null,
                        clms.map((clmUid) => renderContainedNode(clmUid, allNodes, 1, question.uid)),
                        directEvds.map((evdUid) => renderContainedNode(evdUid, allNodes, 1, question.uid))
                    ),

                // Mensaje si no hay ramas
                totalBranches === 0 && React.createElement('span', {
                    className: 'dgt-text-muted dgt-text-xs', style: { fontStyle: 'italic', paddingLeft: '1.5rem' }
                }, nodeType === 'GRI' ? 'Sin nodos contenidos' : 'Sin respuestas')
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

    // --- Renderizar un grupo de sub-proyecto ---
    const renderSubProjectGroup = (groupKey, groupIndex) => {
        const groupNodes = getOrderedNodesForGroup(groupKey);
        const groupLabel = groupKey.split('/').pop();
        const isExpanded = expandedQuestions[`group:${groupKey}`] === true;
        const isDragging = dragItemIndex === groupIndex;
        const isDragOver = dragOverItemIndex === groupIndex;

        return React.createElement('div', {
            key: groupKey,
            className: `dgt-panoramic-group ${isDragOver ? 'dgt-drag-over' : ''}`,
            draggable: true,
            onDragStart: (e) => handleDragStart(e, groupIndex),
            onDragEnter: (e) => handleDragEnter(e, groupIndex),
            onDragOver: handleDragOver,
            onDragEnd: handleDragEnd,
            onDrop: (e) => handleDrop(e, groupIndex),
            style: { opacity: isDragging ? 0.4 : 1 }
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
                // Drag handle
                React.createElement('div', {
                    className: 'dgt-drag-handle',
                    title: 'Mantén presionado y arrastra para reordenar este grupo',
                    onClick: (e) => e.stopPropagation(),
                    style: { cursor: 'grab', fontSize: '0.875rem', color: 'var(--dgt-text-muted)', flexShrink: 0 }
                }, '⋮⋮'),

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
                    ? groupNodes.map(q => renderQuestion(q, panoramicData.allNodes, false))
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

    // --- Obtener lista jerárquica de proyectos (memoizada, un solo pase) ---
    const hierarchicalProjects = React.useMemo(() => {
        if (!panoramicData) return [];
        const allPrefixes = new Set();
        const leafProjects = new Set();
        // Pre-compute counts in a single pass: O(N) instead of O(prefixes × N)
        const countMap = new Map();

        Object.values(panoramicData.allNodes).forEach(node => {
            if (node.project) {
                // Agregar la rama completa (es una hoja)
                leafProjects.add(node.project);
                allPrefixes.add(node.project);
                // Agregar todos los prefijos intermedios e incrementar contadores
                const parts = node.project.split('/');
                for (let i = 1; i <= parts.length; i++) {
                    const prefix = parts.slice(0, i).join('/');
                    allPrefixes.add(prefix);
                    countMap.set(prefix, (countMap.get(prefix) || 0) + 1);
                }
            }
        });

        // Ordenar y agregar metadata (es grupo o hoja, contador)
        const sorted = Array.from(allPrefixes).sort();
        return sorted.map(prefix => {
            const isLeaf = leafProjects.has(prefix);
            const count = countMap.get(prefix) || 0;
            const depth = prefix.split('/').length - 1;
            return { prefix, isLeaf, count, depth };
        });
    }, [panoramicData]);

    const filteredQuestions = isGroupedMode ? [] : getFilteredQuestions();

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header con layout de dos columnas: título a la izquierda, controles a la derecha
        React.createElement('div', { className: 'dgt-flex-between dgt-mb-sm dgt-gap-md', style: { alignItems: 'flex-start' } },
            // Columna izquierda: título y descripción
            React.createElement('div', { style: { flex: '1' } },
                React.createElement('h3', { className: 'dgt-mb-xs', style: { marginTop: 0 } }, 'Vista Panorámica'),
                React.createElement('p', { className: 'dgt-text-secondary dgt-text-sm dgt-mb-0' },
                    'Vista sintética de todas las ramas del grafo de discurso.')
            ),
            // Columna derecha: controles compactos
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-xs', style: { alignItems: 'flex-end', flexShrink: 0 } },
                // Fila 1: Botón cargar + dropdown
                React.createElement('div', { className: 'dgt-flex-row dgt-gap-sm' },
                    React.createElement('button', {
                        onClick: handleLoadPanoramic,
                        disabled: isLoading,
                        className: 'dgt-btn dgt-btn-primary'
                    }, isLoading ? '⏳...' : '🔄 Cargar'),
                    // Filtro de proyecto (jerárquico custom)
                    panoramicData && hierarchicalProjects.length > 0 && React.createElement('div', {
                        ref: projectDropdownRef,
                        style: { position: 'relative', minWidth: '220px', maxWidth: '300px' }
                    },
                        // Botón Principal
                        React.createElement('div', {
                            className: 'dgt-input dgt-text-xs',
                            onClick: () => setIsProjectDropdownOpen(!isProjectDropdownOpen),
                            style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', userSelect: 'none', backgroundColor: 'var(--dgt-bg-primary, #ffffff)' }
                        },
                            React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' } },
                                selectedProject ? selectedProject.split('/').pop() : `Todos (${panoramicData.questions.length})`
                            ),
                            React.createElement('span', { style: { fontSize: '0.6rem', opacity: 0.6, marginLeft: '8px' } }, isProjectDropdownOpen ? '▲' : '▼')
                        ),
                        
                        // Menú Desplegable
                        isProjectDropdownOpen && React.createElement('div', {
                            style: { position: 'absolute', top: '100%', right: 0, minWidth: '100%', width: 'max-content', maxHeight: '400px', overflowY: 'auto', backgroundColor: 'var(--dgt-bg-primary, white)', border: '1px solid var(--dgt-border-focus, #b5b3ad)', borderRadius: 'var(--dgt-radius-sm, 6px)', zIndex: 1000, boxShadow: 'var(--dgt-shadow-md, 0 4px 12px rgba(0,0,0,0.1))', marginTop: '4px', padding: '4px 0' }
                        },
                            // Opción "Todos"
                            React.createElement('div', {
                                className: 'dgt-text-xs',
                                onClick: () => { setSelectedProject(''); setIsProjectDropdownOpen(false); },
                                style: { display: 'flex', padding: '6px 12px', cursor: 'pointer', backgroundColor: selectedProject === '' ? 'var(--dgt-bg-secondary, #f0f0f0)' : 'transparent', fontWeight: selectedProject === '' ? 'bold' : 'normal', userSelect: 'none' }
                            }, `Todos (${panoramicData.questions.length})`),
                            
                            // Lista Jerárquica de Opciones
                            hierarchicalProjects.map((p, index) => {
                                const parts = p.prefix.split('/');
                                let isVisible = true;
                                // Sólo mostrar si todos los padres están expandidos
                                for(let i = 1; i < parts.length; i++) {
                                    const parentPrefix = parts.slice(0, i).join('/');
                                    if (!expandedProjectFolders[parentPrefix]) isVisible = false;
                                }
                                if (!isVisible) return null;
                                
                                const nextp = hierarchicalProjects[index + 1];
                                const hasChildren = nextp && nextp.prefix.startsWith(p.prefix + '/');
                                const isExpanded = !!expandedProjectFolders[p.prefix];
                                const indent = p.depth * 14;
                                
                                return React.createElement('div', {
                                    key: p.prefix,
                                    className: 'dgt-text-xs',
                                    style: { display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${12 + indent}px`, cursor: 'pointer', backgroundColor: selectedProject === p.prefix ? 'var(--dgt-bg-secondary, #f0f0f0)' : 'transparent', fontWeight: selectedProject === p.prefix ? 'bold' : 'normal', userSelect: 'none' }
                                },
                                    // Flecha Toggle o Espaciador
                                    React.createElement('div', {
                                        style: { width: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: hasChildren ? 'pointer' : 'default', opacity: hasChildren ? 0.6 : 0, transition: 'transform 0.2s' },
                                        onClick: hasChildren ? (e) => {
                                            e.stopPropagation();
                                            setExpandedProjectFolders(prev => ({ ...prev, [p.prefix]: !prev[p.prefix] }));
                                        } : undefined
                                    }, hasChildren ? (isExpanded ? '▼' : '▶') : '•'),
                                    
                                    // Etiqueta del Proyecto
                                    React.createElement('div', {
                                        style: { marginLeft: '4px', whiteSpace: 'nowrap', flex: 1 },
                                        onClick: () => { setSelectedProject(p.prefix); setIsProjectDropdownOpen(false); }
                                    }, p.prefix.split('/').pop(), React.createElement('span', { style: { opacity: 0.6, marginLeft: '4px' } }, `(${p.count})`))
                                );
                            })
                        )
                    )
                ),
                // Fila 2: Botones expandir/colapsar
                panoramicData && React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs' },
                    React.createElement('button', {
                        onClick: () => {
                            const allExpanded = {};
                            // Expandir raíces
                            filteredQuestions.forEach(q => allExpanded[q.uid] = true);
                            // Expandir grupos si modo agrupado
                            if (isGroupedMode) {
                                orderedGroupKeys.forEach(gk => allExpanded[`group:${gk}`] = true);
                                // También expandir nodos dentro de los grupos
                                orderedGroupKeys.forEach(gk => {
                                    getOrderedNodesForGroup(gk).forEach(q => allExpanded[q.uid] = true);
                                });
                            }
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
                    }, '➖ Colapsar')
                ),
                // Fila 3: Estadísticas compactas
                panoramicData && React.createElement('div', { className: 'dgt-flex-row dgt-gap-xs' },
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `QUE: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => (DiscourseGraphToolkit.getNodeType(n.title) || 'QUE') === 'QUE').length}`),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-info' },
                        `GRI: ${(isGroupedMode ? orderedGroupKeys.flatMap(gk => getOrderedNodesForGroup(gk)) : filteredQuestions).filter(n => DiscourseGraphToolkit.getNodeType(n.title) === 'GRI').length}`),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-success' },
                        `CLM: ${Object.values(panoramicData.allNodes).filter(n => n.type === 'CLM').length}`),
                    React.createElement('span', { className: 'dgt-badge dgt-badge-warning' },
                        `EVD: ${Object.values(panoramicData.allNodes).filter(n => n.type === 'EVD').length}`)
                )
            )
        ),

        // Status (compacto, solo si hay mensajes de carga activa)
        loadStatus && !loadStatus.includes('📦') && React.createElement('div', {
            className: `dgt-p-sm dgt-mb-sm dgt-text-xs dgt-text-bold ${loadStatus.includes('✅') ? 'dgt-text-success' : loadStatus.includes('❌') ? 'dgt-text-error' : 'dgt-text-muted'}`,
            style: { backgroundColor: 'var(--dgt-bg-secondary)', borderRadius: 'var(--dgt-radius-sm)' }
        }, loadStatus),

        // Indicador de modo agrupado
        isGroupedMode && React.createElement('div', {
            className: 'dgt-p-sm dgt-mb-sm dgt-text-xs',
            style: { backgroundColor: 'rgba(108, 92, 153, 0.06)', borderRadius: 'var(--dgt-radius-sm)', border: '1px solid rgba(108, 92, 153, 0.15)', color: 'var(--dgt-accent-purple)' }
        }, `📦 Vista agrupada: ${orderedGroupKeys.length} sub-proyecto${orderedGroupKeys.length !== 1 ? 's' : ''}. Arrastra los bloques para reordenar.`),

        // Lista de contenido principal
        panoramicData && React.createElement('div', { className: 'dgt-list-container dgt-p-sm' },
            isGroupedMode
                // Modo agrupado: renderizar grupos de sub-proyectos
                ? (orderedGroupKeys.length > 0
                    ? orderedGroupKeys.map((gk, index) => renderSubProjectGroup(gk, index))
                    : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                        'No hay sub-proyectos para mostrar.')
                )
                // Modo individual: renderizar nodos planos (comportamiento original)
                : (filteredQuestions.length > 0
                    ? filteredQuestions.map((q, index) => renderQuestion(q, panoramicData.allNodes, true, index))
                    : React.createElement('p', { className: 'dgt-text-muted', style: { textAlign: 'center' } },
                        'No hay preguntas para mostrar' + (selectedProject ? ' en este proyecto.' : '.'))
                )
        ),

        // Mensaje inicial
        !panoramicData && !isLoading && React.createElement('div', {
            className: 'dgt-p-md dgt-text-muted dgt-text-center',
            style: {
                backgroundColor: 'var(--dgt-bg-primary)',
                borderRadius: 'var(--dgt-radius-sm)',
                border: '1px dashed var(--dgt-border-focus)'
            }
        },
            React.createElement('p', { style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, ''),
            React.createElement('p', null, 'Haz clic en "Cargar Panorámica" para visualizar todas las ramas del grafo.')
        )
    );
};
