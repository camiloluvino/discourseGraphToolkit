// ============================================================================
// UI: Projects Context
// Gestiona el estado de proyectos, configuración y templates
// ============================================================================

DiscourseGraphToolkit.ProjectsContext = window.React.createContext(null);

DiscourseGraphToolkit.ProjectsProvider = function ({ children }) {
    const React = window.React;

    // --- Estados de Configuración ---
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());

    // --- Estados de Proyectos ---
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');
    const [validation, setValidation] = React.useState({});
    const [suggestions, setSuggestions] = React.useState([]);
    const [isScanning, setIsScanning] = React.useState(false);
    const [selectedProjectsForDelete, setSelectedProjectsForDelete] = React.useState({});
    const [newProjectsAlert, setNewProjectsAlert] = React.useState([]);
    const [dismissedProjects, setDismissedProjects] = React.useState([]);

    // --- Inicialización ---
    React.useEffect(() => {
        const loadData = async () => {
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());
            setDismissedProjects(DiscourseGraphToolkit.getDismissedProjects());

            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }

            // Auto-descubrir proyectos nuevos en el grafo
            try {
                const discovered = await DiscourseGraphToolkit.discoverProjectsInGraph();
                const current = DiscourseGraphToolkit.getProjects();
                const dismissed = DiscourseGraphToolkit.getDismissedProjects();
                const newProjects = discovered.filter(p => !current.includes(p) && !dismissed.includes(p));
                if (newProjects.length > 0) {
                    setNewProjectsAlert(newProjects);
                }
            } catch (e) {
                console.warn('Error discovering projects:', e);
            }
        };
        loadData();
    }, []);

    const value = React.useMemo(() => ({
        config, setConfig,
        templates, setTemplates,
        projects, setProjects,
        newProject, setNewProject,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        newProjectsAlert, setNewProjectsAlert,
        dismissedProjects, setDismissedProjects
    }), [config, templates, projects, newProject, validation, suggestions, isScanning, selectedProjectsForDelete, newProjectsAlert, dismissedProjects]);

    return React.createElement(DiscourseGraphToolkit.ProjectsContext.Provider, { value }, children);
};

DiscourseGraphToolkit.useProjects = function () {
    const context = window.React.useContext(DiscourseGraphToolkit.ProjectsContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectsProvider');
    }
    return context;
};
