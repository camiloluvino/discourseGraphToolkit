// ============================================================================
// UI: Navigation Context
// Gestiona el estado de navegación entre pestañas
// ============================================================================

DiscourseGraphToolkit.NavContext = window.React.createContext(null);

DiscourseGraphToolkit.NavProvider = function ({ children }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('proyectos');

    const value = React.useMemo(() => ({
        activeTab, setActiveTab
    }), [activeTab]);

    return React.createElement(DiscourseGraphToolkit.NavContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useNav = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.NavContext);
    if (!context) {
        throw new Error('useNav must be used within a NavProvider');
    }
    return context;
};
