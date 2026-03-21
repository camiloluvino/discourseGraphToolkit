// ============================================================================
// UI: Panoramic Context
// Gestiona el estado de la vista panorámica
// ============================================================================

DiscourseGraphToolkit.PanoramicContext = window.React.createContext(null);

DiscourseGraphToolkit.PanoramicProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Panorámica ---
    const [panoramicData, setPanoramicData] = React.useState(null);
    const [panoramicExpandedQuestions, setPanoramicExpandedQuestions] = React.useState(DiscourseGraphToolkit.loadPanoramicExpandedQuestions());
    const [panoramicLoadStatus, setPanoramicLoadStatus] = React.useState('');
    const [panoramicSelectedProject, setPanoramicSelectedProject] = React.useState('');

    const value = React.useMemo(() => ({
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions, setPanoramicExpandedQuestions,
        panoramicLoadStatus, setPanoramicLoadStatus,
        panoramicSelectedProject, setPanoramicSelectedProject
    }), [panoramicData, panoramicExpandedQuestions, panoramicLoadStatus, panoramicSelectedProject]);

    return React.createElement(DiscourseGraphToolkit.PanoramicContext.Provider, { value }, children);
};

DiscourseGraphToolkit.usePanoramic = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.PanoramicContext);
    if (!context) {
        throw new Error('usePanoramic must be used within a PanoramicProvider');
    }
    return context;
};
