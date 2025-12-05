/**
 * DISCOURSE GRAPH TOOLKIT v1.1.10
 * Bundled build: 2025-12-05 19:04:23
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "1.1.10";

// --- MODULE: src/config.js ---
// ============================================================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ============================================================================

window.DiscourseGraphToolkit = window.DiscourseGraphToolkit || {};
// DiscourseGraphToolkit.VERSION = "1.1.1"; // Managed by build script

// Claves de LocalStorage
DiscourseGraphToolkit.STORAGE = {
    CONFIG: "discourseGraphToolkit_config",
    TEMPLATES: "discourseGraphToolkit_templates",
    PROJECTS: "discourseGraphToolkit_projects",
    HISTORY_NODES: "discourseGraphToolkit_history_nodes",
    HISTORY_EXPORT: "discourseGraphToolkit_history_export"
};

// Constantes de Roam
DiscourseGraphToolkit.ROAM = {
    PROJECTS_PAGE: "roam/js/discourse-graph/projects",
    CONFIG_PAGE: "roam/js/discourse-graph/config"
};

// Configuración de Archivos y Exportación
DiscourseGraphToolkit.FILES = {
    BYTES_PER_MB: 1024 * 1024,
    MAX_SIZE_MB: 10,
    MAX_DEPTH: 10
};

// Tipos de Nodos
DiscourseGraphToolkit.TYPES = {
    QUE: { prefix: "QUE", label: "Pregunta", color: "#2196F3" },
    CLM: { prefix: "CLM", label: "Afirmación", color: "#4CAF50" },
    EVD: { prefix: "EVD", label: "Evidencia", color: "#FF9800" }
};

// Configuración por defecto
DiscourseGraphToolkit.DEFAULT_CONFIG = {
    defaultProject: "",
    projectFieldName: "Proyecto Asociado"
};

// Pull pattern para exportación robusta (Recursión manual limitada a MAX_DEPTH)
DiscourseGraphToolkit.ROAM_PULL_PATTERN = `[
    :block/uid :node/title :edit/time :create/time :block/string :block/order
    {:block/refs [:block/uid :node/title]}
    {:create/user [:user/display-name :user/uid]}
    {:edit/user [:user/display-name :user/uid]}
    {:block/children [
      :block/uid :block/string :block/order :edit/time :create/time
      {:block/refs [:block/uid :node/title]}
      {:block/children [
        :block/uid :block/string :block/order
        {:block/refs [:block/uid :node/title]}
        {:block/children [
          :block/uid :block/string :block/order
          {:block/refs [:block/uid :node/title]}
          {:block/children [
            :block/uid :block/string :block/order
            {:block/refs [:block/uid :node/title]}
            {:block/children [
               :block/uid :block/string :block/order
               {:block/refs [:block/uid :node/title]}
               {:block/children [
                   :block/uid :block/string :block/order
                   {:block/refs [:block/uid :node/title]}
                   {:block/children [
                       :block/uid :block/string :block/order
                       {:block/refs [:block/uid :node/title]}
                       {:block/children [
                           :block/uid :block/string :block/order
                           {:block/refs [:block/uid :node/title]}
                           {:block/children [
                               :block/uid :block/string :block/order
                               {:block/refs [:block/uid :node/title]}
                           ]}
                       ]}
                   ]}
               ]}
            ]}
          ]}
        ]}
      ]}
    ]}
  ]`;

// Templates por defecto (usando el nombre de campo dinámico en la lógica, aquí es texto)
DiscourseGraphToolkit.DEFAULT_TEMPLATES = {
    "QUE": `Proyecto Asociado:: {PROYECTO}
#RespondedBy
    -`,
    "CLM": `Proyecto Asociado:: {PROYECTO}
#SupportedBy
    -`,
    "EVD": `Proyecto Asociado:: {PROYECTO}`
};




// --- MODULE: src/utils/helpers.js ---
// ============================================================================
// UTILS: Helpers
// ============================================================================

DiscourseGraphToolkit.sanitizeFilename = function (name) {
    if (!name || typeof name !== 'string') return 'export';
    return name
        .replace(/\.\./g, '').replace(/\.\//g, '').replace(/\\/g, '') // Path traversal
        .replace(/[\/\\]/g, '-') // Separadores
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Control chars
        .replace(/[<>:"|?*]/g, '') // Invalid chars
        .replace(/\s+/g, '_')
        .trim().toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 50) || 'export';
};

DiscourseGraphToolkit.downloadJSON = function (data, filename) {
    let jsonStr;
    try {
        jsonStr = JSON.stringify(data, null, 2);
    } catch (e) {
        console.warn("JSON muy grande para format, intentando minificado...");
        try { jsonStr = JSON.stringify(data); }
        catch (e2) { throw new Error("Archivo demasiado grande para exportar."); }
    }

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

DiscourseGraphToolkit.countBlocks = function (pageData) {
    if (!pageData) return 0;
    let count = 1;
    const children = pageData[':block/children'] || pageData['children'];
    if (children && Array.isArray(children)) {
        for (const child of children) count += this.countBlocks(child);
    }
    return count;
};

DiscourseGraphToolkit.convertTimestamp = function (timestamp) {
    return timestamp || Date.now();
};

DiscourseGraphToolkit.cleanText = function (text) {
    if (!text || typeof text !== 'string') return "";
    // Eliminar marcadores de Roam Research
    text = text.replace(/\[\[/g, "").replace(/\]\]/g, "");
    // Eliminar marcadores de formato Markdown
    text = text.replace(/\*\*/g, "");
    return text.trim();
};

DiscourseGraphToolkit.downloadFile = function (filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

DiscourseGraphToolkit.getNodeType = function (title) {
    if (!title) return null;
    if (title.includes('[[QUE]]')) return 'QUE';
    if (title.includes('[[CLM]]')) return 'CLM';
    if (title.includes('[[EVD]]')) return 'EVD';
    return null;
};




// --- MODULE: src/utils/toast.js ---
// ============================================================================
// UTILS: Toast Notifications
// ============================================================================

DiscourseGraphToolkit.showToast = function (message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;
        `;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);
    setTimeout(() => {
        toastContainer.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toastContainer), 300);
    }, 3000);
};




// --- MODULE: src/state.js ---
// ============================================================================
// 2. GESTIÓN DE ALMACENAMIENTO (STORAGE)
// ============================================================================

// --- Configuración General ---
DiscourseGraphToolkit.getConfig = function () {
    const stored = localStorage.getItem(this.STORAGE.CONFIG);
    if (stored) {
        try {
            return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch (e) { console.error("Error parsing config", e); }
    }
    return { ...this.DEFAULT_CONFIG };
};

DiscourseGraphToolkit.saveConfig = function (config) {
    localStorage.setItem(this.STORAGE.CONFIG, JSON.stringify(config));
};

// --- Templates ---
DiscourseGraphToolkit.getTemplates = function () {
    const stored = localStorage.getItem(this.STORAGE.TEMPLATES);
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { }
    }
    return { ...this.DEFAULT_TEMPLATES };
};

DiscourseGraphToolkit.saveTemplates = function (templates) {
    localStorage.setItem(this.STORAGE.TEMPLATES, JSON.stringify(templates));
};

// --- Persistencia en Roam (Config + Templates) ---
DiscourseGraphToolkit.saveConfigToRoam = async function (config, templates) {
    try {
        let pageUid = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${this.ROAM.CONFIG_PAGE}"] [?page :block/uid ?uid]]`);
        if (!pageUid || pageUid.length === 0) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.CONFIG_PAGE, uid: pageUid } });
        } else {
            pageUid = pageUid[0][0];
        }

        // Guardar como un bloque JSON
        const data = JSON.stringify({ config, templates });
        const blockUid = window.roamAlphaAPI.util.generateUID();

        // Limpiar hijos anteriores
        const children = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid]]`);
        for (let child of children) {
            await window.roamAlphaAPI.data.block.delete({ block: { uid: child[0] } });
        }

        await window.roamAlphaAPI.data.block.create({
            location: { "parent-uid": pageUid, order: 0 },
            block: { string: data }
        });
        console.log("Configuración guardada en Roam.");
        return true;
    } catch (e) {
        console.error("Error guardando config en Roam:", e);
        return false;
    }
};

DiscourseGraphToolkit.loadConfigFromRoam = async function () {
    try {
        const results = await window.roamAlphaAPI.data.async.q(`[:find ?string :where [?page :node/title "${this.ROAM.CONFIG_PAGE}"] [?child :block/parents ?page] [?child :block/string ?string]]`);
        if (results && results.length > 0) {
            const data = JSON.parse(results[0][0]);
            if (data.config) this.saveConfig(data.config);
            if (data.templates) this.saveTemplates(data.templates);
            return data;
        }
    } catch (e) {
        console.error("Error cargando config de Roam:", e);
    }
    return null;
};

// --- Proyectos (Gestión Robusta con Sincronización) ---
DiscourseGraphToolkit.getProjects = function () {
    const stored = localStorage.getItem(this.STORAGE.PROJECTS);
    return stored ? JSON.parse(stored) : [];
};

DiscourseGraphToolkit.saveProjects = function (projects) {
    localStorage.setItem(this.STORAGE.PROJECTS, JSON.stringify(projects));
};

// --- Historial de Nodos ---
DiscourseGraphToolkit.getNodeHistory = function () {
    const stored = localStorage.getItem(this.STORAGE.HISTORY_NODES);
    return stored ? JSON.parse(stored) : [];
};

DiscourseGraphToolkit.addToNodeHistory = function (type, title, project) {
    let history = this.getNodeHistory();
    history.unshift({
        type, title, project,
        timestamp: new Date().toISOString(),
        pageTitle: `[[${type}]] - ${title}`
    });
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(this.STORAGE.HISTORY_NODES, JSON.stringify(history));
};

// --- Historial de Exportación ---
DiscourseGraphToolkit.getExportHistory = function () {
    const stored = localStorage.getItem(this.STORAGE.HISTORY_EXPORT);
    return stored ? JSON.parse(stored) : [];
};

DiscourseGraphToolkit.addToExportHistory = function (entry) {
    let history = this.getExportHistory();
    history.unshift(entry);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem(this.STORAGE.HISTORY_EXPORT, JSON.stringify(history));
};

// --- Backup & Restore Config ---
DiscourseGraphToolkit.exportConfig = function () {
    const config = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        config: this.getConfig(),
        templates: this.getTemplates(),
        projects: this.getProjects()
    };
    this.downloadJSON(config, `discourse-toolkit-config-${new Date().toISOString().split('T')[0]}.json`);
};

DiscourseGraphToolkit.importConfig = function (fileContent) {
    try {
        const data = JSON.parse(fileContent);
        if (data.config) this.saveConfig(data.config);
        if (data.templates) this.saveTemplates(data.templates);
        if (data.projects) {
            this.saveProjects(data.projects);
            this.syncProjectsToRoam(data.projects);
        }
        return true;
    } catch (e) {
        console.error("Error importing config:", e);
        return false;
    }
};




// --- MODULE: src/api/roam.js ---
// ============================================================================
// API: Roam Interactions
// ============================================================================

DiscourseGraphToolkit.findProjectsPage = async function () {
    const results = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${this.ROAM.PROJECTS_PAGE}"] [?page :block/uid ?uid]]`);
    return (results && results.length > 0) ? results[0][0] : null;
};

DiscourseGraphToolkit.loadProjectsFromRoam = async function () {
    const pageUid = await this.findProjectsPage();
    if (!pageUid) return [];
    const query = `[:find ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/string ?string] [?child :block/order ?order] :order (asc ?order)]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => r[0].trim()).filter(p => p !== '');
};

DiscourseGraphToolkit.syncProjectsToRoam = async function (projects) {
    try {
        let pageUid = await this.findProjectsPage();
        if (!pageUid) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.PROJECTS_PAGE, uid: pageUid } });
        }

        const existingQuery = `[:find ?uid ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid] [?child :block/string ?string]]`;
        const existingResults = await window.roamAlphaAPI.data.async.q(existingQuery);
        const existingBlocks = new Map(existingResults.map(r => [r[1].trim(), r[0]]));

        // Eliminar obsoletos
        for (const [blockText, blockUid] of existingBlocks.entries()) {
            if (!projects.includes(blockText)) await window.roamAlphaAPI.data.block.delete({ block: { uid: blockUid } });
        }

        // Agregar nuevos
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            if (!existingBlocks.has(project)) {
                await window.roamAlphaAPI.data.block.create({ location: { 'parent-uid': pageUid, order: i }, block: { string: project } });
            }
        }
        return { success: true };
    } catch (e) {
        console.error("Error syncing projects:", e);
        return { success: false, error: e.message };
    }
};

DiscourseGraphToolkit.initializeProjectsSync = async function (retry = 0) {
    if (!window.roamAlphaAPI) return;

    try {
        const local = this.getProjects();
        let roam = await this.loadProjectsFromRoam();

        // RETRY LOGIC: Si Roam devuelve vacío, puede ser por carga lenta. Reintentar.
        if (roam.length === 0 && retry < 5) {
            console.log(`Roam projects empty, retrying sync... (${retry + 1}/5)`);
            await new Promise(r => setTimeout(r, 1000));
            return this.initializeProjectsSync(retry + 1);
        }

        // Si Roam falla (devuelve vacío pero no debería), no sobrescribimos local si local tiene datos
        if (roam.length === 0 && local.length > 0) {
            // Intentar verificar si la página existe
            const pageUid = await this.findProjectsPage();
            if (pageUid) {
                // La página existe pero está vacía, o la query falló. 
                // Asumimos que debemos sincronizar local -> roam
                console.log("Roam projects empty, syncing local to roam.");
            }
        }

        const merged = [...new Set([...local, ...roam])].sort();

        if (merged.length > 0) {
            this.saveProjects(merged);
            await this.syncProjectsToRoam(merged);
            console.log(`Proyectos sincronizados: ${merged.length}`);
        }
    } catch (e) {
        console.error("Error initializing projects sync:", e);
        if (retry < 3) {
            setTimeout(() => this.initializeProjectsSync(retry + 1), 2000);
        }
    }
};

DiscourseGraphToolkit.validateProjectsInGraph = async function (projectNames) {
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "Proyecto Asociado::")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    const inGraph = new Set();
    results.forEach(r => {
        const match = r[0].match(/Proyecto Asociado::\s*\[\[([^\]]+)\]\]/);
        if (match) inGraph.add(match[1].trim());
    });

    const validation = {};
    projectNames.forEach(name => validation[name] = inGraph.has(name));
    return validation;
};

DiscourseGraphToolkit.discoverProjectsInGraph = async function () {
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    // Query para encontrar todos los bloques con la propiedad de proyecto
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${fieldName}::")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);

    const discovered = new Set();
    const regex = new RegExp(`${fieldName}::\\s*\\[\\[([^\\]]+)\\]\\]`);

    results.forEach(r => {
        const match = r[0].match(regex);
        if (match && match[1]) {
            discovered.add(match[1].trim());
        }
    });

    return Array.from(discovered).sort();
};

// --- Lógica de Búsqueda ---
DiscourseGraphToolkit.findPagesWithProject = async function (projectName) {
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";
    const trimmedProject = projectName.trim();

    const query = `[
            :find ?page-title ?page-uid
            :where
            [?page :node/title ?page-title]
            [?page :block/uid ?page-uid]
            [?block :block/page ?page]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${fieldName}::")]
            [(clojure.string/includes? ?string "[[${trimmedProject}]]")]
        ]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};

DiscourseGraphToolkit.queryDiscoursePages = async function (projectName, selectedTypes) {
    const pages = await this.findPagesWithProject(projectName);
    const prefixes = selectedTypes.map(t => `[[${t}]]`);
    return pages.filter(p => prefixes.some(prefix => p.pageTitle.startsWith(prefix)));
};

DiscourseGraphToolkit.findReferencedDiscoursePages = async function (pageUids, selectedTypes) {
    if (!pageUids || pageUids.length === 0) return [];

    const prefixes = selectedTypes.map(t => this.TYPES[t].prefix); // "QUE", "CLM"
    const query = `[:find ?string :in $ [?page-uid ...] :where [?page :block/uid ?page-uid] [?block :block/page ?page] [?block :block/string ?string]]`;

    const results = await window.roamAlphaAPI.data.async.q(query, pageUids);
    const referencedTitles = new Set();

    results.forEach(r => {
        const str = r[0];
        prefixes.forEach(prefix => {
            const target = `[[[[${prefix}]]`; // Busca [[[[QUE]]
            if (str.includes(target)) {
                // Extracción simple de brackets balanceados (simplificada)
                const regex = new RegExp(`\\[\\[\\[\\[${prefix}\\]\\] - (.*?)\\]\\]`, 'g');
                let match;
                while ((match = regex.exec(str)) !== null) {
                    referencedTitles.add(`[[${prefix}]] - ${match[1]}`);
                }
            }
        });
    });

    if (referencedTitles.size === 0) return [];

    const titleArray = Array.from(referencedTitles);
    const pageQuery = `[:find ?title ?uid :in $ [?title ...] :where [?page :node/title ?title] [?page :block/uid ?uid]]`;
    const pageResults = await window.roamAlphaAPI.data.async.q(pageQuery, titleArray);

    return pageResults.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};




// --- MODULE: src/core/nodes.js ---
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




// --- MODULE: src/core/projects.js ---
// This file is intentionally left empty as project logic is handled in api/roam.js and state.js
// It is kept for future expansion of core project business logic if needed.




// --- MODULE: src/core/export.js ---
// ============================================================================
// 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
// ============================================================================

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
        transformed['children'] = pullData[':block/children'].map(child =>
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




// --- MODULE: src/core/import.js ---
// ============================================================================
// 6. LÓGICA DE IMPORTACIÓN (CORE)
// ============================================================================

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    console.log("🚀 STARTING IMPORT - VERSION 1.1.1 (FIXED)");
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };

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
            await DiscourseGraphToolkit.importPage({ ...pageData, title, uid, children });
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
        await DiscourseGraphToolkit.logImportToDailyNote(importedTitles);
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
        await window.roamAlphaAPI.data.page.create({ "page": { "title": dailyNoteTitle, "uid": dailyNoteUid } });
    }

    // 2. Crear bloque padre #import
    const importBlockUid = window.roamAlphaAPI.util.generateUID();
    const timestamp = today.toLocaleTimeString();
    await window.roamAlphaAPI.data.block.create({
        "location": { "parent-uid": dailyNoteUid, "order": "last" },
        "block": { "uid": importBlockUid, "string": `#import (${timestamp})` }
    });

    // 3. Crear hijos con los títulos
    for (let i = 0; i < importedTitles.length; i++) {
        const title = importedTitles[i];
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": importBlockUid, "order": i },
            "block": { "string": `[[${title}]]` }
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

        try {
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": pageData.title, "uid": pageUid }
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
        await DiscourseGraphToolkit.importChildren(pageUid, pageData.children);
    }
};

DiscourseGraphToolkit.importChildren = async function (parentUid, children) {
    // Ordenar por 'order' si existe, para mantener la estructura
    const sortedChildren = children.sort((a, b) => (a.order || 0) - (b.order || 0));

    for (let i = 0; i < sortedChildren.length; i++) {
        const child = sortedChildren[i];
        await DiscourseGraphToolkit.importBlock(parentUid, child, i);
    }
};

DiscourseGraphToolkit.importBlock = async function (parentUid, blockData, order) {
    // Normalizar claves de bloque
    const blockUid = blockData.uid || blockData[':block/uid'] || blockData[':uid'] || window.roamAlphaAPI.util.generateUID();
    const content = blockData.string || blockData[':block/string'] || blockData[':string'] || "";
    const children = blockData.children || blockData[':block/children'] || blockData['children'];

    // Verificar si el bloque ya existe (por UID) usando PULL
    let exists = false;
    if (blockData.uid || blockData[':block/uid']) {
        const check = window.roamAlphaAPI.data.pull("[:block/uid]", [":block/uid", blockUid]);
        exists = (check && check[':block/uid']);
    }

    if (!exists) {
        // Crear bloque
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": parentUid, "order": order },
            "block": { "uid": blockUid, "string": content }
        });
    } else {
        // El bloque existe.
        // ESTRATEGIA: NO SOBRESCRIBIR contenido.
    }

    // Recursión para hijos del bloque
    if (children && children.length > 0) {
        await DiscourseGraphToolkit.importChildren(blockUid, children);
    }
};




// --- MODULE: src/core/contentProcessor.js ---
// ============================================================================
// CORE: Content Processor
// Ported from roamMap/core/content_processor.py
// ============================================================================

DiscourseGraphToolkit.ContentProcessor = {
    MAX_RECURSION_DEPTH: 20,

    extractBlockContent: function (block, indentLevel = 0, skipMetadata = true, visitedBlocks = null, maxDepth = this.MAX_RECURSION_DEPTH, excludeBitacora = true) {
        let content = "";

        if (!visitedBlocks) visitedBlocks = new Set();

        if (indentLevel > maxDepth) {
            console.warn(`⚠ Profundidad máxima alcanzada (${maxDepth}), deteniendo recursión`);
            return content;
        }

        try {
            if (!block || typeof block !== 'object') return content;

            const blockUid = block.uid || block[':block/uid'] || "";
            const blockString = block.string || block[':block/string'] || "";

            // Identificador simple para JS (UID es suficiente en Roam)
            const blockIdentifier = blockUid;

            if (blockIdentifier && visitedBlocks.has(blockIdentifier)) {
                // console.warn(`⚠ Ciclo detectado en bloque: ${blockString.substring(0, 30)}..., saltando`);
                return content;
            }

            if (blockIdentifier) visitedBlocks.add(blockIdentifier);

            // Excluir bloque de bitácora y sus hijos SI la opción está activada
            if (excludeBitacora && blockString.toLowerCase().includes('[[bitácora]]')) {
                return "";
            }

            // Lógica de metadatos
            const structuralMarkers = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
            const isStructural = structuralMarkers.includes(blockString);

            if (skipMetadata && (!blockString || isStructural)) {
                // Pass
            } else {
                if (blockString) {
                    const indent = "  ".repeat(indentLevel);
                    content += `${indent}- ${blockString}\n`;
                }
            }

            const children = block.children || block[':block/children'] || [];
            if (Array.isArray(children)) {
                for (const child of children) {
                    const childContent = this.extractBlockContent(child, indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora);
                    if (childContent) content += childContent;
                }
            }

            if (blockIdentifier) visitedBlocks.delete(blockIdentifier);

        } catch (e) {
            console.warn(`⚠ Error extrayendo contenido de bloque: ${e}`);
        }

        return content;
    },

    extractNodeContent: function (nodeData, extractAdditionalContent = false, nodeType = "EVD", excludeBitacora = true) {
        let detailedContent = "";

        try {
            if (!nodeData) return detailedContent;

            const children = nodeData.children || nodeData[':block/children'] || [];
            if (Array.isArray(children) && children.length > 0) {
                for (const child of children) {
                    const childString = child.string || child[':block/string'] || "";
                    const structuralMetadata = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
                    const isStructuralMetadata = structuralMetadata.some(meta => childString.startsWith(meta));

                    // Si extractAdditionalContent es true, extraemos TODO (salvo bitácora si aplica),
                    // ignorando si es un marcador estructural o no. El usuario quiere "Todo el contenido".
                    if (extractAdditionalContent) {
                        const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                        if (childContent) detailedContent += childContent;
                    }
                    // Si es false, aplicamos la lógica de filtrado inteligente
                    else {
                        if (!isStructuralMetadata && childString) {
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                            if (childContent) detailedContent += childContent;
                        } else if (childString === "#RelatedTo" && (child.children || child[':block/children'])) {
                            // Logic especial para #RelatedTo: Extraer hijos directamente (container transparente)
                            const subChildren = child.children || child[':block/children'] || [];
                            for (const subChild of subChildren) {
                                const subChildContent = this.extractBlockContent(subChild, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                                if (subChildContent) detailedContent += subChildContent;
                            }
                        }
                    }
                }
            }

            if (!detailedContent) {
                // Fallback: contenido directo o título
                const mainString = nodeData.string || nodeData[':block/string'] || "";
                if (mainString) {
                    detailedContent += `- ${mainString}\n`;
                } else {
                    const title = nodeData.title || nodeData[':node/title'] || "";
                    if (title) {
                        const prefix = `[[${nodeType}]] - `;
                        const cleanTitle = title.replace(prefix, "").trim();
                        if (cleanTitle) detailedContent += `- ${cleanTitle}\n`;
                    }
                }
            }

        } catch (e) {
            console.error(`❌ Error extrayendo contenido ${nodeType}: ${e}`);
        }

        return detailedContent;
    }
};




// --- MODULE: src/core/relationshipMapper.js ---
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




// --- MODULE: src/core/htmlGenerator.js ---
// ============================================================================
// CORE: HTML Generator
// Ported from roamMap/core/html_generator.py
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {
    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", extractAdditionalContent = false, excludeBitacora = true) {
        const css = this._getCSS();
        const js = this._getJS();

        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${css}
</head>
<body>
    <h1>${title}</h1>
    
    <div class="controls">
        <button id="expandAll" class="btn">Expandir Todo</button>
        <button id="collapseAll" class="btn">Contraer Todo</button>
        <button id="copyAll" class="btn btn-copy">Copiar Texto</button>
        <button id="exportMarkdown" class="btn btn-export">Exportar Markdown</button>
    </div>
`;

        for (let i = 0; i < questions.length; i++) {
            try {
                const question = questions[i];
                const qId = `q${i}`;
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));

                html += `<div id="${qId}" class="node que-node">`;
                html += `<h2 class="collapsible">`;
                html += `<span class="node-tag">[[QUE]]</span> - ${qTitle}`;
                html += `<button class="btn-copy-individual" onclick="copyIndividualQuestion('${qId}')">Copiar</button>`;
                html += `<button class="btn-reorder btn-reorder-up" onclick="moveQuestionUp('${qId}')" title="Mover hacia arriba">↑</button>`;
                html += `<button class="btn-reorder btn-reorder-down" onclick="moveQuestionDown('${qId}')" title="Mover hacia abajo">↓</button>`;
                html += `</h2>`;
                html += `<div class="content">`;

                // Metadata
                const metadata = question.project_metadata || {};
                html += this._generateMetadataHtml(metadata);

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
                    html += '</div></div>';
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (let j = 0; j < question.related_clms.length; j++) {
                        const clmUid = question.related_clms[j];
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmId = `q${i}_c${j}`;
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));

                            html += `<div id="${clmId}" class="node clm-node">`;
                            html += `<h3 class="collapsible">`;
                            html += `<span class="node-tag">[[CLM]]</span> - ${clmTitle}`;
                            html += `<button class="btn-copy-individual" onclick="copyIndividualCLM('${clmId}')">Copiar</button>`;
                            html += `</h3>`;
                            html += `<div class="content">`;

                            html += this._generateMetadataHtml(clm.project_metadata || {});

                            // --- NUEVO: Contenido del CLM ---
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, extractAdditionalContent, "CLM", excludeBitacora);
                            if (clmContent) {
                                html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                                html += `<p>${this._formatContentForHtml(clmContent)}</p>`;
                                html += `</div>`;
                            }
                            // --------------------------------

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                html += '<div class="supporting-clms">';
                                html += '<div class="connected-clm-title" style="color: #005a9e;"><strong>CLMs de soporte (SupportedBy):</strong></div>';

                                for (let suppIdx = 0; suppIdx < clm.supporting_clms.length; suppIdx++) {
                                    const suppUid = clm.supporting_clms[suppIdx];
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));

                                        html += `<div class="supporting-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${suppTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(suppClm.project_metadata || {}, true);

                                        // --- NUEVO: Contenido CLM Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, extractAdditionalContent, "CLM", excludeBitacora);
                                        if (suppContent) {
                                            html += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px; color: #333;">`;
                                            html += `<p>${this._formatContentForHtml(suppContent)}</p>`;
                                            html += `</div>`;
                                        }
                                        // ------------------------------------

                                        // Evidencias de soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            html += '<div style="margin-left: 15px;"><strong>Evidencias:</strong></div>';
                                            for (const evdUid of suppClm.related_evds) {
                                                if (allNodes[evdUid]) {
                                                    const evd = allNodes[evdUid];
                                                    const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                                    html += `<div class="node" style="margin-left: 20px; border-left: 1px solid #e0e0e0;">`;
                                                    html += `<h6 class="collapsible" style="font-size: 11px; margin: 8px 0 4px 0;"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h6>`;
                                                    html += `<div class="content">`;
                                                    const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, extractAdditionalContent, "EVD", excludeBitacora);
                                                    if (detailedContent) {
                                                        html += '<div style="margin-left: 15px; font-size: 11px; color: #555;">';
                                                        html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                                        html += '</div>';
                                                    }
                                                    html += `</div></div>`;
                                                }
                                            }
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                                html += '</div>';
                            }

                            // Connected CLMs
                            if (clm.connected_clms && clm.connected_clms.length > 0) {
                                html += '<div class="connected-clms">';
                                html += '<div class="connected-clm-title"><strong>CLMs relacionados:</strong></div>';
                                for (const connUid of clm.connected_clms) {
                                    if (allNodes[connUid] && connUid !== clmUid) {
                                        const connClm = allNodes[connUid];
                                        const connTitle = DiscourseGraphToolkit.cleanText(connClm.title.replace("[[CLM]] - ", ""));
                                        html += `<div class="connected-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${connTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(connClm.project_metadata || {}, true);

                                        // --- NUEVO: Contenido CLM Relacionado ---
                                        const connContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(connClm.data, extractAdditionalContent, "CLM", excludeBitacora);
                                        if (connContent) {
                                            html += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px; color: #333;">`;
                                            html += `<p>${this._formatContentForHtml(connContent)}</p>`;
                                            html += `</div>`;
                                        }
                                        // ------------------------------------
                                        html += `</div></div>`;
                                    }
                                }
                                html += '</div>';
                            }

                            // EVDs
                            if (clm.related_evds && clm.related_evds.length > 0) {
                                html += '<div style="margin-top: 15px;"><strong>Evidencias que respaldan esta afirmación:</strong></div>';
                                for (let k = 0; k < clm.related_evds.length; k++) {
                                    const evdUid = clm.related_evds[k];
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdId = `q${i}_c${j}_e${k}`;
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                                        html += `<div id="${evdId}" class="node evd-node">`;
                                        html += `<h4 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h4>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(evd.project_metadata || {});

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, extractAdditionalContent, "EVD", excludeBitacora);
                                        if (detailedContent) {
                                            html += '<div class="node content-node">';
                                            html += '<p><strong>Contenido detallado:</strong></p>';
                                            html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                            html += '</div>';
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                            } else if ((!clm.connected_clms || clm.connected_clms.length === 0) && (!clm.supporting_clms || clm.supporting_clms.length === 0)) {
                                html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
                            }

                            html += `</div></div>`;
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (let j = 0; j < question.direct_evds.length; j++) {
                        const evdUid = question.direct_evds[j];
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdId = `q${i}_de${j}`;
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                            html += `<div id="${evdId}" class="node direct-evd-node">`;
                            html += `<h3 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h3>`;
                            html += `<div class="content">`;
                            html += this._generateMetadataHtml(evd.project_metadata || {});

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, extractAdditionalContent, "EVD", excludeBitacora);
                            if (detailedContent) {
                                html += '<div class="node direct-content-node">';
                                html += '<p><strong>Contenido detallado:</strong></p>';
                                html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                html += '</div>';
                            }
                            html += `</div></div>`;
                        }
                    }
                }

                html += `</div></div>`;

            } catch (e) {
                console.error(`Error procesando pregunta ${i}: ${e}`);
                html += `<div class="error-message">Error procesando pregunta: ${e}</div>`;
            }
        }

        html += `
    ${js}
</body>
</html>`;
        return html;
    },

    _generateMetadataHtml: function (metadata, small = false) {
        if (!metadata || Object.keys(metadata).length === 0) return "";

        const proyecto = metadata.proyecto_asociado;
        const seccion = metadata.seccion_tesis;

        if (!proyecto && !seccion) return "";

        let html = '<div class="project-metadata"';
        if (small) html += ' style="font-size: 10px; padding: 6px 8px; margin: 6px 0 8px 0;"';
        html += '>';

        if (proyecto) html += `<div class="metadata-item"><span class="metadata-label">Proyecto Asociado:</span><span class="metadata-value">${proyecto}</span></div>`;
        if (seccion) html += `<div class="metadata-item"><span class="metadata-label">Sección Narrativa:</span><span class="metadata-value">${seccion}</span></div>`;

        html += '</div>';
        return html;
    },

    _formatContentForHtml: function (content) {
        if (!content) return "";
        // Simple escape and newline to br
        return content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    },

    _getCSS: function () {
        return `
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        h1 { font-size: 24px; font-weight: 300; margin: 0 0 30px 0; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; }
        h2 { font-size: 16px; font-weight: 500; margin: 20px 0 10px 0; position: relative; }
        h3 { font-size: 14px; font-weight: 500; margin: 15px 0 8px 0; }
        h4 { font-size: 13px; font-weight: 500; margin: 12px 0 6px 0; }
        h5 { font-size: 12px; font-weight: 500; margin: 10px 0 5px 0; color: #555; }
        h6 { font-size: 11px; font-weight: 500; margin: 8px 0 4px 0; color: #666; }
        .node { margin-bottom: 8px; padding-left: 12px; }
        .que-node { border-left: 2px solid #000; margin-bottom: 15px; }
        .clm-node { margin-left: 20px; border-left: 1px solid #d0d0d0; }
        .evd-node { margin-left: 40px; border-left: 1px solid #e0e0e0; }
        .direct-evd-node { margin-left: 20px; border-left: 1px solid #c8c8c8; background-color: #fafafa; border-radius: 3px; padding: 8px 12px; }
        .content-node, .direct-content-node { margin-left: 60px; border-left: 1px solid #f0f0f0; font-size: 12px; color: #4a4a4a; }
        .project-metadata { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 11px; color: #6c757d; }
        .connected-clms { margin-left: 40px; background-color: #f9f9f9; border-left: 2px solid #b0b0b0; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .supporting-clms { margin-left: 40px; background-color: #f0f7ff; border-left: 2px solid #007acc; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .connected-clm-item, .supporting-clm-item { margin-left: 10px; border-left: 1px solid #d8d8d8; padding: 6px 8px; margin-bottom: 8px; background-color: #fff; border-radius: 2px; }
        .collapsible { cursor: pointer; position: relative; padding-right: 25px; user-select: none; }
        .collapsible::after { content: '+'; position: absolute; right: 8px; top: 0; font-size: 14px; color: #888; }
        .active::after { content: '−'; }
        .content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; padding-right: 15px; }
        .show-content { max-height: none; overflow: visible; }
        .controls { position: sticky; top: 10px; background: rgba(255,255,255,0.95); padding: 12px 0; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; z-index: 100; }
        .btn { background: #fff; border: 1px solid #e0e0e0; padding: 6px 12px; margin-right: 8px; cursor: pointer; border-radius: 4px; }
        .btn:hover { background-color: #f8f8f8; }
        .btn-copy { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
        .btn-export { background: #007acc; color: #fff; border-color: #007acc; }
        .btn-copy-individual, .btn-reorder { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 2px 6px; margin-left: 8px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .node-tag { font-weight: 600; font-family: monospace; font-size: 11px; }
        .error-message { color: #777; font-style: italic; background-color: #f8f8f8; padding: 8px; }
        .copy-success { position: fixed; top: 20px; right: 20px; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; }
        .copy-success.show { opacity: 1; }
    </style>`;
    },

    _getJS: function () {
        return `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var coll = document.getElementsByClassName("collapsible");
            for (var i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function(e) {
                    if (e.target.tagName === 'BUTTON') return;
                    this.classList.toggle("active");
                    var content = this.nextElementSibling;
                    if (content.classList.contains("show-content")) {
                        content.classList.remove("show-content");
                        content.style.maxHeight = "0";
                    } else {
                        content.classList.add("show-content");
                        content.style.maxHeight = content.scrollHeight + "px";
                        setTimeout(function() { if (content.classList.contains("show-content")) content.style.maxHeight = "none"; }, 300);
                    }
                });
            }
            
            document.getElementById('expandAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.add('show-content'); c.style.maxHeight = "none"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.add('active'); });
            });
            
            document.getElementById('collapseAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.remove('show-content'); c.style.maxHeight = "0"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.remove('active'); });
            });

            document.getElementById('copyAll').addEventListener('click', function() {
                var text = document.body.innerText; // Simplificado para este ejemplo
                copyToClipboard(text);
            });
        });

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                showCopySuccess();
            }, function(err) {
                console.error('Async: Could not copy text: ', err);
            });
        }

        function showCopySuccess(msg) {
            var div = document.createElement('div');
            div.className = 'copy-success show';
            div.textContent = msg || 'Copiado!';
            document.body.appendChild(div);
            setTimeout(function() { document.body.removeChild(div); }, 2000);
        }
        
        function copyIndividualQuestion(id) { copyToClipboard(document.getElementById(id).innerText); }
        function copyIndividualCLM(id) { copyToClipboard(document.getElementById(id).innerText); }
        function moveQuestionUp(id) { 
            var el = document.getElementById(id);
            if (el.previousElementSibling && el.previousElementSibling.classList.contains('que-node')) 
                el.parentNode.insertBefore(el, el.previousElementSibling);
        }
        function moveQuestionDown(id) {
            var el = document.getElementById(id);
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('que-node'))
                el.parentNode.insertBefore(el.nextElementSibling, el);
        }
    </script>`;
    }
};




// --- MODULE: src/core/markdownGenerator.js ---
// ============================================================================
// CORE: Markdown Generator
// Ported from roamMap/core/markdown_generator.py
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, extractAdditionalContent = false, excludeBitacora = true) {
        let result = "# Estructura de Investigación\n\n";

        for (const question of questions) {
            try {
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));
                result += `## [[QUE]] - ${qTitle}\n\n`;

                // Metadata
                const metadata = question.project_metadata || {};
                if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                    result += "**Información del proyecto:**\n";
                    if (metadata.proyecto_asociado) result += `- Proyecto Asociado: ${metadata.proyecto_asociado}\n`;
                    if (metadata.seccion_tesis) result += `- Sección Narrativa: ${metadata.seccion_tesis}\n`;
                    result += "\n";
                }

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    result += `*No se encontraron respuestas relacionadas con esta pregunta.*\n\n`;
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (const clmUid of question.related_clms) {
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));
                            result += `### [[CLM]] - ${clmTitle}\n\n`;

                            const clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += "**Información del proyecto:**\n";
                                if (clmMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${clmMetadata.proyecto_asociado}\n`;
                                if (clmMetadata.seccion_tesis) result += `- Sección Narrativa: ${clmMetadata.seccion_tesis}\n`;
                                result += "\n";
                                result += "\n";
                            }

                            // --- NUEVO: Contenido del CLM ---
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, extractAdditionalContent, "CLM", excludeBitacora);
                            if (clmContent) {
                                result += "**Contenido:**\n\n";
                                result += clmContent + "\n";
                            }
                            // --------------------------------

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                result += "**CLMs de soporte (SupportedBy):**\n\n";
                                for (const suppUid of clm.supporting_clms) {
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));
                                        result += `#### [[CLM]] - ${suppTitle}\n`;

                                        // --- NUEVO: Contenido del CLM de Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, extractAdditionalContent, "CLM", excludeBitacora);
                                        if (suppContent) {
                                            result += "\n" + suppContent + "\n";
                                        }
                                        // -------------------------------------------
                                    }
                                }
                                result += "\n";
                            }

                            // Connected CLMs
                            if (clm.connected_clms && clm.connected_clms.length > 0) {
                                result += "**CLMs relacionados:**\n\n";
                                for (const connUid of clm.connected_clms) {
                                    if (allNodes[connUid]) {
                                        const connClm = allNodes[connUid];
                                        const connTitle = DiscourseGraphToolkit.cleanText(connClm.title.replace("[[CLM]] - ", ""));
                                        result += `#### [[CLM]] - ${connTitle}\n`;

                                        // --- NUEVO: Contenido del CLM Relacionado ---
                                        const connContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(connClm.data, extractAdditionalContent, "CLM", excludeBitacora);
                                        if (connContent) {
                                            result += "\n" + connContent + "\n";
                                        }
                                        // -------------------------------------------
                                    }
                                }
                                result += "\n";
                            }

                            // EVDs
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if ((!clm.connected_clms || clm.connected_clms.length === 0) && (!clm.supporting_clms || clm.supporting_clms.length === 0)) {
                                    result += `*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n`;
                                }
                            } else {
                                result += "**Evidencias que respaldan esta afirmación:**\n\n";
                                for (const evdUid of clm.related_evds) {
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                        result += `#### [[EVD]] - ${evdTitle}\n\n`;

                                        const evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += "**Información del proyecto:**\n";
                                            if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                            if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                            result += "\n";
                                        }

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, extractAdditionalContent, "EVD", excludeBitacora);
                                        if (detailedContent) {
                                            result += "**Contenido detallado:**\n\n";
                                            result += detailedContent + "\n";
                                        } else {
                                            result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (const evdUid of question.direct_evds) {
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                            result += `### [[EVD]] - ${evdTitle}\n\n`;

                            const evdMetadata = evd.project_metadata || {};
                            if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                result += "**Información del proyecto:**\n";
                                if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                result += "\n";
                            }

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, extractAdditionalContent, "EVD", excludeBitacora);
                            if (detailedContent) {
                                result += "**Contenido detallado:**\n\n";
                                result += detailedContent + "\n";
                            } else {
                                result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                            }
                        }
                    }
                }

            } catch (e) {
                result += `*Error procesando pregunta: ${e}*\n\n`;
            }
        }

        return result;
    }
};




// --- MODULE: src/ui/modal.js ---
// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT)
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('general');
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');

    // Estados de Exportación
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: false, CLM: false, EVD: false });
    const [includeReferenced, setIncludeReferenced] = React.useState(false);
    const [includeContent, setIncludeContent] = React.useState(true);
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [validation, setValidation] = React.useState({});
    const [suggestions, setSuggestions] = React.useState([]);
    const [isScanning, setIsScanning] = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [selectedProjectsForDelete, setSelectedProjectsForDelete] = React.useState({});

    // Estado para Dashboard de Nodos
    const [nodeCounts, setNodeCounts] = React.useState({ QUE: 0, CLM: 0, EVD: 0 });

    // Init
    React.useEffect(() => {
        const loadData = async () => {
            // Asegurar que tenemos lo último de Roam al abrir
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());
            setHistory(DiscourseGraphToolkit.getExportHistory());

            // Cargar validación inicial
            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }
        };
        loadData();
    }, []);

    // Efecto para cargar cuentas de nodos cuando cambia el proyecto
    React.useEffect(() => {
        const loadCounts = async () => {
            if (config.defaultProject) {
                const counts = await DiscourseGraphToolkit.countNodesByProject(config.defaultProject);
                setNodeCounts(counts);
            } else {
                setNodeCounts({ QUE: 0, CLM: 0, EVD: 0 });
            }
        };
        loadCounts();
    }, [config.defaultProject]);

    // --- Handlers Config ---
    const handleSaveConfig = async () => {
        DiscourseGraphToolkit.saveConfig(config);
        DiscourseGraphToolkit.saveTemplates(templates);
        DiscourseGraphToolkit.saveProjects(projects);
        await DiscourseGraphToolkit.syncProjectsToRoam(projects);
        await DiscourseGraphToolkit.saveConfigToRoam(config, templates); // Save to Roam Page
        DiscourseGraphToolkit.showToast('Configuración guardada y sincronizada en Roam.', 'success');
    };

    const handleExportConfig = () => {
        DiscourseGraphToolkit.exportConfig();
        DiscourseGraphToolkit.showToast('Configuración exportada.', 'success');
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (DiscourseGraphToolkit.importConfig(event.target.result)) {
                        setConfig(DiscourseGraphToolkit.getConfig());
                        setTemplates(DiscourseGraphToolkit.getTemplates());
                        setProjects(DiscourseGraphToolkit.getProjects());
                        DiscourseGraphToolkit.showToast('Configuración importada correctamente.', 'success');
                    } else {
                        DiscourseGraphToolkit.showToast('Error al importar configuración.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Handlers Proyectos ---
    const handleAddProject = async () => {
        if (newProject && !projects.includes(newProject)) {
            const updated = [...projects, newProject].sort();
            setProjects(updated);
            setNewProject('');
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleRemoveProject = async (p) => {
        // Sin confirmación, borrado directo
        const updated = projects.filter(x => x !== p);
        setProjects(updated);
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const handleBulkDeleteProjects = async () => {
        const toDelete = Object.keys(selectedProjectsForDelete).filter(k => selectedProjectsForDelete[k]);
        if (toDelete.length === 0) return;

        const updated = projects.filter(p => !selectedProjectsForDelete[p]);
        setProjects(updated);
        setSelectedProjectsForDelete({}); // Reset selection
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const toggleSelectAllProjects = () => {
        const allSelected = projects.every(p => selectedProjectsForDelete[p]);
        const newSelection = {};
        projects.forEach(p => newSelection[p] = !allSelected);
        setSelectedProjectsForDelete(newSelection);
    };

    const handleValidate = async () => {
        setExportStatus("Validando proyectos...");
        const val = await DiscourseGraphToolkit.validateProjectsInGraph(projects);
        setValidation(val);
        setExportStatus("Validación completada.");
    };

    const handleScanProjects = async () => {
        setIsScanning(true);
        try {
            const found = await DiscourseGraphToolkit.discoverProjectsInGraph();
            const newSuggestions = found.filter(p => !projects.includes(p));
            setSuggestions(newSuggestions);
            if (newSuggestions.length === 0) {
                DiscourseGraphToolkit.showToast("No se encontraron nuevos proyectos.", "info");
            } else {
                DiscourseGraphToolkit.showToast(`Se encontraron ${newSuggestions.length} proyectos nuevos.`, "success");
            }
        } catch (e) {
            console.error(e);
            DiscourseGraphToolkit.showToast("Error al buscar proyectos.", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleForceSync = async () => {
        setExportStatus("Sincronizando...");
        try {
            await DiscourseGraphToolkit.initializeProjectsSync();
            setProjects(DiscourseGraphToolkit.getProjects());
            DiscourseGraphToolkit.showToast("Sincronización completada.", "success");
        } catch (e) {
            DiscourseGraphToolkit.showToast("Error en sincronización.", "error");
        } finally {
            setExportStatus("");
        }
    };

    const handleAddSuggestion = async (proj) => {
        if (!projects.includes(proj)) {
            const updated = [...projects, proj].sort();
            setProjects(updated);
            setSuggestions(suggestions.filter(s => s !== proj));
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    // --- Handlers Exportación ---
    const handlePreview = async () => {
        const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
        const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

        if (pNames.length === 0 || tTypes.length === 0) {
            alert("Selecciona proyecto y tipo.");
            return;
        }

        setExportStatus("Buscando páginas...");
        let allPages = [];
        for (let p of pNames) {
            const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
            allPages = allPages.concat(pages);
        }

        // Deduplicar
        let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());

        if (includeReferenced) {
            setExportStatus("Buscando referencias...");
            const referenced = await DiscourseGraphToolkit.findReferencedDiscoursePages(uniquePages.map(p => p.pageUid), tTypes);
            uniquePages = Array.from(new Map([...uniquePages, ...referenced].map(item => [item.pageUid, item])).values());
        }

        setPreviewPages(uniquePages);
        setExportStatus(`Encontradas ${uniquePages.length} páginas.`);
        return uniquePages;
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_export_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.json`;

            await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), includeContent);

            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
            DiscourseGraphToolkit.addToExportHistory({
                date: new Date().toISOString(),
                projects: pNames,
                count: pagesToExport.length,
                status: 'success'
            });
            setHistory(DiscourseGraphToolkit.getExportHistory());
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHtml = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.html`;

            setExportStatus("Obteniendo datos...");
            // Obtener datos sin descargar JSON
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), includeContent, false);

            setExportStatus("Procesando relaciones...");
            // Convertir array a mapa por UID para el mapper y NORMALIZAR
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    // Normalización crítica para RelationshipMapper y ContentProcessor
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node; // El nodo mismo contiene los hijos
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes (CLMs/EVDs referenciados) ---
            setExportStatus("Analizando dependencias...");
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
                // Fetch missing nodes
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, includeContent, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }
            // -------------------------------------------------------------------------------

            // Mapear relaciones
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // Filtrar preguntas para el reporte
            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(questions, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, includeContent, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, htmlContent, 'text/html');

            setExportStatus(`✅ Exportación HTML completada.`);
            DiscourseGraphToolkit.addToExportHistory({
                date: new Date().toISOString(),
                projects: pNames,
                count: pagesToExport.length,
                status: 'success (HTML)'
            });
            setHistory(DiscourseGraphToolkit.getExportHistory());

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportMarkdown = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.md`;

            setExportStatus("Obteniendo datos...");
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), includeContent, false);

            setExportStatus("Procesando relaciones...");
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes ---
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
            // -------------------------------------------------------------------------------

            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(questions, allNodes, includeContent, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown completada.`);
            DiscourseGraphToolkit.addToExportHistory({
                date: new Date().toISOString(),
                projects: pNames,
                count: pagesToExport.length,
                status: 'success (MD)'
            });
            setHistory(DiscourseGraphToolkit.getExportHistory());

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Render Helpers ---
    const tabStyle = (id) => ({
        padding: '10px 20px', cursor: 'pointer', borderBottom: activeTab === id ? '2px solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    });

    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }
    },
        React.createElement('div', {
            style: {
                backgroundColor: 'white', width: '800px', height: '85vh', borderRadius: '8px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' } },
                React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                React.createElement('button', { onClick: onClose, style: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' } }, '✕')
            ),
            // Tabs
            React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                ['general', 'nodos', 'relaciones', 'exportar', 'importar', 'proyectos', 'historial'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) }, t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),
            // Content
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '20px' } },
                activeTab === 'general' && React.createElement('div', null,
                    React.createElement('h3', null, 'Configuración General'),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Nombre del Campo de Proyecto:',
                        React.createElement('input', {
                            type: 'text', value: config.projectFieldName,
                            onChange: e => setConfig({ ...config, projectFieldName: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        })
                    ),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Proyecto por Defecto:',
                        React.createElement('select', {
                            value: config.defaultProject,
                            onChange: e => setConfig({ ...config, defaultProject: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        },
                            React.createElement('option', { value: "" }, "-- Seleccionar --"),
                            projects.map(p => React.createElement('option', { key: p, value: p }, p))
                        )
                    ),
                    React.createElement('button', { onClick: handleSaveConfig, style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginTop: '20px' } }, 'Guardar Todo'),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Backup & Restore'),
                        React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                            React.createElement('button', { onClick: handleExportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↓ Exportar Config'),
                            React.createElement('button', { onClick: handleImportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↑ Importar Config')
                        )
                    ),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Atajos de Teclado'),
                        React.createElement('ul', { style: { listStyle: 'none', padding: 0 } },
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + Q'), ': Crear Pregunta (QUE)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + C'), ': Crear Afirmación (CLM)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + E'), ': Crear Evidencia (EVD)')
                        )
                    )
                ),

                activeTab === 'nodos' && React.createElement('div', null,
                    React.createElement('h3', null, 'Dashboard de Nodos'),

                    // Selector de Proyecto
                    React.createElement('div', { style: { marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' } },
                        React.createElement('label', { style: { fontWeight: 'bold', display: 'block', marginBottom: '8px' } }, 'Proyecto Activo:'),
                        React.createElement('select', {
                            value: config.defaultProject || "",
                            onChange: (e) => {
                                const newProj = e.target.value;
                                setConfig({ ...config, defaultProject: newProj });
                                // Guardar cambio de config inmediatamente para mejor UX
                                DiscourseGraphToolkit.saveConfig({ ...config, defaultProject: newProj });
                            },
                            style: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }
                        },
                            React.createElement('option', { value: "" }, "-- Seleccionar Proyecto --"),
                            projects.map(p => React.createElement('option', { key: p, value: p }, p))
                        )
                    ),

                    // Stats Cards
                    React.createElement('div', { style: { display: 'flex', gap: '20px', marginBottom: '30px' } },
                        ['QUE', 'CLM', 'EVD'].map(type => {
                            const typeInfo = DiscourseGraphToolkit.TYPES[type];
                            const count = nodeCounts[type];

                            return React.createElement('div', {
                                key: type,
                                onClick: () => {
                                    if (config.defaultProject) {
                                        DiscourseGraphToolkit.openQueryPage(type, config.defaultProject);
                                        onClose(); // Cerrar modal al navegar
                                    } else {
                                        alert("Por favor selecciona un proyecto primero.");
                                    }
                                },
                                style: {
                                    flex: 1,
                                    backgroundColor: typeInfo.color,
                                    color: 'white',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.2s',
                                    textAlign: 'center'
                                }
                            },
                                React.createElement('div', { style: { fontSize: '14px', opacity: 0.9 } }, typeInfo.label),
                                React.createElement('div', { style: { fontSize: '36px', fontWeight: 'bold', margin: '10px 0' } }, count),
                                React.createElement('div', { style: { fontSize: '12px', opacity: 0.8 } }, 'Click para ver detalles')
                            );
                        })
                    ),

                    // Templates Section (Collapsible or moved below)
                    React.createElement('details', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('summary', { style: { cursor: 'pointer', fontWeight: 'bold', color: '#666' } }, 'Configuración de Templates (Avanzado)'),
                        ['QUE', 'CLM', 'EVD'].map(type =>
                            React.createElement('div', { key: type, style: { marginTop: '15px' } },
                                React.createElement('label', { style: { fontWeight: 'bold', color: DiscourseGraphToolkit.TYPES[type].color } }, `Template ${type}`),
                                React.createElement('textarea', {
                                    value: templates[type],
                                    onChange: e => setTemplates({ ...templates, [type]: e.target.value }),
                                    style: { width: '100%', height: '80px', fontFamily: 'monospace', padding: '8px', marginTop: '5px' }
                                })
                            )
                        )
                    )
                ),

                activeTab === 'relaciones' && React.createElement('div', null,
                    React.createElement('h3', null, 'Relaciones Lógicas'),
                    React.createElement('p', { style: { color: '#666' } }, 'Las relaciones conectan nodos para construir argumentos.'),
                    React.createElement('div', { style: { marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' } },
                        React.createElement('strong', { style: { color: '#0d7bc4' } }, '#RespondedBy'),
                        React.createElement('span', { style: { marginLeft: '10px', padding: '2px 6px', backgroundColor: '#2196F3', color: 'white', borderRadius: '3px', fontSize: '12px' } }, 'QUE'),
                        React.createElement('p', { style: { margin: '5px 0 0 0' } }, 'Vincula Claims o Evidencia que responden a una Pregunta.')
                    ),
                    React.createElement('div', { style: { marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px' } },
                        React.createElement('strong', { style: { color: '#2e7d32' } }, '#SupportedBy'),
                        React.createElement('span', { style: { marginLeft: '10px', padding: '2px 6px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '3px', fontSize: '12px' } }, 'CLM'),
                        React.createElement('p', { style: { margin: '5px 0 0 0' } }, 'Vincula Evidencia que soporta una Afirmación.')
                    ),
                    React.createElement('div', { style: { padding: '15px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' } },
                        React.createElement('strong', null, 'Flujo Típico:'),
                        React.createElement('ul', { style: { margin: '10px 0 0 0', paddingLeft: '20px' } },
                            React.createElement('li', null, 'Crear Pregunta (QUE)'),
                            React.createElement('li', null, 'Agregar Claims que la responden (#RespondedBy)'),
                            React.createElement('li', null, 'Respaldar Claims con Evidencia (#SupportedBy)')
                        )
                    )
                ),

                activeTab === 'proyectos' && React.createElement('div', null,
                    React.createElement('h3', null, 'Gestión de Proyectos'),
                    React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                        React.createElement('input', {
                            type: 'text', placeholder: 'Nuevo proyecto...',
                            value: newProject, onChange: e => setNewProject(e.target.value),
                            style: { flex: 1, padding: '8px' }
                        }),
                        React.createElement('button', { onClick: handleAddProject, style: { padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' } }, 'Agregar')
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '10px' } },
                        React.createElement('button', { onClick: handleValidate, style: { padding: '5px 10px', cursor: 'pointer' } }, "Validar Existencia"),
                        React.createElement('button', { onClick: handleScanProjects, style: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
                        React.createElement('button', { onClick: handleForceSync, style: { padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
                    ),

                    suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '20px', padding: '10px', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '4px' } },
                        React.createElement('strong', { style: { display: 'block', marginBottom: '5px', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`),
                        React.createElement('div', { style: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', backgroundColor: 'white' } },
                            suggestions.map(s =>
                                React.createElement('div', { key: s, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' } },
                                    React.createElement('span', null, s),
                                    React.createElement('button', { onClick: () => handleAddSuggestion(s), style: { fontSize: '12px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' } }, '+ Añadir')
                                )
                            )
                        )
                    ),

                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                                onChange: toggleSelectAllProjects,
                                style: { marginRight: '5px' }
                            }),
                            'Seleccionar Todo'
                        ),
                        React.createElement('button', {
                            onClick: handleBulkDeleteProjects,
                            disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                            style: {
                                padding: '5px 10px',
                                backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? '#f44336' : '#ccc',
                                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                            }
                        }, 'Eliminar Seleccionados')
                    ),

                    React.createElement('ul', { style: { listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee' } },
                        projects.map(p =>
                            React.createElement('li', { key: p, style: { padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                React.createElement('label', { style: { display: 'flex', alignItems: 'center', flex: 1 } },
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: !!selectedProjectsForDelete[p],
                                        onChange: (e) => setSelectedProjectsForDelete({ ...selectedProjectsForDelete, [p]: e.target.checked }),
                                        style: { marginRight: '10px' }
                                    }),
                                    React.createElement('span', null,
                                        p,
                                        validation[p] !== undefined ? (validation[p] ? " ✅" : " ⚠️ (No encontrado)") : ""
                                    )
                                ),
                                React.createElement('button', { onClick: () => handleRemoveProject(p), style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer' } }, 'X')
                            )
                        )
                    )
                ),

                activeTab === 'exportar' && React.createElement('div', null,
                    React.createElement('h3', null, 'Exportar Grafos'),
                    React.createElement('div', { style: { display: 'flex', gap: '20px' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', null, '1. Proyectos'),
                            React.createElement('div', { style: { maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                                projects.length === 0 ? 'No hay proyectos.' : projects.map(p =>
                                    React.createElement('div', { key: p },
                                        React.createElement('label', null,
                                            React.createElement('input', {
                                                type: 'checkbox',
                                                checked: selectedProjects[p] || false,
                                                onChange: e => setSelectedProjects({ ...selectedProjects, [p]: e.target.checked })
                                            }),
                                            ' ' + p
                                        )
                                    )
                                )
                            )
                        ),
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', null, '2. Tipos'),
                            ['QUE', 'CLM', 'EVD'].map(t =>
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
                            React.createElement('div', { style: { marginTop: '10px' } },
                                React.createElement('label', null,
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: includeReferenced,
                                        onChange: e => setIncludeReferenced(e.target.checked)
                                    }),
                                    ' Incluir nodos referenciados'
                                )
                            ),
                            React.createElement('div', { style: { marginTop: '10px' } },
                                React.createElement('label', null,
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: includeContent,
                                        onChange: e => setIncludeContent(e.target.checked)
                                    }),
                                    ' Incluir Contenido de Páginas'
                                ),
                                includeContent && React.createElement('div', { style: { marginLeft: '20px', marginTop: '5px' } },
                                    React.createElement('label', null,
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: excludeBitacora,
                                            onChange: e => setExcludeBitacora(e.target.checked)
                                        }),
                                        ' Excluir contenido de [[bitácora]]'
                                    )
                                )
                            )
                        )
                    ),
                    React.createElement('div', { style: { marginTop: '20px' } },
                        React.createElement('button', { onClick: handlePreview, style: { marginRight: '10px', padding: '10px' } }, "Vista Previa"),
                        React.createElement('button', {
                            onClick: handleExport,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' }
                        }, 'Exportar JSON'),
                        React.createElement('button', {
                            onClick: handleExportHtml,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }
                        }, 'Exportar HTML'),
                        React.createElement('button', {
                            onClick: handleExportMarkdown,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }
                        }, 'Exportar Markdown')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '10px', fontWeight: 'bold' } }, exportStatus),
                    previewPages.length > 0 && React.createElement('div', { style: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                        React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
                        React.createElement('ul', { style: { paddingLeft: '20px' } },
                            previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
                        )
                    )
                ),

                activeTab === 'importar' && React.createElement('div', null,
                    React.createElement('h3', null, 'Importar Grafos'),
                    React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

                    React.createElement('div', { style: { marginTop: '20px', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' } },
                        React.createElement('input', {
                            type: 'file',
                            accept: '.json',
                            id: 'import-file-input',
                            style: { display: 'none' },
                            onChange: (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        setExportStatus("Importando...");
                                        try {
                                            const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setExportStatus(msg));

                                            let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                            if (result.errors && result.errors.length > 0) {
                                                statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                                DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                            } else {
                                                DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                            }
                                            setExportStatus(statusMsg);

                                        } catch (err) {
                                            console.error(err);
                                            setExportStatus(`❌ Error fatal: ${err.message}`);
                                            DiscourseGraphToolkit.showToast("Error en importación.", "error");
                                        }
                                    };
                                    reader.readAsText(file);
                                }
                            }
                        }),
                        React.createElement('label', {
                            htmlFor: 'import-file-input',
                            style: {
                                display: 'inline-block', padding: '10px 20px', backgroundColor: '#2196F3', color: 'white',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '16px'
                            }
                        }, 'Seleccionar Archivo JSON')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontFamily: 'monospace' } }, exportStatus)
                ),

                activeTab === 'historial' && React.createElement('div', null,
                    React.createElement('h3', null, 'Historial de Exportaciones'),
                    React.createElement('ul', null,
                        history.map((h, i) =>
                            React.createElement('li', { key: i, style: { marginBottom: '10px', padding: '10px', border: '1px solid #eee' } },
                                React.createElement('div', { style: { fontWeight: 'bold' } }, new Date(h.date).toLocaleString()),
                                React.createElement('div', null, `Proyectos: ${h.projects.join(', ')}`),
                                React.createElement('div', null, `Estado: ${h.status} (${h.count} páginas)`)
                            )
                        )
                    )
                )
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    // Guardar el elemento activo actual para restaurarlo después
    const previousActiveElement = document.activeElement;

    // Cerrar modal anterior si existe
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        ReactDOM.unmountComponentAtNode(existing);
        existing.remove();
    }

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
            if (div.parentNode) div.parentNode.removeChild(div);

            // Restaurar foco (Estrategia Robusta)
            setTimeout(() => {
                if (previousActiveElement && document.body.contains(previousActiveElement)) {
                    previousActiveElement.focus();
                } else {
                    // Fallback: Intentar enfocar el área principal de Roam
                    const article = document.querySelector('.roam-article') ||
                        document.querySelector('.rm-article-wrapper') ||
                        document.querySelector('.roam-body-main');

                    if (article) {
                        article.focus();
                        // Simular click para reactivar listeners de Roam
                        article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                        article.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                        article.click();
                    } else {
                        window.focus();
                    }
                }
            }, 100);
        } catch (e) {
            console.error("Error closing modal:", e);
        }
    };

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close }), div);
};




// --- MODULE: src/index.js ---
// ============================================================================
// 6. INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Inicializar sincronización con un pequeño retraso para asegurar que Roam esté listo
    setTimeout(() => {
        DiscourseGraphToolkit.initializeProjectsSync();
    }, 5000);

    // Cargar config desde Roam si existe
    setTimeout(() => {
        DiscourseGraphToolkit.loadConfigFromRoam().then(data => {
            if (data) console.log("Configuración cargada desde Roam.");
        });
    }, 5500);

    // Registrar Comandos
    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph Toolkit: Abrir',
        callback: () => DiscourseGraphToolkit.openModal()
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Pregunta (QUE)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("QUE"),
        "default-hotkey": "ctrl-shift-q"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Afirmación (CLM)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("CLM"),
        "default-hotkey": "ctrl-shift-c"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Evidencia (EVD)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("EVD"),
        "default-hotkey": "ctrl-shift-e"
    });

    console.log(`✅ Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION} cargado.`);
} else {
    console.error("Roam Alpha API no disponible.");
}


})();
