
// ============================================================================
// 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
// ============================================================================

DiscourseGraphToolkit.getIdsFromIndexPage = async function (pageTitle, targetTypes = ['QUE', 'CLM', 'EVD']) {
    // 0. Sanitize input to handle [[Page Name]] format
    const cleanTitle = pageTitle.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();

    // 1. Obtener UID de la página índice
    const pageRes = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${cleanTitle}"] [?page :block/uid ?uid]]`);
    if (!pageRes || pageRes.length === 0) {
        throw new Error(`Página índice "${cleanTitle}" no encontrada.`);
    }
    const pageUid = pageRes[0][0];

    // 2. Traer todo el árbol de la página para respetar el orden visual
    // Usamos un pull recursivo profundo
    const pullPattern = `[:block/uid :block/order :block/children :node/title :block/string {:block/children ...}]`;
    const result = await window.roamAlphaAPI.data.async.pull(pullPattern, [`:block/uid`, pageUid]);

    if (!result) return [];

    const orderedPages = [];
    const targetPrefixes = targetTypes.map(t => DiscourseGraphToolkit.TYPES[t].prefix);

    // 3. Función recursiva para recorrer bloques en orden
    const traverse = (block) => {
        if (!block) return;

        // Verificar si este bloque es una referencia a una página de discurso
        // En Roam, las referencias a páginas suelen estar en :block/string como "[[Title]]"
        // O si es un bloque que es hijo, podría ser un nodo incrustado.
        // Pero lo más común en índices es usar links [[Page Name]].

        if (block[':block/string']) {
            const str = block[':block/string'];
            // Buscar todos los [[Links]]
            const matches = [...str.matchAll(/\[\[(.*?)\]\]/g)];
            matches.forEach(m => {
                const title = m[1];
                if (targetPrefixes.some(prefix => title.startsWith(prefix))) {
                    // Necesitamos el UID de esa página
                    // Nota: Idealmente ya tendríamos el mapa de Title -> UID, pero aquí haremos querys o optimizaremos después
                    // Para evitar N+1 querys lentos, mejor recolectamos nombres y hacemos un bulk query,
                    // pero para mantener el ORDEN VISUAL exacto, lo haremos secuencial o pos-procesado.
                    orderedPages.push({ pageTitle: title });
                }
            });
        }

        if (block[':block/children']) {
            const children = block[':block/children'].sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));
            children.forEach(traverse);
        }
    };

    if (result[':block/children']) {
        const children = result[':block/children'].sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));
        children.forEach(traverse);
    }

    // 4. Resolver UIDs para los títulos encontrados (Bulk)
    if (orderedPages.length > 0) {
        const titles = orderedPages.map(p => p.pageTitle);
        // Query param must be distinct
        const uniqueTitles = [...new Set(titles)];

        // Construir query masiva con "or" es complejo en Datalog puro si son muchos.
        // Iteraremos por simplicidad y robustez por ahora (optimizable).
        for (let item of orderedPages) {
            const res = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${item.pageTitle}"] [?page :block/uid ?uid]]`);
            if (res && res.length > 0) {
                item.pageUid = res[0][0];
            }
        }
    }

    return orderedPages.filter(p => p.pageUid);
};

DiscourseGraphToolkit.transformToNativeFormat = function (pullData, depth = 0, visited = new Set(), includeContent = true) {
    if (!pullData) return null;
    if (depth > this.FILES.MAX_DEPTH) return { 'uid': pullData[':block/uid'], '_truncated': true };

    const uid = pullData[':block/uid'];
    if (uid && visited.has(uid)) return { 'uid': uid, '_circular_ref': true };

    const newVisited = new Set(visited);
    if (uid) newVisited.add(uid);

    const transformed = {};
    // FIX: Check for undefined to allow empty strings
    if (pullData[':block/string'] !== undefined) transformed['string'] = pullData[':block/string'];
    if (pullData[':block/uid']) transformed['uid'] = pullData[':block/uid'];
    if (pullData[':node/title']) transformed['title'] = pullData[':node/title'];
    if (pullData[':edit/time']) transformed['edit-time'] = this.convertTimestamp(pullData[':edit/time']);
    if (pullData[':create/time']) transformed['create-time'] = this.convertTimestamp(pullData[':create/time']);
    if (pullData[':block/order'] !== undefined) transformed['order'] = pullData[':block/order'];

    if (pullData[':block/refs'] && Array.isArray(pullData[':block/refs'])) {
        transformed[':block/refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { ':block/uid': ref[':block/uid'] } : ref
        );
        transformed['refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { uid: ref[':block/uid'] } : ref
        );
    }

    if (pullData[':create/user']) transformed[':create/user'] = { ':user/uid': pullData[':create/user'][':user/uid'] };
    if (pullData[':edit/user']) transformed[':edit/user'] = { ':user/uid': pullData[':edit/user'][':user/uid'] };

    // Solo procesar hijos si includeContent es true O si es el nivel raíz (depth 0 es la página, sus hijos son los bloques)
    // Pero espera, si depth 0 es la página, sus hijos son el contenido.
    // Si includeContent es false, queremos la página (título, uid) pero NO sus hijos.
    if (includeContent && pullData[':block/children'] && Array.isArray(pullData[':block/children'])) {
        // SORTING FIX: Ensure children are processed in visual order
        const sortedChildren = [...pullData[':block/children']].sort((a, b) => {
            const orderA = a[':block/order'] !== undefined ? a[':block/order'] : 9999;
            const orderB = b[':block/order'] !== undefined ? b[':block/order'] : 9999;
            return orderA - orderB;
        });

        transformed['children'] = sortedChildren.map(child =>
            this.transformToNativeFormat(child, depth + 1, newVisited, includeContent)
        );
    }
    return transformed;
};

// --- Lógica de Exportación Nativa Robusta ---
DiscourseGraphToolkit.exportPagesNative = async function (pageUids, filename, onProgress, includeContent = true, download = true) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
    report(`Iniciando exportación de ${pageUids.length} páginas (Incluir contenido: ${includeContent})...`);

    const eids = pageUids.map(uid => [':block/uid', uid]);

    try {
        // Si no incluimos contenido, el patrón de pull podría ser más simple, pero usaremos el mismo y filtraremos en transform
        // Esto es menos eficiente en red pero más simple en código.
        // Opcional: Usar un patrón diferente si includeContent es false.
        const pattern = includeContent ? this.ROAM_PULL_PATTERN : `[:block/uid :node/title :edit/time :create/time :block/string]`;

        const rawData = await window.roamAlphaAPI.data.async.pull_many(pattern, eids);

        const exportData = rawData
            .filter(d => d !== null)
            .map((d, i) => {
                if ((i + 1) % 5 === 0) report(`Procesando ${i + 1}/${rawData.length}...`);
                return this.transformToNativeFormat(d, 0, new Set(), includeContent);
            });

        if (download) {
            this.downloadJSON(exportData, filename);
        }

        return { count: exportData.length, data: exportData };
    } catch (e) {
        console.error("Error exportando:", e);
        throw e;
    }
};


