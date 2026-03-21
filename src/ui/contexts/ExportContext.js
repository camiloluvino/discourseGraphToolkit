// ============================================================================
// UI: Export Context
// Gestiona el estado de exportación
// ============================================================================

DiscourseGraphToolkit.ExportContext = window.React.createContext(null);

DiscourseGraphToolkit.ExportProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Exportación ---
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ GRI: true, QUE: true, CLM: true, EVD: true });
    const [contentConfig, setContentConfig] = React.useState({ GRI: true, QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [orderedQuestions, setOrderedQuestions] = React.useState([]);

    const value = React.useMemo(() => ({
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        orderedQuestions, setOrderedQuestions
    }), [selectedProjects, selectedTypes, contentConfig, excludeBitacora, isExporting, exportStatus, previewPages, orderedQuestions]);

    return React.createElement(DiscourseGraphToolkit.ExportContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useExport = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ExportContext);
    if (!context) {
        throw new Error('useExport must be used within an ExportProvider');
    }
    return context;
};
