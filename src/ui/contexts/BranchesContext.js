// ============================================================================
// UI: Branches Context
// Gestiona el estado de verificación de ramas/coherencia
// ============================================================================

DiscourseGraphToolkit.BranchesContext = window.React.createContext(null);

DiscourseGraphToolkit.BranchesProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Ramas (Verificación Bulk) ---
    const [bulkVerificationResults, setBulkVerificationResults] = React.useState([]);
    const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);
    const [bulkVerifyStatus, setBulkVerifyStatus] = React.useState('');
    const [selectedBulkQuestion, setSelectedBulkQuestion] = React.useState(null);
    const [editableProject, setEditableProject] = React.useState('');
    const [isPropagating, setIsPropagating] = React.useState(false);
    
    // --- Nuevos Estados para Mejoras ---
    const [selectedProjects, setSelectedProjects] = React.useState(new Set());
    const [verificationProgress, setVerificationProgress] = React.useState({ current: 0, total: 0, currentQuestion: '' });

    // --- Restaurar cache de verificación al montar ---
    React.useEffect(() => {
        const verificationCache = DiscourseGraphToolkit.getVerificationCache();
        if (verificationCache && verificationCache.results) {
            setBulkVerificationResults(verificationCache.results);
            setBulkVerifyStatus(verificationCache.status || '📋 Resultados cargados del cache.');
        }
        
        // Inicializar proyectos seleccionados con todos los disponibles
        const allProjects = DiscourseGraphToolkit.getProjects();
        setSelectedProjects(new Set(['(sin proyecto)', ...allProjects]));
    }, []);

    const value = React.useMemo(() => ({
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        selectedProjects, setSelectedProjects,
        verificationProgress, setVerificationProgress
    }), [bulkVerificationResults, isBulkVerifying, bulkVerifyStatus, selectedBulkQuestion, editableProject, isPropagating, selectedProjects, verificationProgress]);

    return React.createElement(DiscourseGraphToolkit.BranchesContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useBranches = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.BranchesContext);
    if (!context) {
        throw new Error('useBranches must be used within a BranchesProvider');
    }
    return context;
};
