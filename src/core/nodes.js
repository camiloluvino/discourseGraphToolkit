// ============================================================================
// 3. LÓGICA DE CREACIÓN DE NODOS (CORE)
// ============================================================================

DiscourseGraphToolkit.parseTemplate = function (templateText) {
    const lines = templateText.split('\n');
    const result = [];
    const stack = [{ children: result, indent: -1 }];

    for (let line of lines) {
        const indent = line.search(/\S/);
        const text = line.trim();
        if (text === '' || indent === -1) continue;

        const level = Math.floor(indent / 4);
        const item = { text, children: [] };

        while (stack.length > 1 && stack[stack.length - 1].indent >= level) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(item);
        stack.push({ children: item.children, indent: level });
    }
    return result;
};

DiscourseGraphToolkit.createTemplateBlocks = async function (parentUid, templateItems, startOrder = 0, proyecto = "") {
    for (let i = 0; i < templateItems.length; i++) {
        let item = templateItems[i];
        let processedText = item.text.replace(/{PROYECTO}/g, proyecto);

        let blockUid = window.roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": parentUid, "order": startOrder + i },
            "block": { "uid": blockUid, "string": processedText }
        });

        if (item.children && item.children.length > 0) {
            await this.createTemplateBlocks(blockUid, item.children, 0, proyecto);
        }
    }
};

DiscourseGraphToolkit.convertBlockToNode = async function (typePrefix) {
    let pageUid = null;
    let pageWasCreated = false;
    let blockUid = null;
    let originalBlockContent = null;

    try {
        let focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock();
        if (!focusedBlock) {
            this.showToast("No hay bloque enfocado", "error");
            return;
        }
        blockUid = focusedBlock["block-uid"];
        let blockData = window.roamAlphaAPI.data.pull("[:block/string]", `[:block/uid "${blockUid}"]`);
        if (!blockData) return;

        originalBlockContent = blockData[":block/string"] || "";
        if (originalBlockContent.trim() === "") {
            this.showToast("El bloque está vacío", "error");
            return;
        }
        if (originalBlockContent.startsWith(`[[${typePrefix}]]`)) {
            this.showToast("El bloque ya fue transformado", "info");
            return;
        }

        // Configuración actual
        const config = this.getConfig();
        const proyecto = config.defaultProject;
        const templates = this.getTemplates();
        const templateText = templates[typePrefix];
        const templateItems = this.parseTemplate(templateText);

        // Crear página
        let newPageTitle = `[[${typePrefix}]] - ${originalBlockContent}`;
        let newBlockString = `[[${newPageTitle}]]`;

        // Verificar existencia
        let safeTitle = newPageTitle.replace(/"/g, '\\"');
        let existing = window.roamAlphaAPI.q(`[:find ?uid :where [?page :node/title "${safeTitle}"] [?page :block/uid ?uid]]`);

        if (existing && existing.length > 0) {
            pageUid = existing[0][0];
            this.showToast(`Nodo ${typePrefix} ya existe, vinculando...`, "info");
        } else {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": newPageTitle, "uid": pageUid }
            });
            pageWasCreated = true;
            await this.createTemplateBlocks(pageUid, templateItems, 0, proyecto);
        }

        this.addToNodeHistory(typePrefix, originalBlockContent, proyecto);

        await window.roamAlphaAPI.data.block.update({
            "block": { "uid": blockUid, "string": newBlockString }
        });

        this.showToast(`✓ Nodo ${typePrefix} creado`, "success");

        setTimeout(() => {
            window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: blockUid } });
        }, 100);

    } catch (error) {
        console.error("Error creando nodo:", error);
        this.showToast("Error: " + error.message, "error");
        // Rollback simple
        if (pageWasCreated && pageUid) {
            window.roamAlphaAPI.data.page.delete({ "page": { "uid": pageUid } });
        }
        if (blockUid && originalBlockContent) {
            window.roamAlphaAPI.data.block.update({ "block": { "uid": blockUid, "string": originalBlockContent } });
        }
    }
};

// ============================================================================
// 5. DASHBOARD HELPERS
// ============================================================================

DiscourseGraphToolkit.countNodesByProject = async function (project) {
    const counts = { QUE: 0, CLM: 0, EVD: 0 };
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    // Si no hay proyecto seleccionado, contar todo (opcional, o retornar 0)
    // Asumimos que siempre hay un proyecto o "todos"

    const projectFilter = project ? `[(clojure.string/includes? ?string "[[${project}]]")]` : "";

    for (let type of ['QUE', 'CLM', 'EVD']) {
        const prefix = this.TYPES[type].prefix;
        const query = `[:find (count ?page) . :where 
            [?page :node/title ?title] 
            [(clojure.string/starts-with? ?title "[[${prefix}]]")]
            [?block :block/page ?page]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${fieldName}::")]
            ${projectFilter}
        ]`;

        try {
            const result = await window.roamAlphaAPI.data.async.q(query);
            counts[type] = result || 0;
        } catch (e) {
            console.error(`Error counting ${type}:`, e);
        }
    }
    return counts;
};

DiscourseGraphToolkit.openQueryPage = async function (type, project) {
    const typeLabel = this.TYPES[type].label; // Pregunta, Afirmación...
    const pageTitle = `DGT/Query/${typeLabel}`;
    const prefix = this.TYPES[type].prefix;

    // 1. Buscar o Crear Página
    let pageUid = await window.roamAlphaAPI.data.async.q(`[:find ?uid . :where [?page :node/title "${pageTitle}"] [?page :block/uid ?uid]]`);

    if (!pageUid) {
        pageUid = window.roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.data.page.create({ page: { title: pageTitle, uid: pageUid } });
    }

    // 2. Construir Query
    // {{[[query]]: {and: [[QUE]] [[Proyecto]]}}}
    const queryString = `{{[[query]]: {and: [[${prefix}]] [[${project}]]}}}`;

    // 3. Limpiar/Actualizar contenido
    // Borrar hijos existentes para asegurar limpieza
    const children = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid]]`);
    if (children) {
        for (let child of children) {
            await window.roamAlphaAPI.data.block.delete({ block: { uid: child[0] } });
        }
    }

    // Crear nuevo bloque con la query
    const blockUid = window.roamAlphaAPI.util.generateUID();
    await window.roamAlphaAPI.data.block.create({
        location: { "parent-uid": pageUid, "order": 0 },
        block: { "uid": blockUid, "string": queryString }
    });

    // 4. Abrir página
    window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: pageUid } });
};
