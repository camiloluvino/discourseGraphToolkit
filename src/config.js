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
    GROUP_ORDER: "discourseGraphToolkit_group_order"
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


