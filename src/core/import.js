// ============================================================================
// CORE: Importación
// ============================================================================

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };

    // Las pausas del limitador se informan en la pestaña Importar mientras dure la importación
    DiscourseGraphToolkit.MutationThrottle.setProgressCallback(report);
    try {
        return await this._importGraph(jsonContent, report);
    } finally {
        DiscourseGraphToolkit.MutationThrottle.setProgressCallback(null);
    }
};

DiscourseGraphToolkit._importGraph = async function (jsonContent, report) {
    report(`Leyendo archivo (${jsonContent.length} bytes)...`);

    let data;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("El archivo no es un JSON válido: " + e.message);
    }

    if (!Array.isArray(data)) {
        throw new Error("El formato del JSON no es válido (debe ser un array de páginas).");
    }

    console.log("Import Data Length:", data.length);
    if (data.length === 0) {
        throw new Error("El archivo JSON contiene un array vacío (0 ítems).");
    }

    report(`Iniciando importación de ${data.length} ítems...`);
    let createdPages = 0;
    let skippedPages = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
        const pageData = data[i];
        // Normalizar claves (Soporte para exportaciones antiguas o raw)
        const title = pageData.title || pageData[':node/title'] || pageData[':title'];
        const uid = pageData.uid || pageData[':block/uid'] || pageData[':uid'];
        const children = pageData.children || pageData[':block/children'] || pageData['children'];

        if (!title) {
            console.warn("Item sin título saltado:", pageData);
            skippedPages++;
            continue;
        }

        report(`Procesando página ${i + 1}/${data.length}: ${title}`);

        try {
            await this.importPage({ ...pageData, title, uid, children });
            createdPages++;
        } catch (e) {
            console.error(`Error importando página ${title}:`, e);
            errors.push(`${title}: ${e.message}`);
            report(`❌ Error en página ${title}: ${e.message}`);
        }
    }

    // 3. Log en Daily Note
    if (createdPages > 0) {
        const importedTitles = data.map(p => p.title || p[':node/title'] || p[':title']).filter(t => t);
        await this.logImportToDailyNote(importedTitles);
    }

    return { pages: createdPages, skipped: skippedPages, errors: errors };
};

DiscourseGraphToolkit.logImportToDailyNote = async function (importedTitles) {
    if (!importedTitles || importedTitles.length === 0) return;

    const today = new Date();
    const dailyNoteUid = window.roamAlphaAPI.util.dateToPageUid(today);
    const dailyNoteTitle = window.roamAlphaAPI.util.dateToPageTitle(today);

    // 1. Asegurar que la Daily Note existe
    let page = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", dailyNoteTitle]);
    if (!page) {
        await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
            await window.roamAlphaAPI.data.page.create({ "page": { "title": dailyNoteTitle, "uid": dailyNoteUid } });
        });
    }

    // 2. Crear bloque padre #import
    const importBlockUid = window.roamAlphaAPI.util.generateUID();
    const timestamp = today.toLocaleTimeString();
    await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": dailyNoteUid, "order": "last" },
            "block": { "uid": importBlockUid, "string": `#import (${timestamp})` }
        });
    });

    // 3. Crear hijos con los títulos
    for (let i = 0; i < importedTitles.length; i++) {
        const title = importedTitles[i];
        await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
            await window.roamAlphaAPI.data.block.create({
                "location": { "parent-uid": importBlockUid, "order": i },
                "block": { "string": `[[${title}]]` }
            });
        });
    }
};

DiscourseGraphToolkit.importPage = async function (pageData) {
    if (!pageData.title) return;

    // 1. Verificar si la página existe usando PULL (más robusto que Q)
    let pageUid = pageData.uid;
    // pull devuelve null si no encuentra la entidad
    let existingPage = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);

    if (existingPage && existingPage[':block/uid']) {
        // La página existe, usamos su UID real
        pageUid = existingPage[':block/uid'];
    } else {
        // La página no existe, la creamos
        if (!pageUid) pageUid = window.roamAlphaAPI.util.generateUID();

        const pageObj = { "title": pageData.title, "uid": pageUid };
        const childrenViewType = pageData['children-view-type'] ?? pageData[':children/view-type'];
        if (childrenViewType) pageObj['children-view-type'] = childrenViewType;

        try {
            await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
                await window.roamAlphaAPI.data.page.create({
                    "page": pageObj
                });
            });
        } catch (e) {
            console.warn(`Falló creación de página "${pageData.title}", intentando recuperar UID...`, e);
            // Si falla, intentamos ver si existe ahora (race condition?)
            let retry = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);
            if (retry && retry[':block/uid']) {
                pageUid = retry[':block/uid'];
            } else {
                throw e;
            }
        }
    }

    // 2. Importar hijos (Bloques)
    if (pageData.children && pageData.children.length > 0) {
        await this.importChildren(pageUid, pageData.children);
    }
};

DiscourseGraphToolkit.importChildren = async function (parentUid, children) {
    // Ordenar por 'order' si existe, para mantener la estructura
    const sortedChildren = [...children].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Inserción secuencial para evitar race conditions en la API de Roam
    for (let i = 0; i < sortedChildren.length; i++) {
        await DiscourseGraphToolkit.importBlock(parentUid, sortedChildren[i], i);
    }
};

DiscourseGraphToolkit.importBlock = async function (parentUid, blockData, order) {
    // 1. Evitar importar nodos truncados o referencias circulares del exportador
    if (blockData._truncated || blockData._circular_ref) {
        return;
    }

    // Normalizar claves de bloque
    const blockUid = blockData.uid || blockData[':block/uid'] || blockData[':uid'] || window.roamAlphaAPI.util.generateUID();
    const content = blockData.string || blockData[':block/string'] || blockData[':string'] || "";
    const children = blockData.children || blockData[':block/children'] || blockData['children'];

    // Verificar si el bloque ya existe (por UID) y obtener sus atributos actuales para diffing
    let exists = false;
    let existingBlock = null;
    if (blockData.uid || blockData[':block/uid']) {
        existingBlock = window.roamAlphaAPI.data.pull(
            "[:block/uid :block/open :block/heading :block/text-align :children/view-type]",
            [":block/uid", blockUid]
        );
        exists = !!(existingBlock && existingBlock[':block/uid']);
    }

    if (!exists) {
        // Crear bloque con atributos visuales y de formato si están presentes
        const blockObj = { "uid": blockUid, "string": content };

        const heading = blockData.heading ?? blockData[':block/heading'];
        const open = blockData.open ?? blockData[':block/open'];
        const textAlign = blockData['text-align'] ?? blockData[':block/text-align'];
        const childrenViewType = blockData['children-view-type'] ?? blockData[':children/view-type'];

        if (heading !== undefined && heading !== 0) blockObj.heading = heading;
        if (open !== undefined) blockObj.open = open;
        if (textAlign) blockObj['text-align'] = textAlign;
        if (childrenViewType) blockObj['children-view-type'] = childrenViewType;

        await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
            await window.roamAlphaAPI.data.block.create({
                "location": { "parent-uid": parentUid, "order": order },
                "block": blockObj
            });
        });
    } else {
        // El bloque existe.
        // ESTRATEGIA: NO SOBRESCRIBIR contenido textual.
        // PERO SÍ actualizar atributos visuales si hay diferencias reales (Diffing estricto).
        const targetHeading = blockData.heading ?? blockData[':block/heading'];
        const targetOpen = blockData.open ?? blockData[':block/open'];
        const targetTextAlign = blockData['text-align'] ?? blockData[':block/text-align'];
        const targetChildrenViewType = blockData['children-view-type'] ?? blockData[':children/view-type'];

        const currentHeading = existingBlock[':block/heading'] ?? 0;
        const currentOpen = existingBlock[':block/open'] ?? true;
        const currentTextAlign = existingBlock[':block/text-align'] ?? "left";
        const currentChildrenViewType = existingBlock[':children/view-type'] ?? "bullet";

        const updateObj = { "uid": blockUid };
        let hasChanges = false;

        if (targetHeading !== undefined && targetHeading !== currentHeading) {
            updateObj.heading = targetHeading;
            hasChanges = true;
        }

        if (targetOpen !== undefined && targetOpen !== currentOpen) {
            updateObj.open = targetOpen;
            hasChanges = true;
        }

        if (targetTextAlign !== undefined && targetTextAlign !== currentTextAlign) {
            updateObj['text-align'] = targetTextAlign;
            hasChanges = true;
        }

        if (targetChildrenViewType !== undefined && targetChildrenViewType !== currentChildrenViewType) {
            updateObj['children-view-type'] = targetChildrenViewType;
            hasChanges = true;
        }

        if (hasChanges) {
            await DiscourseGraphToolkit.MutationThrottle.execute(async () => {
                await window.roamAlphaAPI.data.block.update({
                    "block": updateObj
                });
            });
        }
    }

    // Recursión para hijos del bloque
    if (children && children.length > 0) {
        await DiscourseGraphToolkit.importChildren(blockUid, children);
    }
};


