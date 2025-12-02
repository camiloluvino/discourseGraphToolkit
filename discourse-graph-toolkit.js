/**
 * DISCOURSE GRAPH TOOLKIT v1.0
 * ===================================================
 * Fusión de discourseGraphElemental v3.0 y roamDiscourseSelector v2.12.0
 *
 * Un sistema integral para crear, gestionar y exportar grafos de discurso en Roam Research.
 *
 * CARACTERÍSTICAS:
 * 1. CREACIÓN: Transforma bloques en nodos (QUE, CLM, EVD) con atajos (Ctrl+Shift+Q/C/E).
 * 2. TEMPLATES: Define estructuras personalizadas para cada tipo de nodo.
 * 3. GESTIÓN: Administra tus proyectos de investigación.
 * 4. EXPORTACIÓN: Exporta tus grafos en formato nativo JSON compatible con Roam.
 *
 * INSTALACIÓN:
 * 1. Crea un bloque {{[[roam/js]]}}
 * 2. Pega este código en un bloque hijo de tipo JavaScript
 * 3. Recarga Roam
 *
 * USO:
 * - Crear nodo: Escribe texto y presiona Ctrl+Shift+Q (Pregunta), C (Afirmación) o E (Evidencia).
 * - Abrir Toolkit: Presiona Ctrl+P y busca "Discourse Graph Toolkit: Abrir".
 */

(function () {
    'use strict';

    // ============================================================================
    // 1. CONFIGURACIÓN Y CONSTANTES
    // ============================================================================

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};

    DiscourseGraphToolkit.VERSION = "1.1.0"; // Version updated for robust features

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

    // --- Utilidades UI (Toast) ---
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

    // ============================================================================
    // 5. INTERFAZ DE USUARIO (REACT)
    // ============================================================================
    // (ToolkitModal and openModal are defined here, skipping for brevity in this replacement block as they are unchanged)
    // Wait, I need to replace the whole block or just the function?
    // The instructions say "Update initializeProjectsSync".
    // I will replace from 259 to 400 (approx) to cover initializeProjectsSync and subsequent functions up to ToolkitModal start.
    // ToolkitModal starts at line 708 in the original file, but in the current file it starts around 400?
    // No, in the current file (after my huge edit), ToolkitModal starts at line 403 (based on previous view).
    // Wait, let's check the file content again.
    // In step 380, initializeProjectsSync starts at 259.
    // ToolkitModal starts at 708 in the ORIGINAL file, but I replaced a huge chunk.
    // In step 380, I see lines 250-400.
    // ToolkitModal is NOT in 250-400.
    // I will replace from 259 to 400.

    // BUT I also need to update the global timeout at the end of the file.
    // I will do that in a separate replacement or include it here if I can view the end.
    // I viewed the end in step 376.
    // The global timeout is at line 1216 (in step 376).

    // I will do two replacements.
    // First: initializeProjectsSync.


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

    // --- Utilidades UI (Toast) ---
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
    // 4. LÓGICA DE EXPORTACIÓN (CORE)
    // ============================================================================

    // ============================================================================
    // 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
    // ============================================================================

    // --- Utilidades de Exportación ---
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
        const [isExporting, setIsExporting] = React.useState(false);
        const [exportStatus, setExportStatus] = React.useState('');
        const [previewPages, setPreviewPages] = React.useState([]);
        const [validation, setValidation] = React.useState({});
        const [suggestions, setSuggestions] = React.useState([]);
        const [isScanning, setIsScanning] = React.useState(false);
        const [history, setHistory] = React.useState([]);

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
            if (confirm(`¿Eliminar proyecto "${p}"?`)) {
                const updated = projects.filter(x => x !== p);
                setProjects(updated);
                DiscourseGraphToolkit.saveProjects(updated);
                await DiscourseGraphToolkit.syncProjectsToRoam(updated);
            }
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
        };

        const handleExport = async () => {
            if (previewPages.length === 0) {
                await handlePreview();
                if (previewPages.length === 0) return;
            }

            setIsExporting(true);
            try {
                const uids = previewPages.map(p => p.pageUid);
                const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
                const filename = `roam_export_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.json`;

                await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg));

                setExportStatus(`✅ Exportación completada: ${previewPages.length} páginas.`);
                DiscourseGraphToolkit.addToExportHistory({
                    date: new Date().toISOString(),
                    projects: pNames,
                    count: previewPages.length,
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
                    ['general', 'nodos', 'relaciones', 'exportar', 'proyectos', 'historial'].map(t =>
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
                        )
                    ),

                    activeTab === 'nodos' && React.createElement('div', null,
                        React.createElement('h3', null, 'Templates de Nodos'),
                        ['QUE', 'CLM', 'EVD'].map(type =>
                            React.createElement('div', { key: type, style: { marginBottom: '20px' } },
                                React.createElement('label', { style: { fontWeight: 'bold', color: DiscourseGraphToolkit.TYPES[type].color } }, `Template ${type}`),
                                React.createElement('textarea', {
                                    value: templates[type],
                                    onChange: e => setTemplates({ ...templates, [type]: e.target.value }),
                                    style: { width: '100%', height: '100px', fontFamily: 'monospace', padding: '8px', marginTop: '5px' }
                                })
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

                        React.createElement('ul', { style: { listStyle: 'none', padding: 0 } },
                            projects.map(p =>
                                React.createElement('li', { key: p, style: { padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' } },
                                    React.createElement('span', null,
                                        p,
                                        validation[p] !== undefined ? (validation[p] ? " ✅" : " ⚠️ (No encontrado)") : ""
                                    ),
                                    React.createElement('button', { onClick: () => handleRemoveProject(p), style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer' } }, 'Eliminar')
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
                                )
                            )
                        ),
                        React.createElement('div', { style: { marginTop: '20px' } },
                            React.createElement('button', { onClick: handlePreview, style: { marginRight: '10px', padding: '10px' } }, "Vista Previa"),
                            React.createElement('button', {
                                onClick: handleExport,
                                disabled: isExporting,
                                style: { padding: '10px 20px', backgroundColor: isExporting ? '#ccc' : '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }
                            }, isExporting ? 'Exportando...' : 'Exportar JSON')
                        ),
                        exportStatus && React.createElement('div', { style: { marginTop: '10px', fontWeight: 'bold' } }, exportStatus),
                        previewPages.length > 0 && React.createElement('div', { style: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                            React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
                            React.createElement('ul', { style: { paddingLeft: '20px' } },
                                previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
                            )
                        )
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
