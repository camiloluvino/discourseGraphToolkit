
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

    // 2. Traer todo el árbol de la página CON :block/refs para obtener referencias estructuradas
    const pullPattern = `[
        :block/uid 
        :block/order 
        :block/string
        {:block/refs [:node/title :block/uid]}
        {:block/children ...}
    ]`;
    const result = await window.roamAlphaAPI.data.async.pull(pullPattern, [`:block/uid`, pageUid]);

    if (!result) return [];

    const orderedPages = [];
    const targetPrefixes = targetTypes.map(t => `[[${DiscourseGraphToolkit.TYPES[t].prefix}]]`);

    // 3. Función recursiva para recorrer bloques en orden visual
    const traverse = (block) => {
        if (!block) return;

        // Usar :block/refs que contiene las referencias estructuradas con título y UID
        if (block[':block/refs'] && Array.isArray(block[':block/refs'])) {
            for (const ref of block[':block/refs']) {
                const title = ref[':node/title'];
                const uid = ref[':block/uid'];
                if (title && targetPrefixes.some(prefix => title.startsWith(prefix))) {
                    orderedPages.push({ pageTitle: title, pageUid: uid });
                }
            }
        }

        // Recorrer hijos en orden
        if (block[':block/children']) {
            const children = block[':block/children'].sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));
            children.forEach(traverse);
        }
    };

    // Iniciar traversal desde los hijos de la página
    if (result[':block/children']) {
        const children = result[':block/children'].sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));
        children.forEach(traverse);
    }

    return orderedPages;
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


