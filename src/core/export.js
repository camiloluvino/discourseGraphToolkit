// ============================================================================
// 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
// ============================================================================

DiscourseGraphToolkit.transformToNativeFormat = function (pullData, depth = 0, visited = new Set()) {
    if (!pullData) return null;
    if (depth > this.FILES.MAX_DEPTH) return { 'uid': pullData[':block/uid'], '_truncated': true };

    const uid = pullData[':block/uid'];
    if (uid && visited.has(uid)) return { 'uid': uid, '_circular_ref': true };

    const newVisited = new Set(visited);
    if (uid) newVisited.add(uid);

    const transformed = {};
    if (pullData[':block/string']) transformed['string'] = pullData[':block/string'];
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

    if (pullData[':block/children'] && Array.isArray(pullData[':block/children'])) {
        transformed['children'] = pullData[':block/children'].map(child =>
            this.transformToNativeFormat(child, depth + 1, newVisited)
        );
    }
    return transformed;
};

// --- Lógica de Exportación Nativa Robusta ---
DiscourseGraphToolkit.exportPagesNative = async function (pageUids, filename, onProgress) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
    report(`Iniciando exportación de ${pageUids.length} páginas...`);

    const eids = pageUids.map(uid => [':block/uid', uid]);

    try {
        const rawData = await window.roamAlphaAPI.data.async.pull_many(this.ROAM_PULL_PATTERN, eids);

        const exportData = rawData
            .filter(d => d !== null)
            .map((d, i) => {
                if ((i + 1) % 5 === 0) report(`Procesando ${i + 1}/${rawData.length}...`);
                return this.transformToNativeFormat(d);
            });

        this.downloadJSON(exportData, filename);
        return { count: exportData.length };
    } catch (e) {
        console.error("Error exportando:", e);
        throw e;
    }
};
