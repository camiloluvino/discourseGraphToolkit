// ============================================================================
// CORE: Importación
// ============================================================================

// --- Controlador de Tasa de Mutación (Roam API Rate Limiter) ---
DiscourseGraphToolkit.MutationThrottle = {
    MAX_OPS_PER_WINDOW: 1400,   // Margen de seguridad sobre el límite de 1500/60s de Roam
    WINDOW_MS: 60000,           // Ventana móvil de 60 segundos
    MIN_DELAY_MS: 0,            // Yield mínimo (~4ms por setTimeout) para no congelar la UI
    callTimestamps: [],
    onProgress: null,

    reset: function (progressCallback) {
        this.callTimestamps = [];
        this.onProgress = progressCallback || null;
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    execute: async function (mutationFn) {
        const now = Date.now();
        // 1. Limpiar timestamps que salieron de la ventana móvil de 60s
        this.callTimestamps = this.callTimestamps.filter(t => (now - t) < this.WINDOW_MS);

        // 2. Si alcanzamos el umbral de seguridad, esperar a que venza el más antiguo
        while (this.callTimestamps.length >= this.MAX_OPS_PER_WINDOW) {
            const oldest = this.callTimestamps[0];
            const waitMs = (oldest + this.WINDOW_MS) - Date.now() + 25;
            if (waitMs > 0) {
                const waitSec = Math.ceil(waitMs / 1000);
                const msg = `⏳ Pausa preventiva por cuota de Roam (${this.callTimestamps.length}/1500 ops). Esperando ${waitSec}s para continuar con seguridad...`;
                console.warn(msg);
                if (this.onProgress) this.onProgress(msg);
                await this.sleep(waitMs);
                if (this.onProgress) this.onProgress(`✅ Cuota renovada. Reanudando importación...`);
            }
            const postWait = Date.now();
            this.callTimestamps = this.callTimestamps.filter(t => (postWait - t) < this.WINDOW_MS);
        }

        // 3. Ejecución segura con reintento ante error 429 / Rate Limit
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                if (this.MIN_DELAY_MS !== null && this.MIN_DELAY_MS !== undefined && this.MIN_DELAY_MS >= 0) {
                    await this.sleep(this.MIN_DELAY_MS);
                }
                const result = await mutationFn();
                this.callTimestamps.push(Date.now());
                return result;
            } catch (err) {
                const isRateLimit = err && err.message && (
                    err.message.includes("maximum mutation rate limit exceeded") ||
                    err.message.includes("rate limit")
                );

                if (isRateLimit && attempts < maxAttempts - 1) {
                    attempts++;
                    const backoffMs = 20000 * attempts;
                    const msg = `⚠️ Cuota de Roam excedida. Esperando ${backoffMs / 1000}s para reintentar (intento ${attempts}/${maxAttempts})...`;
                    console.warn(msg, err);
                    if (this.onProgress) this.onProgress(msg);
                    await this.sleep(backoffMs);
                    const retryNow = Date.now();
                    this.callTimestamps = this.callTimestamps.filter(t => (retryNow - t) < this.WINDOW_MS);
                } else {
                    throw err;
                }
            }
        }
    }
};

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };

    // Inicializar el controlador de cuota con el callback de progreso
    DiscourseGraphToolkit.MutationThrottle.reset(report);

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


