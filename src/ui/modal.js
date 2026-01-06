// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT) - Modal Principal
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose }) {
    const React = window.React;

    // --- Estados de Navegación ---
    const [activeTab, setActiveTab] = React.useState('proyectos');

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

    // --- Estados de Exportación ---
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: false, CLM: false, EVD: false });
    const [includeReferenced, setIncludeReferenced] = React.useState(false);
    const [contentConfig, setContentConfig] = React.useState({ QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [orderedQuestions, setOrderedQuestions] = React.useState([]);

    // --- Estados de Ramas (Verificación Bulk) ---
    const [bulkVerificationResults, setBulkVerificationResults] = React.useState([]);
    const [isBulkVerifying, setIsBulkVerifying] = React.useState(false);
    const [bulkVerifyStatus, setBulkVerifyStatus] = React.useState('');
    const [selectedBulkQuestion, setSelectedBulkQuestion] = React.useState(null);
    const [editableProject, setEditableProject] = React.useState('');
    const [isPropagating, setIsPropagating] = React.useState(false);

    // --- Inicialización ---
    React.useEffect(() => {
        const loadData = async () => {
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());

            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }

            // Auto-descubrir proyectos nuevos en el grafo
            try {
                const discovered = await DiscourseGraphToolkit.discoverProjectsInGraph();
                const current = DiscourseGraphToolkit.getProjects();
                const newProjects = discovered.filter(p => !current.includes(p));
                if (newProjects.length > 0) {
                    setNewProjectsAlert(newProjects);
                }
            } catch (e) {
                console.warn('Error discovering projects:', e);
            }

            const verificationCache = DiscourseGraphToolkit.getVerificationCache();
            if (verificationCache && verificationCache.results) {
                setBulkVerificationResults(verificationCache.results);
                setBulkVerifyStatus(verificationCache.status || '📋 Resultados cargados del cache.');
            }
        };
        loadData();
    }, []);

    // --- Helpers ---
    const tabStyle = (id) => ({
        padding: '0.625rem 1.25rem', cursor: 'pointer', borderBottom: activeTab === id ? '0.125rem solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    });

    // --- Render ---
    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }
    },
        React.createElement('div', {
            style: {
                backgroundColor: 'white', width: '90%', maxWidth: '90rem', height: '90vh', borderRadius: '0.5rem',
                display: 'flex', flexDirection: 'column', boxShadow: '0 0.25rem 0.75rem rgba(0,0,0,0.2)',
                fontSize: '0.875rem'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                React.createElement('button', { onClick: onClose, style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer' } }, '✕')
            ),
            // Tabs
            React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                ['proyectos', 'ramas', 'exportar', 'importar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) }, t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),

            // Alerta de proyectos nuevos descubiertos
            newProjectsAlert.length > 0 && React.createElement('div', {
                style: {
                    padding: '0.75rem 1.25rem',
                    backgroundColor: '#fff3e0',
                    borderBottom: '1px solid #ffcc80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }
            },
                React.createElement('span', { style: { fontWeight: 'bold', color: '#e65100' } },
                    `⚠️ ${newProjectsAlert.length} proyecto${newProjectsAlert.length > 1 ? 's' : ''} no registrado${newProjectsAlert.length > 1 ? 's' : ''}:`
                ),
                React.createElement('span', { style: { color: '#bf360c', fontSize: '0.8125rem' } },
                    newProjectsAlert.slice(0, 3).join(', ') + (newProjectsAlert.length > 3 ? ` (+${newProjectsAlert.length - 3} más)` : '')
                ),
                React.createElement('button', {
                    onClick: async () => {
                        const merged = [...new Set([...projects, ...newProjectsAlert])].sort();
                        DiscourseGraphToolkit.saveProjects(merged);
                        await DiscourseGraphToolkit.syncProjectsToRoam(merged);
                        setProjects(merged);
                        setNewProjectsAlert([]);
                    },
                    style: {
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        marginLeft: 'auto'
                    }
                }, '➕ Agregar todos'),
                React.createElement('button', {
                    onClick: () => setNewProjectsAlert([]),
                    style: {
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '1px solid #ccc',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                    }
                }, '✕')
            ),

            // Content
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 3.125rem 1.25rem', minHeight: 0 } },

                // Pestaña Proyectos
                activeTab === 'proyectos' && React.createElement(DiscourseGraphToolkit.ProjectsTab, {
                    projects: projects, setProjects: setProjects,
                    validation: validation, setValidation: setValidation,
                    suggestions: suggestions, setSuggestions: setSuggestions,
                    isScanning: isScanning, setIsScanning: setIsScanning,
                    selectedProjectsForDelete: selectedProjectsForDelete, setSelectedProjectsForDelete: setSelectedProjectsForDelete,
                    exportStatus: exportStatus, setExportStatus: setExportStatus,
                    config: config, setConfig: setConfig,
                    templates: templates, setTemplates: setTemplates,
                    newProject: newProject, setNewProject: setNewProject
                }),

                // Pestaña Ramas
                activeTab === 'ramas' && React.createElement(DiscourseGraphToolkit.BranchesTab, {
                    bulkVerificationResults: bulkVerificationResults, setBulkVerificationResults: setBulkVerificationResults,
                    isBulkVerifying: isBulkVerifying, setIsBulkVerifying: setIsBulkVerifying,
                    bulkVerifyStatus: bulkVerifyStatus, setBulkVerifyStatus: setBulkVerifyStatus,
                    selectedBulkQuestion: selectedBulkQuestion, setSelectedBulkQuestion: setSelectedBulkQuestion,
                    editableProject: editableProject, setEditableProject: setEditableProject,
                    isPropagating: isPropagating, setIsPropagating: setIsPropagating
                }),

                activeTab === 'exportar' && React.createElement(DiscourseGraphToolkit.ExportTab, {
                    projects: projects,
                    selectedProjects: selectedProjects, setSelectedProjects: setSelectedProjects,
                    selectedTypes: selectedTypes, setSelectedTypes: setSelectedTypes,
                    includeReferenced: includeReferenced, setIncludeReferenced: setIncludeReferenced,
                    contentConfig: contentConfig, setContentConfig: setContentConfig,
                    excludeBitacora: excludeBitacora, setExcludeBitacora: setExcludeBitacora,
                    isExporting: isExporting, setIsExporting: setIsExporting,
                    exportStatus: exportStatus, setExportStatus: setExportStatus,
                    previewPages: previewPages, setPreviewPages: setPreviewPages,
                    orderedQuestions: orderedQuestions, setOrderedQuestions: setOrderedQuestions
                }),

                // Pestaña Importar
                activeTab === 'importar' && React.createElement(DiscourseGraphToolkit.ImportTab, {
                    exportStatus: exportStatus, setExportStatus: setExportStatus
                })
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    const previousActiveElement = document.activeElement;

    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        ReactDOM.unmountComponentAtNode(existing);
        existing.remove();
    }

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
            if (div.parentNode) div.parentNode.removeChild(div);

            setTimeout(() => {
                if (previousActiveElement && document.body.contains(previousActiveElement)) {
                    previousActiveElement.focus();
                } else {
                    const article = document.querySelector('.roam-article') ||
                        document.querySelector('.rm-article-wrapper') ||
                        document.querySelector('.roam-body-main');

                    if (article) {
                        article.focus();
                        article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                        article.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                        article.click();
                    } else {
                        window.focus();
                    }
                }
            }, 100);
        } catch (e) {
            console.error("Error closing modal:", e);
        }
    };

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close }), div);
};
