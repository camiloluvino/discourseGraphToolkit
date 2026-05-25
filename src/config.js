// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

window.DiscourseGraphToolkit = window.DiscourseGraphToolkit || {};
// DiscourseGraphToolkit.VERSION = "1.5.12"; // Managed by build script

// Claves de LocalStorage
DiscourseGraphToolkit.STORAGE = {
    CONFIG: "discourseGraphToolkit_config",
    TEMPLATES: "discourseGraphToolkit_templates",
    PROJECTS: "discourseGraphToolkit_projects",
    DISMISSED_PROJECTS: "discourseGraphToolkit_dismissed_projects",
    HISTORY_NODES: "discourseGraphToolkit_history_nodes",
    HISTORY_EXPORT: "discourseGraphToolkit_history_export",
    QUESTION_ORDER: "discourseGraphToolkit_question_order",
    PANORAMIC_CACHE: "discourseGraphToolkit_panoramic_cache",
    PANORAMIC_EXPANDED: "discourseGraphToolkit_panoramic_expanded",
    GROUP_ORDER: "discourseGraphToolkit_group_order",
    VERIFICATION_CACHE: "discourseGraphToolkit_verificationCache",
    FAVORITES: "discourseGraphToolkit_favorites"
};

// Get current graph name from Roam API or URL
DiscourseGraphToolkit.getGraphName = function () {
    // Method 1: Try Roam API (available in newer versions)
    if (window.roamAlphaAPI?.graph?.name) {
        return window.roamAlphaAPI.graph.name;
    }
    // Method 2: Extract from URL (always works)
    // URL format: https://roamresearch.com/#/app/GRAPH_NAME/...
    const match = window.location.hash.match(/#\/app\/([^\/]+)/);
    return match ? match[1] : 'default';
};

// Generate storage key with graph prefix for isolation
DiscourseGraphToolkit.getStorageKey = function (baseKey) {
    const graphName = this.getGraphName();
    return `${baseKey}_${graphName}`;
};

// Constantes de Roam
DiscourseGraphToolkit.ROAM = {
    PROJECTS_PAGE: "roam/js/discourse-graph/projects",
    CONFIG_PAGE: "roam/js/discourse-graph/config"
};

// Sufijo que identifica páginas contenedoras de nodos discourse
// Las páginas contenedoras siempre terminan con este sufijo
DiscourseGraphToolkit.CONTAINER_PAGE_SUFFIX = '/grafoDeDiscurso';

// Configuración de Archivos y Exportación
DiscourseGraphToolkit.FILES = {
    BYTES_PER_MB: 1024 * 1024,
    MAX_SIZE_MB: 10,
    MAX_DEPTH: 10,
    MAX_PANORAMIC_CACHE_NODES: 500
};

// Tipos de Nodos
DiscourseGraphToolkit.TYPES = {
    GRI: { prefix: "GRI", label: "Grupo", color: "#6c5c99" },
    QUE: { prefix: "QUE", label: "Pregunta", color: "#2196F3" },
    CLM: { prefix: "CLM", label: "Afirmación", color: "#4CAF50" },
    EVD: { prefix: "EVD", label: "Evidencia", color: "#FF9800" }
};

// Paleta de Colores Global del Sistema de Diseño (Claude-inspired)
DiscourseGraphToolkit.THEME = {
    colors: {
        primary: '#000000',     // Negro (Primary actions)
        primaryHover: '#2d2c2b',
        secondary: '#f3f1eb',   // Gris cálido (Secondary actions / Backgrounds)
        secondaryHover: '#ebe8e0',
        success: '#377d61',     // Verde oscuro (Completado / Coherente / Validación Ok)
        successHover: '#2d6850',
        warning: '#a87e27',     // Amarillo oscuro (Huérfanos / Faltantes / Diferentes)
        warningHover: '#8a671f',
        danger: '#bb4f43',      // Rojo oscuro (Errores / Eliminar)
        dangerHover: '#9a4137',
        neutral: '#999793',     // Gris texto secundario/muted
        text: '#2d2c2b',        // Texto principal
        border: '#e5e3dc',      // Bordes
        background: '#fbfaf8',  // Blanco cálido para cards/modales
        backgroundApp: '#fbfaf8',// Fondo general
        // Accesorios
        accentPurple: '#6c5c99'  // Para estados especializados
    }
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
    "GRI": `Proyecto Asociado:: {PROYECTO}
#Contains
    -`,
    "QUE": `Proyecto Asociado:: {PROYECTO}
#RespondedBy
    -`,
    "CLM": `Proyecto Asociado:: {PROYECTO}
#SupportedBy
    -`,
    "EVD": `Proyecto Asociado:: {PROYECTO}`
};

// ============================================================================
// FavoritesService
// CRUD para perfiles de selección rápida (compartido entre tabs)
// ============================================================================
DiscourseGraphToolkit.FavoritesService = {
    _getStorageKey: function () {
        return DiscourseGraphToolkit.getStorageKey(DiscourseGraphToolkit.STORAGE.FAVORITES);
    },

    // Obtener todos los favoritos de un tipo ('branches' o 'export')
    getAll: function (tabType) {
        try {
            const raw = localStorage.getItem(this._getStorageKey());
            const all = raw ? JSON.parse(raw) : {};
            return all[tabType] || [];
        } catch (e) {
            console.warn('FavoritesService: Error reading favorites', e);
            return [];
        }
    },

    // Guardar la lista completa de un tipo
    _saveAll: function (tabType, list) {
        try {
            const raw = localStorage.getItem(this._getStorageKey());
            const all = raw ? JSON.parse(raw) : {};
            all[tabType] = list;
            localStorage.setItem(this._getStorageKey(), JSON.stringify(all));
            return true;
        } catch (e) {
            console.warn('FavoritesService: Error saving favorites', e);
            return false;
        }
    },

    // Agregar (o sobrescribir) un favorito
    // Si name es null/undefined, se genera automáticamente usando DiscourseGraphToolkit.computeFavoriteName
    // Si ya existe un favorito con ese nombre, se actualiza (sobrescribe)
    add: function (tabType, name, data) {
        // Si no se pasó nombre, generarlo automáticamente desde los datos
        if (!name && data && data.selectedProjects) {
            name = DiscourseGraphToolkit.computeFavoriteName(data.selectedProjects);
        }
        if (!name) name = 'favorito';

        const list = this.getAll(tabType);
        const trimmedName = name.trim().substring(0, 40);

        // Buscar si ya existe un favorito con el mismo nombre (namespace)
        const existingIdx = list.findIndex(f => f.name === trimmedName);
        if (existingIdx !== -1) {
            // Actualizar el existente
            list[existingIdx] = {
                ...list[existingIdx],
                timestamp: Date.now(),
                data: data
            };
            this._saveAll(tabType, list);
            return list;
        }

        // No existe, crear nuevo
        const id = 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        list.push({
            id: id,
            name: trimmedName,
            timestamp: Date.now(),
            data: data
        });
        this._saveAll(tabType, list);
        return list;
    },

    // Actualizar un favorito existente (por id)
    update: function (tabType, id, updates) {
        const list = this.getAll(tabType);
        const idx = list.findIndex(f => f.id === id);
        if (idx === -1) return list;
        if (updates.name) updates.name = updates.name.trim().substring(0, 40);
        if (updates.timestamp === undefined) updates.timestamp = Date.now();
        list[idx] = { ...list[idx], ...updates };
        this._saveAll(tabType, list);
        return list;
    },

    // Eliminar un favorito por id
    remove: function (tabType, id) {
        const list = this.getAll(tabType).filter(f => f.id !== id);
        this._saveAll(tabType, list);
        return list;
    },

    // Renombrar un favorito
    rename: function (tabType, id, newName) {
        return this.update(tabType, id, { name: newName });
    }
};

// ============================================================================
// Función auxiliar para generar nombre de favorito basado en namespace
// ============================================================================

/**
 * Genera un nombre automático para un favorito basado en el namespace
 * (ruta de proyecto común) de los proyectos seleccionados.
 * Filtra proyectos intermedios (que son prefijo de otro proyecto más específico),
 * dejando solo los proyectos "hoja" para calcular el namespace.
 *
 * @param {Set<string>|Object} selectedProjects - Set de strings (Branches) u objeto {proyecto: bool} (Export)
 * @returns {string} - Nombre generado (namespace común o concatenación)
 */
DiscourseGraphToolkit.computeFavoriteName = function (selectedProjects) {
    // Obtener array de nombres de proyectos seleccionados
    let projects;
    if (selectedProjects instanceof Set) {
        projects = Array.from(selectedProjects).filter(p => p && p !== '(sin proyecto)');
    } else if (Array.isArray(selectedProjects)) {
        // Array: usar los valores directamente (ej: BranchesTab con Array.from(selectedProjects))
        projects = selectedProjects.filter(p => p && p !== '(sin proyecto)');
    } else if (selectedProjects && typeof selectedProjects === 'object') {
        // Objeto { proyecto: bool }: usar las keys con valor true (ej: ExportTab)
        projects = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
    } else {
        return 'favorito';
    }

    if (projects.length === 0) return 'favorito';
    if (projects.length === 1) return projects[0];

    // Filtrar solo proyectos "hoja": aquellos que NO son prefijo de otro proyecto
    // (ej: si hay "Filosofía" y "Filosofía/Ética", "Filosofía" es intermedio y se filtra)
    const leafProjects = projects.filter(p => {
        const prefix = p + '/';
        return !projects.some(other => other !== p && other.startsWith(prefix));
    });

    // Si después de filtrar solo queda 1, usarlo directamente
    if (leafProjects.length === 0) return projects.sort().join('|');
    if (leafProjects.length === 1) return leafProjects[0];

    // Calcular el prefijo de ruta común más largo (ancestro común / namespace)
    const splitPaths = leafProjects.map(p => p.split('/'));
    const minLength = Math.min(...splitPaths.map(p => p.length));

    let commonParts = [];
    for (let i = 0; i < minLength; i++) {
        const segment = splitPaths[0][i];
        if (splitPaths.every(path => path[i] === segment)) {
            commonParts.push(segment);
        } else {
            break;
        }
    }

    // Si hay ancestro común (namespace), usarlo; de lo contrario concatenar ordenado
    if (commonParts.length > 0) {
        return commonParts.join('/');
    } else {
        return leafProjects.sort().join('|');
    }
};
