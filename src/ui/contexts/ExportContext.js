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
    const [skeletonMode, setSkeletonMode] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [compactIndentation, setCompactIndentation] = React.useState(false);
    const [groupNamespaces, setGroupNamespaces] = React.useState(false);

    const value = React.useMemo(() => ({
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        skeletonMode, setSkeletonMode,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        compactIndentation, setCompactIndentation,
        groupNamespaces, setGroupNamespaces
    }), [selectedProjects, selectedTypes, contentConfig, excludeBitacora, skeletonMode, isExporting, exportStatus, previewPages, compactIndentation, groupNamespaces]);

    return React.createElement(DiscourseGraphToolkit.ExportContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useExport = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ExportContext);
    if (!context) {
        throw new Error('useExport must be used within an ExportProvider');
    }
    return context;
};
