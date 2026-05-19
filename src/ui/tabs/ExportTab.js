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
        groupNamespaces, setGroupNamespaces,
        hideNodeLabels, setHideNodeLabels,
        useAcademicNumbering, setUseAcademicNumbering
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
            skeletonMode: skeletonMode,
            groupNamespaces: groupNamespaces,
            hideNodeLabels: hideNodeLabels,
            useAcademicNumbering: useAcademicNumbering
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
        if (data.groupNamespaces !== undefined) setGroupNamespaces(data.groupNamespaces);
        if (data.hideNodeLabels !== undefined) setHideNodeLabels(data.hideNodeLabels);
        if (data.useAcademicNumbering !== undefined) setUseAcademicNumbering(data.useAcademicNumbering);
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
        if (data.groupNamespaces !== undefined && data.groupNamespaces !== groupNamespaces) return false;
        if (data.hideNodeLabels !== undefined && data.hideNodeLabels !== hideNodeLabels) return false;
        if (data.useAcademicNumbering !== undefined && data.useAcademicNumbering !== useAcademicNumbering) return false;
        return true;
    };

    // --- Limpiar preview cuando cambian los proyectos seleccionados ---
    React.useEffect(() => {
        setPreviewPages([]);
    }, [selectedProjects, selectedTypes, contentConfig, excludeBitacora, skeletonMode, groupNamespaces, hideNodeLabels, useAcademicNumbering]);

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

    // --- Helpers para Seleccionar Todo ---
    const selectAllProjects = () => {
        const allSelected = {};
        projects.forEach(p => allSelected[p] = true);
        setSelectedProjects(allSelected);
    };

    const selectAllTypes = () => {
        setSelectedTypes({ GRI: true, QUE: true, CLM: true, EVD: true });
    };

    
    // --- Fetch Pages ---
    const fetchPagesToExport = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return null;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            const uidToProject = {};
            // Ordenar pNames por longitud descendente para que los sub-proyectos específicos ganen en el mapeo
            const sortedPNames = [...pNames].sort((a, b) => b.length - a.length);
            
            for (let p of sortedPNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                for (const page of pages) {
                    if (!uidToProject[page.pageUid]) {
                        uidToProject[page.pageUid] = p; // proyecto más específico gana
                    }
                }
                allPages = allPages.concat(pages);
            }

            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());
            setPreviewPages(uniquePages);
            return { uniquePages, uidToProject };
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return null;
        }
    };

    const prepareExportData = async (pagesToExport, pNames, uidToProject) => {
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
        // Aplicar orden desde localStorage (Conexión Absoluta con Panorámica)
        let orderedQuestionsToExport = [];
        const parentKey = getParentProjectKey(pNames);
        
        // Nodos que tienen project mapeado
        const annotated = questions.map(q => ({
            ...q, 
            _project: uidToProject[q.uid] || null
        }));

        const subProjectSet = new Set();
        pNames.forEach(p => {
            if (p === parentKey) {
                subProjectSet.add(p);
            } else if (p.startsWith(parentKey + '/')) {
                const rest = p.substring(parentKey.length + 1);
                const immediate = rest.split('/')[0];
                subProjectSet.add(parentKey + '/' + immediate);
            }
        });

        const hasGroups = subProjectSet.size > 1;

        if (hasGroups) {
            // Modo agrupado
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(parentKey);
            const orderedGroups = savedGroupOrder && savedGroupOrder.length > 0
                ? [...savedGroupOrder.filter(g => subProjectSet.has(g)), ...Array.from(subProjectSet).filter(g => !savedGroupOrder.includes(g))]
                : Array.from(subProjectSet).sort();

            let finalUidOrder = [];
            const addedUids = new Set();
            for (const gk of orderedGroups) {
                const groupNodes = annotated.filter(q => q._project === gk || (q._project && q._project.startsWith(gk + '/')));
                const uniqueGroupNodes = groupNodes.filter(q => !addedUids.has(q.uid));
                if (uniqueGroupNodes.length === 0) continue;

                const savedQ = DiscourseGraphToolkit.loadQuestionOrder(gk);
                if (savedQ && savedQ.length > 0) {
                    const ordered = savedQ.map(uid => uniqueGroupNodes.find(q => q.uid === uid)).filter(Boolean);
                    const unseen = uniqueGroupNodes.filter(q => !savedQ.includes(q.uid));
                    ordered.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                    unseen.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                } else {
                    uniqueGroupNodes.forEach(q => {
                        finalUidOrder.push(q.uid);
                        addedUids.add(q.uid);
                    });
                }
            }
            
            // Nodos sin grupo
            const assignedUids = new Set(finalUidOrder);
            const unassignedNodes = annotated.filter(q => !assignedUids.has(q.uid));
            finalUidOrder.push(...unassignedNodes.map(q => q.uid));

            const reordered = finalUidOrder.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
            orderedQuestionsToExport = reordered;
        } else {
            // Modo plano
            const savedQ = DiscourseGraphToolkit.loadQuestionOrder(parentKey);
            if (savedQ && savedQ.length > 0) {
                const ordered = savedQ.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
                const unseen = annotated.filter(q => !savedQ.includes(q.uid));
                orderedQuestionsToExport = [...ordered, ...unseen];
            } else {
                orderedQuestionsToExport = annotated;
            }
        }

        const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(parentKey);
        const filename = `DG_${sanitizedNames}`;

        // Retornar preguntas YA ordenadas para el export
        return { questions: orderedQuestionsToExport, allNodes, filename };
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
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
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
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
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { groupNamespaces, hideNodeLabels, useAcademicNumbering };

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, false, skeletonMode, formatOptions
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
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { groupNamespaces, hideNodeLabels, useAcademicNumbering };

            setExportStatus("Generando Markdown Plano...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode, formatOptions
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
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }

        setIsExporting(true);
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const { questions, allNodes, filename } = await prepareExportData(pagesToExport, pNames, uidToProject);
            // questions ya viene ordenado desde prepareExportData
            const questionsToExport = questions;

            const formatOptions = { compactIndentation, groupNamespaces };

            setExportStatus("Generando Markdown para EPUB...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateFlatMarkdown(
                questionsToExport, allNodes, contentConfig, excludeBitacora, skeletonMode, formatOptions
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
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexShrink: 0 } },
                    React.createElement('h4', { style: { marginTop: 0, marginBottom: '0.5rem' } }, '2. Tipos'),
                    React.createElement('span', {
                        onClick: selectAllTypes,
                        style: { fontSize: '0.75rem', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'Seleccionar todos')
                ),
                React.createElement('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '0.25rem', paddingBottom: '0.5rem' } },
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
                ),
                React.createElement('div', { style: { marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.625rem' } },
                    React.createElement('strong', { style: { display: 'block', marginBottom: '0.3125rem', fontSize: '0.75rem' } }, 'Formato (para impresión):'),
                    React.createElement('div', { style: { marginTop: '0.25rem' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: groupNamespaces,
                                onChange: e => setGroupNamespaces(e.target.checked)
                            }),
                            ' Usar namespaces como títulos de sección'
                        )
                    ),
                    React.createElement('div', { style: { marginTop: '0.25rem' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: hideNodeLabels,
                                onChange: e => setHideNodeLabels(e.target.checked)
                            }),
                            ' Ocultar etiquetas de nodo ([[QUE]], etc.)'
                        )
                    ),
                    React.createElement('div', { style: { marginTop: '0.25rem' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: useAcademicNumbering,
                                onChange: e => setUseAcademicNumbering(e.target.checked)
                            }),
                            ' Usar numeración jerárquica (Ej: 1.1.1.)'
                        )
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

    );
};
