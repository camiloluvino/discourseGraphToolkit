// ============================================================================
// UI: Export Tab Component
// ============================================================================

DiscourseGraphToolkit.ExportTab = function () {
    const React = window.React;
    const { projects } = DiscourseGraphToolkit.useProjects();
    const {
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        skeletonMode, setSkeletonMode,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        orderedQuestions, setOrderedQuestions,
        orderedGroups, setOrderedGroups
    } = DiscourseGraphToolkit.useExport();

    // --- Favorites ---
    const [favorites, setFavorites] = React.useState([]);

    // Cargar favoritos al montar
    React.useEffect(() => {
        setFavorites(DiscourseGraphToolkit.FavoritesService.getAll('export'));
    }, []);

    const handleSaveFavorite = () => {
        const data = {
            selectedProjects: { ...selectedProjects },
            selectedTypes: { ...selectedTypes },
            contentConfig: { ...contentConfig },
            excludeBitacora: excludeBitacora,
            skeletonMode: skeletonMode
        };
        // El nombre se genera automáticamente desde selectedProjects (por namespace)
        const updated = DiscourseGraphToolkit.FavoritesService.add('export', null, data);
        setFavorites(updated);
        // Mostrar toast con el nombre generado
        const name = DiscourseGraphToolkit.computeFavoriteName(selectedProjects);
        DiscourseGraphToolkit.showToast('Favorito guardado: ' + name, 'success');
    };

    const handleApplyFavorite = (fav) => {
        const data = fav.data;
        if (data.selectedProjects) setSelectedProjects({ ...data.selectedProjects });
        if (data.selectedTypes) setSelectedTypes({ ...data.selectedTypes });
        if (data.contentConfig) setContentConfig({ ...data.contentConfig });
        if (data.excludeBitacora !== undefined) setExcludeBitacora(data.excludeBitacora);
        if (data.skeletonMode !== undefined) setSkeletonMode(data.skeletonMode);
        DiscourseGraphToolkit.showToast('Favorito aplicado: ' + fav.name, 'success');
    };

    const handleDeleteFavorite = (favId, favName, e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar favorito "' + favName + '"?')) return;
        const updated = DiscourseGraphToolkit.FavoritesService.remove('export', favId);
        setFavorites(updated);
    };

    const handleRenameFavorite = (favId, currentName) => {
        const newName = prompt('Nuevo nombre:', currentName);
        if (!newName || newName.trim() === currentName) return;
        const updated = DiscourseGraphToolkit.FavoritesService.rename('export', favId, newName.trim());
        setFavorites(updated);
    };

    const isFavoriteActive = (fav) => {
        const data = fav.data;
        if (!data) return false;
        // Comparar selectedProjects (objeto)
        const currentProjKeys = Object.keys(selectedProjects).filter(k => selectedProjects[k]).sort();
        const savedProjKeys = Object.keys(data.selectedProjects || {}).filter(k => data.selectedProjects[k]).sort();
        if (currentProjKeys.join(',') !== savedProjKeys.join(',')) return false;
        // Comparar selectedTypes
        const typesEqual = data.selectedTypes &&
            Object.keys(data.selectedTypes).every(k => data.selectedTypes[k] === selectedTypes[k]) &&
            Object.keys(selectedTypes).every(k => data.selectedTypes[k] === selectedTypes[k]);
        if (!typesEqual) return false;
        // Comparar contentConfig
        const contentEqual = data.contentConfig &&
            Object.keys(data.contentConfig).every(k => data.contentConfig[k] === contentConfig[k]) &&
            Object.keys(contentConfig).every(k => data.contentConfig[k] === contentConfig[k]);
        if (!contentEqual) return false;
        // Comparar flags
        if (data.excludeBitacora !== undefined && data.excludeBitacora !== excludeBitacora) return false;
        if (data.skeletonMode !== undefined && data.skeletonMode !== skeletonMode) return false;
        return true;
    };

    // --- Limpiar preview cuando cambian los proyectos seleccionados ---
    React.useEffect(() => {
        setPreviewPages([]);
        setOrderedQuestions([]);
        setOrderedGroups([]);
    }, [selectedProjects]);

    // --- Árbol jerárquico de proyectos (calculado) ---
    const projectTree = React.useMemo(() => {
        if (projects.length === 0) return {};
        return DiscourseGraphToolkit.buildSimpleProjectTree(projects);
    }, [projects]);

    // --- Selección en cascada ---
    const handleProjectToggle = (node, checked) => {
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const newSelected = { ...selectedProjects };
        for (const proj of descendants) {
            newSelected[proj] = checked;
        }
        setSelectedProjects(newSelected);
    };

    // --- Estado D&D para Paso 3 ---
    const [dragType, setDragType] = React.useState(null); // 'group' | 'node'
    const [dragGroupKey, setDragGroupKey] = React.useState(null);
    const [dragIdx, setDragIdx] = React.useState(null);
    const [dragOverIdx, setDragOverIdx] = React.useState(null);

    // --- Helper: clave padre común de los proyectos seleccionados ---
    const getParentProjectKey = (projectList) => {
        const pList = projectList || Object.keys(selectedProjects).filter(k => selectedProjects[k]);
        if (pList.length === 0) return '';
        if (pList.length === 1) return pList[0];
        const split = pList.map(p => p.split('/'));
        const minLen = Math.min(...split.map(p => p.length));
        const common = [];
        for (let i = 0; i < minLen; i++) {
            if (split.every(p => p[i] === split[0][i])) common.push(split[0][i]);
            else break;
        }
        return common.length > 0 ? common.join('/') : pList.sort().join('|');
    };

    const cleanTitleForDisplay = (title) => {
        return (title || '').replace(/\[\[(?:QUE|GRI)\]\]\s*-\s*/, '').substring(0, 70);
    };

    // --- D&D handlers para grupos (Paso 3) ---
    const handleGroupDragStart = (e, idx) => { setDragType('group'); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleGroupDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleGroupDragOver = (e) => { e.preventDefault(); };
    const handleGroupDragEnd = () => { setDragType(null); setDragIdx(null); setDragOverIdx(null); };
    const handleGroupDrop = (e, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) { handleGroupDragEnd(); return; }
        const newGroups = [...orderedGroups];
        const [item] = newGroups.splice(dragIdx, 1);
        newGroups.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        setOrderedGroups(newGroups);
        const parentKey = getParentProjectKey();
        DiscourseGraphToolkit.saveGroupOrder(parentKey, newGroups);
        handleGroupDragEnd();
    };

    // --- D&D handlers para nodos dentro de un grupo (Paso 3) ---
    const handleNodeDragStart = (e, groupKey, idx) => { setDragType('node'); setDragGroupKey(groupKey); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleNodeDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleNodeDragOver = (e) => { e.preventDefault(); };
    const handleNodeDragEnd = () => { setDragType(null); setDragGroupKey(null); setDragIdx(null); setDragOverIdx(null); };
    const handleNodeDrop = (e, groupKey, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx || dragGroupKey !== groupKey) { handleNodeDragEnd(); return; }
        // Nodos de este grupo en orden actual
        const groupNodes = orderedQuestions.filter(q => {
            const n = q._groupKey;
            return n === groupKey;
        });
        const newGroupNodes = [...groupNodes];
        const [item] = newGroupNodes.splice(dragIdx, 1);
        newGroupNodes.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        // Reconstruir orderedQuestions: reemplazar nodos de este grupo en su posición
        const otherNodes = orderedQuestions.filter(q => q._groupKey !== groupKey);
        // Insertar en la posición donde estaba el grupo
        const firstGroupIdx = orderedQuestions.findIndex(q => q._groupKey === groupKey);
        const newOrdered = [...orderedQuestions];
        let gi = 0;
        for (let i = 0; i < newOrdered.length; i++) {
            if (newOrdered[i]._groupKey === groupKey) {
                newOrdered[i] = newGroupNodes[gi++];
            }
        }
        setOrderedQuestions(newOrdered);
        DiscourseGraphToolkit.saveQuestionOrder(groupKey, newGroupNodes.map(q => q.uid));
        handleNodeDragEnd();
    };


    // --- Helpers para Seleccionar Todo ---
    const selectAllProjects = () => {
        const allSelected = {};
        projects.forEach(p => allSelected[p] = true);
        setSelectedProjects(allSelected);
    };

    const selectAllTypes = () => {
        setSelectedTypes({ GRI: true, QUE: true, CLM: true, EVD: true });
    };

    // --- Handlers ---
    const handlePreview = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            // Rastrear qué proyecto originó cada uid (antes de deduplicar)
            const uidToProject = {};
            for (let p of pNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                for (const page of pages) {
                    if (!uidToProject[page.pageUid]) {
                        uidToProject[page.pageUid] = p; // primer proyecto encontrado gana
                    }
                }
                allPages = allPages.concat(pages);
            }

            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());

            // Inicializar orderedQuestions con los nodos raíz (QUE y GRI) encontrados
            let rootPages = uniquePages.filter(p => {
                const type = DiscourseGraphToolkit.getNodeType(p.pageTitle);
                return type === 'QUE' || type === 'GRI';
            }).map(p => ({ uid: p.pageUid, title: p.pageTitle, _project: uidToProject[p.pageUid] || null }));

            // Fallback: si no hay QUE/GRI pero sí hay CLM/EVD, buscar padres
            if (rootPages.length === 0 && uniquePages.length > 0) {
                setExportStatus("Buscando nodos raíz padre...");
                const childUids = uniquePages.map(p => p.pageUid);
                const parentRoots = await DiscourseGraphToolkit.findParentRootNodes(childUids);
                if (parentRoots.length > 0) {
                    for (const parent of parentRoots) {
                        if (!uniquePages.some(p => p.pageUid === parent.pageUid)) {
                            uniquePages.push(parent);
                        }
                    }
                    rootPages = parentRoots.map(p => ({ uid: p.pageUid, title: p.pageTitle, _project: uidToProject[p.pageUid] || null }));
                }
            }

            setPreviewPages(uniquePages);

            // --- Inicializar Paso 3: agrupar por sub-proyecto ---
            const currentUIDs = orderedQuestions.map(q => q.uid);
            const newUIDs = rootPages.map(q => q.uid);
            const sameQuestions = currentUIDs.length === newUIDs.length && currentUIDs.every(uid => newUIDs.includes(uid));

            let finalOrderedQuestions = [];
            let finalOrderedGroups = [];

            if (!sameQuestions) {
                const parentKey = getParentProjectKey(pNames);
                // Los sub-proyectos directos del padre común que están seleccionados
                const subProjectSet = new Set();
                pNames.forEach(p => {
                    if (p === parentKey) {
                        subProjectSet.add(p);
                    } else if (p.startsWith(parentKey + '/')) {
                        // Tomar solo el nivel inmediato siguiente al padre
                        const rest = p.substring(parentKey.length + 1);
                        const immediate = rest.split('/')[0];
                        subProjectSet.add(parentKey + '/' + immediate);
                    }
                });
                const hasGroups = subProjectSet.size > 1;

                if (hasGroups) {
                    const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(parentKey);
                    const groupKeys = savedGroupOrder && savedGroupOrder.length > 0
                        ? [...savedGroupOrder.filter(g => subProjectSet.has(g)), ...Array.from(subProjectSet).filter(g => !savedGroupOrder.includes(g))]
                        : Array.from(subProjectSet).sort();
                    finalOrderedGroups = groupKeys;
                    setOrderedGroups(groupKeys);

                    // Asignar _groupKey usando el proyecto real del nodo (uidToProject)
                    const annotated = [];
                    for (const gk of groupKeys) {
                        const groupNodes = rootPages
                            .filter(q => {
                                const qp = q._project || '';
                                return qp === gk || qp.startsWith(gk + '/');
                            })
                            .map(q => ({ ...q, _groupKey: gk }));
                        const savedQ = DiscourseGraphToolkit.loadQuestionOrder(gk);
                        if (savedQ && savedQ.length > 0) {
                            const ordered = savedQ.map(uid => groupNodes.find(q => q.uid === uid)).filter(Boolean);
                            const unseen = groupNodes.filter(q => !savedQ.includes(q.uid));
                            annotated.push(...ordered, ...unseen);
                        } else {
                            annotated.push(...groupNodes);
                        }
                    }
                    // Nodos sin grupo asignado (proyecto no encaja en ningún grupo)
                    const unassigned = rootPages
                        .filter(q => !annotated.some(a => a.uid === q.uid))
                        .map(q => ({ ...q, _groupKey: null }));
                    finalOrderedQuestions = [...annotated, ...unassigned];
                    setOrderedQuestions(finalOrderedQuestions);
                } else {
                    finalOrderedGroups = [];
                    setOrderedGroups([]);
                    const savedQ = DiscourseGraphToolkit.loadQuestionOrder(parentKey);
                    if (savedQ && savedQ.length > 0) {
                        const ordered = savedQ.map(uid => rootPages.find(q => q.uid === uid)).filter(Boolean).map(q => ({ ...q, _groupKey: null }));
                        const unseen = rootPages.filter(q => !savedQ.includes(q.uid)).map(q => ({ ...q, _groupKey: null }));
                        finalOrderedQuestions = [...ordered, ...unseen];
                        setOrderedQuestions(finalOrderedQuestions);
                    } else {
                        finalOrderedQuestions = rootPages.map(q => ({ ...q, _groupKey: null }));
                        setOrderedQuestions(finalOrderedQuestions);
                    }
                }
            } else {
                finalOrderedQuestions = orderedQuestions;
                finalOrderedGroups = orderedGroups;
            }

            const griCount = rootPages.filter(p => DiscourseGraphToolkit.getNodeType(p.title) === 'GRI').length;
            const queCount = rootPages.filter(p => DiscourseGraphToolkit.getNodeType(p.title) === 'QUE').length;
            setExportStatus(`Encontradas ${uniquePages.length} páginas (${queCount} preguntas, ${griCount} grupos).`);
            
            // Retornar datos calculados sincronamente para evitar stale state en exports inmediatos
            return {
                uniquePages,
                computedOrderedQuestions: finalOrderedQuestions,
                computedOrderedGroups: finalOrderedGroups
            };
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return { uniquePages: [], computedOrderedQuestions: [], computedOrderedGroups: [] };
        }
    };

    const prepareExportData = async (pagesToExport, pNames, currentOrderedQuestions) => {
        const uids = pagesToExport.map(p => p.pageUid);

        // Nota: Aunque skeletonMode esté activo, necesitamos los datos estructurales (hijos, refs)
        // para que el RelationshipMapper descubra las relaciones entre nodos.
        // El filtrado de contenido se hace en los renderers (markdownCore, htmlNodeRenderers).
        const includeContent = Object.values(contentConfig).some(x => x);

        setExportStatus("Obteniendo datos...");
        const result = await DiscourseGraphToolkit.exportPagesNative(
            uids, null, (msg) => setExportStatus(msg), includeContent, false
        );

        setExportStatus("Procesando relaciones...");
        const allNodes = {};
        result.data.forEach(node => {
            if (node.uid) {
                node.type = DiscourseGraphToolkit.getNodeType(node.title);
                node.data = node;
                allNodes[node.uid] = node;
            }
        });

        setExportStatus("Analizando dependencias...");
        const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
        const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

        if (missingUids.length > 0) {
            setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
            const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, includeContent, false);
            extraData.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });
        }

        DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

        // Construir set de nodos que son hijos de algún GRI (para excluirlos como raíz)
        const childNodeUids = new Set();
        Object.values(allNodes).forEach(node => {
            if (node.type === 'GRI' && node.contained_nodes) {
                node.contained_nodes.forEach(uid => childNodeUids.add(uid));
            }
        });

        let questions = result.data.filter(node => {
            const type = DiscourseGraphToolkit.getNodeType(node.title);
            return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
        });

        // Fallback: si no hay QUE/GRI pero hay CLM/EVD, buscar nodos raíz padre
        if (questions.length === 0 && result.data.length > 0) {
            setExportStatus("Buscando nodos raíz padre...");
            const childUids = result.data.map(n => n.uid);
            const parentRoots = await DiscourseGraphToolkit.findParentRootNodes(childUids);

            if (parentRoots.length > 0) {
                const parentUids = parentRoots.map(p => p.pageUid).filter(uid => !allNodes[uid]);
                if (parentUids.length > 0) {
                    setExportStatus(`Cargando ${parentUids.length} nodos raíz padre...`);
                    const parentData = await DiscourseGraphToolkit.exportPagesNative(parentUids, null, null, includeContent, false);
                    parentData.data.forEach(node => {
                        if (node.uid) {
                            node.type = DiscourseGraphToolkit.getNodeType(node.title);
                            node.data = node;
                            allNodes[node.uid] = node;
                        }
                    });

                    // Re-colectar dependencias de los nuevos padres
                    const newDeps = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(
                        parentUids.filter(uid => allNodes[uid]).map(uid => allNodes[uid])
                    );
                    const newMissing = [...newDeps].filter(uid => !allNodes[uid]);
                    if (newMissing.length > 0) {
                        const extraData2 = await DiscourseGraphToolkit.exportPagesNative(newMissing, null, null, includeContent, false);
                        extraData2.data.forEach(node => {
                            if (node.uid) {
                                node.type = DiscourseGraphToolkit.getNodeType(node.title);
                                node.data = node;
                                allNodes[node.uid] = node;
                            }
                        });
                    }

                    // Re-mapear relaciones con todos los nodos
                    DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

                    // Recalcular childNodeUids
                    childNodeUids.clear();
                    Object.values(allNodes).forEach(node => {
                        if (node.type === 'GRI' && node.contained_nodes) {
                            node.contained_nodes.forEach(uid => childNodeUids.add(uid));
                        }
                    });
                }

                // Re-filtrar para nodos raíz
                questions = Object.values(allNodes).filter(node => {
                    const type = DiscourseGraphToolkit.getNodeType(node.title);
                    return (type === 'QUE' || type === 'GRI') && !childNodeUids.has(node.uid);
                });
            }
        }

        // Podar ramas: filtrar para solo incluir ramas relevantes al proyecto seleccionado
        if (questions.length > 0) {
            // Obtener UIDs de páginas NATIVAS del proyecto (sin contaminación del fallback)
            const trueProjectPages = [];
            for (const p of pNames) {
                const pages = await DiscourseGraphToolkit.findPagesWithProject(p);
                trueProjectPages.push(...pages);
            }
            const projectPageUids = new Set(trueProjectPages.map(p => p.pageUid));
            const relevanceCache = {};

            const isRelevantToProject = (uid, visited) => {
                if (relevanceCache[uid] !== undefined) return relevanceCache[uid];
                if (!visited) visited = {};
                if (visited[uid]) return false;
                visited[uid] = true;

                if (projectPageUids.has(uid)) {
                    relevanceCache[uid] = true;
                    return true;
                }

                const node = allNodes[uid];
                if (!node) { relevanceCache[uid] = false; return false; }

                const children = [].concat(
                    node.related_clms || [],
                    node.direct_evds || [],
                    node.supporting_clms || [],
                    node.related_evds || [],
                    node.contained_nodes || []
                );

                for (let i = 0; i < children.length; i++) {
                    if (isRelevantToProject(children[i], Object.assign({}, visited))) {
                        relevanceCache[uid] = true;
                        return true;
                    }
                }

                relevanceCache[uid] = false;
                return false;
            };

            // Podar si algún nodo raíz NO es nativo del proyecto (fue agregado por fallback)
            const needsPruning = questions.some(q => !projectPageUids.has(q.uid));
            if (needsPruning) {
                for (const uid in allNodes) {
                    const node = allNodes[uid];
                    if (node.related_clms) node.related_clms = node.related_clms.filter(u => isRelevantToProject(u));
                    if (node.direct_evds) node.direct_evds = node.direct_evds.filter(u => isRelevantToProject(u));
                    if (node.supporting_clms) node.supporting_clms = node.supporting_clms.filter(u => isRelevantToProject(u));
                    if (node.related_evds) node.related_evds = node.related_evds.filter(u => isRelevantToProject(u));
                    if (node.contained_nodes) node.contained_nodes = node.contained_nodes.filter(u => isRelevantToProject(u));
                }
            }
        }
        // Usar el orden definido en Paso 3
        const activeOrderedQuestions = currentOrderedQuestions && currentOrderedQuestions.length > 0 ? currentOrderedQuestions : orderedQuestions;
        let orderedQuestionsToExport;
        
        if (activeOrderedQuestions.length > 0) {
            // Reordenar 'questions' según el orden del Paso 3
            // IMPORTANTE: usar activeOrderedQuestions, que tiene el orden actualizado y sincrono
            
            // Si estamos en modo agrupado, debemos respetar el orden de los grupos (orderedGroups)
            let finalUidOrder = [];
            const activeOrderedGroups = orderedGroups; // Usar el estado actual de grupos (o podríamos pasarlo como prop)
            
            if (activeOrderedGroups.length > 1) {
                // Modo agrupado: recolectar UIDs grupo por grupo para respetar el orden visual de los grupos
                for (const gk of activeOrderedGroups) {
                    const groupNodes = activeOrderedQuestions.filter(q => q._groupKey === gk);
                    finalUidOrder.push(...groupNodes.map(q => q.uid));
                }
                // Nodos sin grupo (modo plano mezclado con grupos) al final
                const unassignedNodes = activeOrderedQuestions.filter(q => !activeOrderedGroups.includes(q._groupKey));
                finalUidOrder.push(...unassignedNodes.map(q => q.uid));
            } else {
                // Modo plano: simplemente usar el orden en el que están
                finalUidOrder = activeOrderedQuestions.map(q => q.uid);
            }
            
            const reordered = finalUidOrder.map(uid => questions.find(q => q.uid === uid)).filter(Boolean);
            const unseen = questions.filter(q => !finalUidOrder.includes(q.uid));
            orderedQuestionsToExport = [...reordered, ...unseen];
        } else {
            orderedQuestionsToExport = questions;
        }

        const parentKey = getParentProjectKey(pNames);
        const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(parentKey);
        const filename = `DG_${sanitizedNames}`;

        // Retornar preguntas YA ordenadas para el export
        return { questions: orderedQuestionsToExport, allNodes, filename };
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        let exportOrderedQuestions = orderedQuestions;
        if (pagesToExport.length === 0) {
            const result = await handlePreview();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            exportOrderedQuestions = result.computedOrderedQuestions;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);

            // Calcular el nombre del proyecto usando el ancestro común (getParentProjectKey)
            const commonProject = getParentProjectKey(pNames);
            const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(commonProject);
            const filename = `DG_${sanitizedNames}.json`;

            const anyContent = Object.values(contentConfig).some(x => x);

            await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent);

            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHtml = async () => {
        let pagesToExport = previewPages;
        let exportOrderedQuestions = orderedQuestions;
        if (pagesToExport.length === 0) {
            const result = await handlePreview();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            exportOrderedQuestions = result.computedOrderedQuestions;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, exportOrderedQuestions);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(
                questionsToExport, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora, skeletonMode
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '.html', htmlContent, 'text/html');

            setExportStatus(`✅ Exportación HTML completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportMarkdown = async () => {
        let pagesToExport = previewPages;
        let exportOrderedQuestions = orderedQuestions;
        if (pagesToExport.length === 0) {
            const result = await handlePreview();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            exportOrderedQuestions = result.computedOrderedQuestions;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, exportOrderedQuestions);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, false, skeletonMode
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '.md', mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportFlatMarkdown = async () => {
        let pagesToExport = previewPages;
        let exportOrderedQuestions = orderedQuestions;
        if (pagesToExport.length === 0) {
            const result = await handlePreview();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            exportOrderedQuestions = result.computedOrderedQuestions;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, exportOrderedQuestions);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown Plano...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode
            );

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename + '_flat.md', mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown Plano completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportEpub = async () => {
        let pagesToExport = previewPages;
        let exportOrderedQuestions = orderedQuestions;
        if (pagesToExport.length === 0) {
            const result = await handlePreview();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            exportOrderedQuestions = result.computedOrderedQuestions;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, exportOrderedQuestions);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            setExportStatus("Generando Markdown para EPUB...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode
            );

            setExportStatus("Cargando librería EPUB...");
            await DiscourseGraphToolkit.EpubGenerator.loadJSZip();

            setExportStatus("Generando EPUB...");
            const epubBlob = await DiscourseGraphToolkit.EpubGenerator.generateEpub(mdContent, {
                title: `Mapa de Discurso: ${pNames.join(', ')}`,
                author: 'Discourse Graph Toolkit'
            });

            setExportStatus("Descargando EPUB...");
            const url = URL.createObjectURL(epubBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.epub';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            setExportStatus(`✅ Exportación EPUB completada.`);
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Callbacks para ProjectTreeView ---
    const renderExportNodeHeader = (node, key, depth, isExpanded, toggleFn) => {
        const hasChildren = Object.keys(node.children).length > 0;
        const descendants = DiscourseGraphToolkit.getAllDescendantProjects(node);
        const selectedCount = descendants.filter(p => selectedProjects[p]).length;
        const allSelected = selectedCount === descendants.length && descendants.length > 0;
        const someSelected = selectedCount > 0 && selectedCount < descendants.length;

        return React.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0',
                fontSize: '0.8125rem'
            }
        },
            // Expand/collapse toggle (solo si tiene hijos)
            hasChildren && React.createElement('span', {
                onClick: (e) => { e.stopPropagation(); toggleFn(); },
                style: { cursor: 'pointer', color: '#666', fontSize: '0.6875rem', width: '0.75rem' }
            }, isExpanded ? '▼' : '▶'),
            !hasChildren && React.createElement('span', { style: { width: '0.75rem' } }),
            // Checkbox
            React.createElement('input', {
                type: 'checkbox',
                checked: allSelected,
                ref: (el) => { if (el) el.indeterminate = someSelected; },
                onChange: (e) => handleProjectToggle(node, e.target.checked),
                style: { margin: 0 }
            }),
            // Label
            React.createElement('span', {
                style: { cursor: 'pointer' },
                onClick: () => handleProjectToggle(node, !allSelected)
            },
                hasChildren ? `📁 ${key}` : key
            ),
            // Badge con conteo si tiene hijos
            hasChildren && React.createElement('span', {
                style: { fontSize: '0.625rem', color: '#999', marginLeft: '0.25rem' }
            }, `(${selectedCount}/${descendants.length})`)
        );
    };

    // ExportTab no necesita renderNodeContent porque solo muestra proyectos, no items dentro
    const renderExportNodeContent = (node, depth) => null;

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        React.createElement('h3', { style: { marginTop: 0, marginBottom: '1.25rem' } }, 'Exportar Grafos'),

        // --- Favorites Bar ---
        React.createElement('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--dgt-bg-secondary)',
                border: '1px solid var(--dgt-border-color)',
                borderRadius: 'var(--dgt-radius-md)',
                flexWrap: 'wrap',
                fontSize: '0.8125rem'
            }
        },
            React.createElement('span', { style: { fontWeight: 600, fontSize: '0.75rem', color: 'var(--dgt-text-secondary)', whiteSpace: 'nowrap' } }, '⭐ Favoritos:'),
            favorites.length === 0 && React.createElement('span', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-muted)' } }, '(guarda tu selección actual)'),
            favorites.map(function (fav) {
                var isActive = isFavoriteActive(fav);
                return React.createElement('span', {
                    key: fav.id,
                    onClick: function () { handleApplyFavorite(fav); },
                    title: fav.name + (isActive ? ' (activo)' : ''),
                    style: {
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: isActive ? 'var(--dgt-accent-green)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--dgt-text-primary)',
                        border: '1px solid ' + (isActive ? 'var(--dgt-accent-green)' : 'var(--dgt-border-color)'),
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                    }
                },
                    React.createElement('span', { style: { fontWeight: isActive ? 600 : 400 } }, '🔖'),
                    React.createElement('span', {
                        style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        title: fav.name
                    }, fav.name),
                    React.createElement('span', {
                        onClick: function (e) { handleDeleteFavorite(fav.id, fav.name, e); },
                        style: { cursor: 'pointer', opacity: 0.6, marginLeft: '2px', fontSize: '0.65rem', color: isActive ? '#fff' : 'var(--dgt-text-muted)' },
                        title: 'Eliminar favorito'
                    }, '✕')
                );
            }),
            React.createElement('button', {
                onClick: handleSaveFavorite,
                title: 'Guardar selección actual como favorito (nombre generado por namespace)',
                style: {
                    background: 'transparent', border: '1px dashed var(--dgt-border-color)',
                    borderRadius: '12px', padding: '2px 10px', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--dgt-text-secondary)'
                }
            }, '+ Guardar')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch', flex: 1, minHeight: 0 } },
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '1. Proyectos'),
                    projects.length > 0 && React.createElement('span', {
                        onClick: selectAllProjects,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { className: 'dgt-tree-container', style: { flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #eee', padding: '0.625rem', backgroundColor: '#fafafa', maxHeight: 'none' } },
                    projects.length === 0 ? 'No hay proyectos.' :
                        React.createElement(DiscourseGraphToolkit.ProjectTreeView, {
                            tree: projectTree,
                            renderNodeHeader: renderExportNodeHeader,
                            renderNodeContent: renderExportNodeContent,
                            defaultExpanded: true
                        })
                )
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem' } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '2. Tipos'),
                    React.createElement('span', {
                        onClick: selectAllTypes,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                ['GRI', 'QUE', 'CLM', 'EVD'].map(t =>
                    React.createElement('div', { key: t },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: selectedTypes[t],
                                onChange: e => setSelectedTypes({ ...selectedTypes, [t]: e.target.checked })
                            }),
                            ` ${t}`
                        )
                    )
                ),
                React.createElement('div', {
                    style: {
                        fontSize: '0.6875rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem',
                        lineHeight: '1.3'
                    }
                }, 'Controla qu\u00e9 tipos de nodos se incluyen en el \u00e1rbol de exportaci\u00f3n.'),
                React.createElement('div', { style: { marginTop: '0.625rem', marginBottom: '0.625rem' } },
                    React.createElement('label', {
                        style: { fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }
                    },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: skeletonMode,
                            onChange: e => setSkeletonMode(e.target.checked)
                        }),
                        ' Exportar solo esqueleto (solo títulos y relaciones)'
                    ),
                    React.createElement('div', {
                        style: {
                            fontSize: '0.6875rem', color: '#888', marginTop: '0.25rem', marginLeft: '1.375rem',
                            lineHeight: '1.3'
                        }
                    }, 'Modo "rayos X": omite todo el contenido, metadata y mensajes informativos.')
                ),
                React.createElement('div', { style: { marginTop: '0.625rem' } },
                    React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', fontSize: '0.75rem', opacity: skeletonMode ? 0.4 : 1 } }, 'Extraer contenido detallado por tipo:'),
                    ['GRI', 'QUE', 'CLM', 'EVD'].map(type =>
                        React.createElement('div', { key: type, style: { marginLeft: '0.625rem' } },
                            React.createElement('label', {
                                style: { opacity: skeletonMode ? 0.4 : 1 }
                            },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: contentConfig[type],
                                    disabled: skeletonMode,
                                    onChange: e => setContentConfig({ ...contentConfig, [type]: e.target.checked })
                                }),
                                ` ${DiscourseGraphToolkit.TYPES[type].label} (${type})`
                            )
                        )
                    ),
                    React.createElement('div', {
                        style: {
                            fontSize: '0.6875rem', color: '#888', marginTop: '0.25rem',
                            lineHeight: '1.3'
                        }
                    }, 'Los t\u00edtulos siempre aparecen. Marca un tipo para incluir adem\u00e1s el texto de sus bloques internos.'),
                    React.createElement('div', { style: { marginTop: '0.625rem' } },
                        React.createElement('label', {
                            style: { opacity: skeletonMode ? 0.4 : 1 }
                        },
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: excludeBitacora,
                                disabled: skeletonMode,
                                onChange: e => setExcludeBitacora(e.target.checked)
                            }),
                            ' Excluir contenido de [[bitácora]]'
                        )
                    )
                )
            )
        ),
        React.createElement('div', { style: { marginTop: '1.25rem' } },
            React.createElement('button', {
                onClick: handleExport,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '0.25rem', marginRight: '0.625rem' }
            }, 'Exportar JSON'),
            React.createElement('button', {
                onClick: handleExportHtml,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.primary || '#2196F3', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar HTML'),
            React.createElement('button', {
                onClick: handleExportMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.successHover || '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'Exportar Markdown'),
            React.createElement('button', {
                onClick: handleExportFlatMarkdown,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.neutral || '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'MD Plano'),
            React.createElement('button', {
                onClick: handleExportEpub,
                disabled: isExporting,
                style: { padding: '0.625rem 1.25rem', backgroundColor: DiscourseGraphToolkit.THEME?.colors?.danger || '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', marginRight: '0.625rem', cursor: isExporting ? 'not-allowed' : 'pointer' }
            }, 'EPUB')
        ),
        exportStatus && React.createElement('div', { style: { marginTop: '0.625rem', fontWeight: 'bold' } }, exportStatus),

        // --- Paso 3: Orden de Exportación (D&D) ---
        React.createElement('div', {
            style: { marginTop: '1.25rem', border: '1px solid var(--dgt-border-color, #e5e3dc)', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
        },
            // Header del Paso 3
            React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', backgroundColor: 'var(--dgt-bg-secondary, #f3f1eb)', borderBottom: '1px solid var(--dgt-border-color, #e5e3dc)' }
            },
                React.createElement('span', { style: { fontWeight: 600, fontSize: '0.875rem' } },
                    orderedQuestions.length > 0 ? `3. Orden de Exportación (${orderedQuestions.length} nodo${orderedQuestions.length !== 1 ? 's' : ''})` : '3. Orden de Exportación'
                ),
                orderedQuestions.length > 0 && React.createElement('span', { style: { fontSize: '0.6875rem', color: 'var(--dgt-text-muted, #999)', fontStyle: 'italic' } },
                    '⋮⋮ Arrastra para reordenar'
                )
            ),
            // Cuerpo: modo agrupado o plano
            orderedQuestions.length > 0 ? (
                React.createElement('div', { style: { padding: '0.5rem', maxHeight: '22rem', overflowY: 'auto' } },
                    orderedGroups.length > 1
                        // Modo agrupado: grupos arrastrables
                        ? orderedGroups.map((gk, gi) => {
                        const groupNodes = orderedQuestions.filter(q => q._groupKey === gk);
                        const groupLabel = gk.split('/').pop();
                        const isGroupDragOver = dragType === 'group' && dragOverIdx === gi;
                        return React.createElement('div', {
                            key: gk,
                            draggable: true,
                            onDragStart: e => handleGroupDragStart(e, gi),
                            onDragEnter: e => handleGroupDragEnter(e, gi),
                            onDragOver: handleGroupDragOver,
                            onDragEnd: handleGroupDragEnd,
                            onDrop: e => handleGroupDrop(e, gi),
                            style: { marginBottom: '0.375rem', border: `1px solid ${isGroupDragOver ? 'var(--dgt-accent-purple, #6c5c99)' : 'var(--dgt-border-color, #e5e3dc)'}`, borderRadius: '5px', backgroundColor: 'var(--dgt-bg-primary, #fff)', opacity: dragType === 'group' && dragIdx === gi ? 0.4 : 1, transition: 'opacity 0.15s' }
                        },
                            // Header grupo
                            React.createElement('div', {
                                style: { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', backgroundColor: 'var(--dgt-bg-secondary, #f3f1eb)', borderRadius: '5px 5px 0 0', cursor: 'grab' }
                            },
                                React.createElement('span', { style: { fontSize: '0.75rem', color: 'var(--dgt-text-muted, #999)', userSelect: 'none' } }, '⋮⋮'),
                                React.createElement('span', { style: { fontWeight: 600, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.03em', flex: 1 } }, groupLabel),
                                React.createElement('span', { className: 'dgt-badge dgt-badge-neutral', style: { fontSize: '0.625rem' } }, `${groupNodes.length}`)
                            ),
                            // Nodos del grupo
                            groupNodes.map((q, ni) => {
                                const isNodeDragOver = dragType === 'node' && dragGroupKey === gk && dragOverIdx === ni;
                                const nodeType = DiscourseGraphToolkit.getNodeType(q.title) || 'QUE';
                                return React.createElement('div', {
                                    key: q.uid,
                                    draggable: true,
                                    onDragStart: e => handleNodeDragStart(e, gk, ni),
                                    onDragEnter: e => handleNodeDragEnter(e, ni),
                                    onDragOver: handleNodeDragOver,
                                    onDragEnd: handleNodeDragEnd,
                                    onDrop: e => handleNodeDrop(e, gk, ni),
                                    style: { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3125rem 0.625rem 0.3125rem 1.25rem', borderTop: '1px solid var(--dgt-border-color, #e5e3dc)', backgroundColor: isNodeDragOver ? 'var(--dgt-bg-secondary, #f3f1eb)' : 'transparent', opacity: dragType === 'node' && dragGroupKey === gk && dragIdx === ni ? 0.4 : 1, cursor: 'grab', transition: 'background 0.1s' }
                                },
                                    React.createElement('span', { style: { fontSize: '0.6875rem', color: 'var(--dgt-text-muted, #bbb)', userSelect: 'none', flexShrink: 0 } }, '⋮⋮'),
                                    React.createElement('span', { className: `dgt-badge ${nodeType === 'GRI' ? 'dgt-badge-info' : 'dgt-badge-neutral'}`, style: { fontSize: '0.5625rem', flexShrink: 0 } }, nodeType),
                                    React.createElement('span', { style: { fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: q.title }, cleanTitleForDisplay(q.title))
                                );
                            })
                        );
                    })
                    // Modo plano: solo nodos
                    : orderedQuestions.map((q, ni) => {
                        const isNodeDragOver = dragType === 'node' && dragGroupKey === null && dragOverIdx === ni;
                        const nodeType = DiscourseGraphToolkit.getNodeType(q.title) || 'QUE';
                        return React.createElement('div', {
                            key: q.uid,
                            draggable: true,
                            onDragStart: e => handleNodeDragStart(e, null, ni),
                            onDragEnter: e => handleNodeDragEnter(e, ni),
                            onDragOver: handleNodeDragOver,
                            onDragEnd: handleNodeDragEnd,
                            onDrop: e => handleNodeDrop(e, null, ni),
                            style: { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderBottom: '1px solid var(--dgt-border-color, #e5e3dc)', backgroundColor: isNodeDragOver ? 'var(--dgt-bg-secondary, #f3f1eb)' : 'transparent', opacity: dragType === 'node' && dragGroupKey === null && dragIdx === ni ? 0.4 : 1, cursor: 'grab', transition: 'background 0.1s' }
                        },
                            React.createElement('span', { style: { fontSize: '0.6875rem', color: 'var(--dgt-text-muted, #bbb)', userSelect: 'none', flexShrink: 0 } }, '⋮⋮'),
                            React.createElement('span', { className: `dgt-badge ${nodeType === 'GRI' ? 'dgt-badge-info' : 'dgt-badge-neutral'}`, style: { fontSize: '0.5625rem', flexShrink: 0 } }, nodeType),
                        );
                    })
                )
            ) : (
                // Si no hay orderedQuestions, mostrar un botón para generarlas (Preview)
                React.createElement('div', { style: { padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--dgt-bg-primary, #fff)' } },
                    React.createElement('div', { style: { marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--dgt-text-secondary)' } },
                        'Genera una vista previa para organizar los nodos y grupos antes de exportar.'
                    ),
                    React.createElement('button', {
                        onClick: handlePreview,
                        disabled: isExporting,
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--dgt-bg-secondary)',
                            border: '1px solid var(--dgt-border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: 'var(--dgt-text-primary)'
                        }
                    }, 'Generar Orden de Exportación')
                )
            )
        )
    );
};
