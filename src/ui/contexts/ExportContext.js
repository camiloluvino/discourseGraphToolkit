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
    const [includeProjectMetadata, setIncludeProjectMetadata] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [groupNamespaces, setGroupNamespaces] = React.useState(false);
    const [hideNodeLabels, setHideNodeLabels] = React.useState(false);
    const [useAcademicNumbering, setUseAcademicNumbering] = React.useState(false);

    const value = React.useMemo(() => ({
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        skeletonMode, setSkeletonMode,
        includeProjectMetadata, setIncludeProjectMetadata,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        groupNamespaces, setGroupNamespaces,
        hideNodeLabels, setHideNodeLabels,
        useAcademicNumbering, setUseAcademicNumbering
    }), [selectedProjects, selectedTypes, contentConfig, excludeBitacora, skeletonMode, includeProjectMetadata, isExporting, exportStatus, previewPages, groupNamespaces, hideNodeLabels, useAcademicNumbering]);

    return React.createElement(DiscourseGraphToolkit.ExportContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useExport = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ExportContext);
    if (!context) {
        throw new Error('useExport must be used within an ExportProvider');
    }
    return context;
};
