// ============================================================================
// CORE: Relationship Mapper
// Ported from roamMap/core/relationship_mapper.py
// ============================================================================

DiscourseGraphToolkit.RelationshipMapper = {
    mapRelationships: function (allNodes) {
        console.log("Mapeando relaciones entre nodos...");

        // Paso 1: Crear mapas de búsqueda
        const { clmTitleMap, evdTitleMap } = this._createTitleMaps(allNodes);

        // Paso 2: Mapear QUE -> CLM/EVD (respuestas directas)
        this._mapQueRelationships(allNodes, clmTitleMap, evdTitleMap);

        // Paso 3: Mapear CLM -> EVD/CLM (estructura estándar y relaciones laterales)
        this._mapClmRelationships(allNodes, evdTitleMap, clmTitleMap);

        // Paso 4: Mapear relaciones CLM-CLM y CLM-EVD vía #RelatedTo
        this._mapClmRelatedToRelationships(allNodes, clmTitleMap, evdTitleMap);
    },

    _createTitleMaps: function (allNodes) {
        const clmTitleMap = {};
        const evdTitleMap = {};

        for (const uid in allNodes) {
            const node = allNodes[uid];
            try {
                if (node.type === "CLM") {
                    this._addToTitleMap(clmTitleMap, node, uid, "[[CLM]] - ");
                } else if (node.type === "EVD") {
                    this._addToTitleMap(evdTitleMap, node, uid, "[[EVD]] - ");
                }
            } catch (e) {
                console.warn(`⚠ Error creando mapa para nodo ${uid}: ${e}`);
            }
        }

        console.log(`Mapas creados: ${Object.keys(clmTitleMap).length} CLMs, ${Object.keys(evdTitleMap).length} EVDs`);
        return { clmTitleMap, evdTitleMap };
    },

    _addToTitleMap: function (titleMap, node, uid, prefix) {
        const title = node.title || "";
        if (!title) return;

        // Guardar tanto el título completo como una versión limpia
        titleMap[title] = uid;
        const cleanTitle = DiscourseGraphToolkit.cleanText(title.replace(prefix, ""));
        titleMap[cleanTitle] = uid;
    },

    _mapQueRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "QUE") continue;

            // Inicializar arrays si no existen
            if (!node.related_clms) node.related_clms = [];
            if (!node.direct_evds) node.direct_evds = [];

            try {
                const data = node.data;
                let respondedByFound = false;

                // Buscar hijos con el string "#RespondedBy" (flexible)
                const children = data.children || [];
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#RespondedBy")) {
                        respondedByFound = true;
                        this._processRespondedByChildren(child, node, uid, allNodes, clmTitleMap, evdTitleMap);
                    }
                }

                if (!respondedByFound) {
                    // console.warn(`  ADVERTENCIA: No se encontró '#RespondedBy' en QUE: ${node.title.substring(0, 50)}...`);
                }

            } catch (e) {
                console.error(`❌ Error mapeando relaciones para QUE ${uid}: ${e}`);
            }
        }
    },

    _processRespondedByChildren: function (parentChild, node, uid, allNodes, clmTitleMap, evdTitleMap) {
        const children = parentChild.children || [];
        for (const response of children) {
            try {
                const responseText = response.string || "";

                // A. Buscar relaciones por referencias directas (UID)
                const refsToCheck = [];

                if (response.refs) {
                    refsToCheck.push(...response.refs);
                }

                if (response[':block/refs']) {
                    const blockRefs = response[':block/refs'];
                    for (const ref of blockRefs) {
                        if (ref[':block/uid']) {
                            refsToCheck.push({ uid: ref[':block/uid'] });
                        }
                    }
                }

                for (const ref of refsToCheck) {
                    const refUid = ref.uid || "";
                    if (allNodes[refUid]) {
                        if (allNodes[refUid].type === "CLM") {
                            if (!node.related_clms.includes(refUid)) {
                                node.related_clms.push(refUid);
                            }
                        } else if (allNodes[refUid].type === "EVD") {
                            if (!node.direct_evds.includes(refUid)) {
                                node.direct_evds.push(refUid);
                            }
                        }
                    }
                }

                // B. Buscar relaciones incrustadas en el texto
                this._findEmbeddedRelationships(responseText, node, uid, clmTitleMap, evdTitleMap, "related_clms", "direct_evds");

            } catch (e) {
                console.warn(`⚠ Error procesando respuesta en QUE ${uid}: ${e}`);
            }
        }
    },

    _findEmbeddedRelationships: function (responseText, node, uid, clmTitleMap, evdTitleMap, clmField, evdField) {
        try {
            // Extraer todas las referencias [[...]] del texto
            const pattern = /\[\[([^\]]+)\]\]/g;
            const references = [];
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                references.push(match[1]); // match[1] es el contenido dentro de los corchetes
            }

            if (references.length === 0) return;

            // Buscar CLMs
            if (references.some(ref => ref.includes('CLM'))) {
                for (const ref of references) {
                    if (clmTitleMap[ref]) {
                        const clmUid = clmTitleMap[ref];
                        if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                            node[clmField].push(clmUid);
                        }
                    } else if (ref.includes('CLM')) {
                        // Búsqueda parcial
                        for (const titleFragment in clmTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const clmUid = clmTitleMap[titleFragment];
                                if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                                    node[clmField].push(clmUid);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Buscar EVDs
            if (references.some(ref => ref.includes('EVD'))) {
                for (const ref of references) {
                    if (evdTitleMap[ref]) {
                        const evdUid = evdTitleMap[ref];
                        if (!node[evdField].includes(evdUid)) {
                            node[evdField].push(evdUid);
                        }
                    } else if (ref.includes('EVD')) {
                        // Búsqueda parcial
                        for (const titleFragment in evdTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const evdUid = evdTitleMap[titleFragment];
                                if (!node[evdField].includes(evdUid)) {
                                    node[evdField].push(evdUid);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

        } catch (e) {
            console.warn(`⚠ Error buscando relaciones incrustadas: ${e}`);
        }
    },

    _mapClmRelationships: function (allNodes, evdTitleMap, clmTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            if (!node.related_evds) node.related_evds = [];
            if (!node.connected_clms) node.connected_clms = [];
            if (!node.supporting_clms) node.supporting_clms = [];

            try {
                const data = node.data;
                let supportedByFound = false;

                const children = data.children || [];
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#SupportedBy")) {
                        supportedByFound = true;
                        this._processSupportedByChildren(child, node, uid, allNodes, evdTitleMap, clmTitleMap);
                    }
                }

                if (!supportedByFound) {
                    // console.warn(`  ADVERTENCIA: No se encontró '#SupportedBy' en CLM: ${node.title.substring(0, 50)}...`);
                }

            } catch (e) {
                console.error(`❌ Error mapeando relaciones para CLM ${uid}: ${e}`);
            }
        }
    },

    _processSupportedByChildren: function (parentChild, node, uid, allNodes, evdTitleMap, clmTitleMap) {
        const children = parentChild.children || [];
        for (const evidence of children) {
            try {
                // A. Buscar relaciones por referencias directas (UID)
                const refsToCheck = [];

                if (evidence.refs) refsToCheck.push(...evidence.refs);
                if (evidence[':block/refs']) {
                    for (const ref of evidence[':block/refs']) {
                        if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                    }
                }

                for (const ref of refsToCheck) {
                    const refUid = ref.uid || "";
                    if (allNodes[refUid]) {
                        const referencedNode = allNodes[refUid];
                        if (referencedNode.type === "EVD") {
                            if (!node.related_evds.includes(refUid)) {
                                node.related_evds.push(refUid);
                            }
                        } else if (referencedNode.type === "CLM") {
                            if (!node.supporting_clms.includes(refUid)) {
                                node.supporting_clms.push(refUid);
                            }
                        }
                    }
                }

                // B. Buscar relaciones incrustadas en el texto
                const evidenceText = evidence.string || "";
                this._findEmbeddedRelationships(evidenceText, node, uid, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");

            } catch (e) {
                console.warn(`⚠ Error procesando evidencia en CLM ${uid}: ${e}`);
            }
        }
    },

    _mapClmRelatedToRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            try {
                const data = node.data;
                const children = data.children || [];
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#RelatedTo")) {
                        this._processRelatedToChildren(child, node, uid, allNodes, clmTitleMap, evdTitleMap);
                    }
                }
            } catch (e) {
                console.error(`❌ Error mapeando relaciones #RelatedTo para CLM ${uid}: ${e}`);
            }
        }
    },

    _processRelatedToChildren: function (parentChild, node, uid, allNodes, clmTitleMap, evdTitleMap) {
        const children = parentChild.children || [];
        for (const relatedItem of children) {
            try {
                const refsToCheck = [];
                if (relatedItem.refs) refsToCheck.push(...relatedItem.refs);
                if (relatedItem[':block/refs']) {
                    for (const ref of relatedItem[':block/refs']) {
                        if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                    }
                }

                for (const ref of refsToCheck) {
                    const refUid = ref.uid || "";
                    if (allNodes[refUid] && refUid !== uid) {
                        const referencedNode = allNodes[refUid];
                        if (referencedNode.type === "CLM") {
                            if (!node.connected_clms.includes(refUid)) {
                                node.connected_clms.push(refUid);
                            }
                        } else if (referencedNode.type === "EVD") {
                            if (!node.related_evds.includes(refUid)) {
                                node.related_evds.push(refUid);
                            }
                        }
                    }
                }

                const relatedText = relatedItem.string || "";
                this._findEmbeddedRelationships(relatedText, node, uid, clmTitleMap, evdTitleMap, "connected_clms", "related_evds");

            } catch (e) {
                console.warn(`⚠ Error procesando item #RelatedTo en CLM ${uid}: ${e}`);
            }
        }
    },

    collectDependencies: function (nodes) {
        const dependencies = new Set();

        for (const node of nodes) {
            try {
                const data = node.data;
                const children = data.children || [];

                // QUE -> #RespondedBy
                if (node.type === "QUE") {
                    for (const child of children) {
                        if ((child.string || "").includes("#RespondedBy")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
                // CLM -> #SupportedBy / #RelatedTo
                else if (node.type === "CLM") {
                    for (const child of children) {
                        const str = child.string || "";
                        if (str.includes("#SupportedBy") || str.includes("#RelatedTo")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
            } catch (e) {
                console.warn(`Error collecting dependencies for ${node.uid}:`, e);
            }
        }
        return dependencies;
    },

    _collectRefsFromBlock: function (block, dependencies) {
        const children = block.children || [];
        for (const child of children) {
            // Direct refs
            if (child.refs) child.refs.forEach(r => dependencies.add(r.uid));
            if (child[':block/refs']) {
                child[':block/refs'].forEach(r => {
                    if (r[':block/uid']) dependencies.add(r[':block/uid']);
                });
            }
            // Embedded refs [[UID]] - we can't easily parse UID from text unless we have a map.
            // But usually structural links use block refs or page refs which show up in metadata.
            // For now, rely on explicit refs.
        }
    }
};


