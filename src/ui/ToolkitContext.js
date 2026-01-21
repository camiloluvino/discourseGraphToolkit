// ============================================================================
// UI: Toolkit Context
// Contexto React para compartir estado entre pestañas del modal
// Elimina el patrón de prop drilling
// ============================================================================

// Crear el contexto (se usa window.React porque Roam lo expone globalmente)
DiscourseGraphToolkit.ToolkitContext = window.React.createContext(null);

// Hook helper para consumir el contexto
DiscourseGraphToolkit.useToolkit = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ToolkitContext);
    if (!context) {
        throw new Error('useToolkit must be used within a ToolkitProvider');
    }
    return context;
};

