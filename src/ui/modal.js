// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT) - Modal Principal
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose, onMinimize }) {
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

    // --- Estados de Panorámica (persisten entre cambios de pestaña) ---
    const [panoramicData, setPanoramicData] = React.useState(null);
    const [panoramicExpandedQuestions, setPanoramicExpandedQuestions] = React.useState({});
    const [panoramicLoadStatus, setPanoramicLoadStatus] = React.useState('');
    const [panoramicSelectedProject, setPanoramicSelectedProject] = React.useState('');

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

    // --- Context Value (estado compartido entre pestañas) ---
    const contextValue = {
        // Navegación
        activeTab, setActiveTab,
        // Configuración
        config, setConfig,
        templates, setTemplates,
        // Proyectos
        projects, setProjects,
        newProject, setNewProject,
        validation, setValidation,
        suggestions, setSuggestions,
        isScanning, setIsScanning,
        selectedProjectsForDelete, setSelectedProjectsForDelete,
        newProjectsAlert, setNewProjectsAlert,
        // Exportación
        selectedProjects, setSelectedProjects,
        selectedTypes, setSelectedTypes,
        contentConfig, setContentConfig,
        excludeBitacora, setExcludeBitacora,
        isExporting, setIsExporting,
        exportStatus, setExportStatus,
        previewPages, setPreviewPages,
        orderedQuestions, setOrderedQuestions,
        // Ramas
        bulkVerificationResults, setBulkVerificationResults,
        isBulkVerifying, setIsBulkVerifying,
        bulkVerifyStatus, setBulkVerifyStatus,
        selectedBulkQuestion, setSelectedBulkQuestion,
        editableProject, setEditableProject,
        isPropagating, setIsPropagating,
        // Panorámica
        panoramicData, setPanoramicData,
        panoramicExpandedQuestions, setPanoramicExpandedQuestions,
        panoramicLoadStatus, setPanoramicLoadStatus,
        panoramicSelectedProject, setPanoramicSelectedProject
    };

    // --- Render ---
    return React.createElement(DiscourseGraphToolkit.ToolkitContext.Provider, { value: contextValue },
        React.createElement('div', {
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
                    React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                        // Botón Minimizar
                        React.createElement('button', {
                            onClick: onMinimize,
                            title: 'Minimizar (mantiene estado)',
                            style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                        }, '➖'),
                        // Botón Cerrar
                        React.createElement('button', {
                            onClick: onClose,
                            title: 'Cerrar (resetea estado)',
                            style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                        }, '✕')
                    )
                ),
                // Tabs
                React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                    ['proyectos', 'ramas', 'panoramica', 'exportar', 'importar'].map(t =>
                        React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) },
                            t === 'panoramica' ? 'Panorámica' : t.charAt(0).toUpperCase() + t.slice(1))
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
                    activeTab === 'proyectos' && React.createElement(DiscourseGraphToolkit.ProjectsTab),

                    // Pestaña Ramas
                    activeTab === 'ramas' && React.createElement(DiscourseGraphToolkit.BranchesTab),

                    // Pestaña Panorámica
                    activeTab === 'panoramica' && React.createElement(DiscourseGraphToolkit.PanoramicTab),

                    // Pestaña Exportar
                    activeTab === 'exportar' && React.createElement(DiscourseGraphToolkit.ExportTab),

                    // Pestaña Importar
                    activeTab === 'importar' && React.createElement(DiscourseGraphToolkit.ImportTab)
                )
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    const floatingBtn = document.getElementById('discourse-graph-toolkit-floating-btn');

    // Si existe un modal minimizado, simplemente mostrarlo y ocultar el botón flotante
    if (existing && existing.style.display === 'none') {
        existing.style.display = 'block';
        if (floatingBtn) floatingBtn.style.display = 'none';
        return;
    }

    // Si existe y está visible, no hacer nada
    if (existing) {
        return;
    }

    const previousActiveElement = document.activeElement;

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    // Crear botón flotante (inicialmente oculto)
    let floatingButton = document.getElementById('discourse-graph-toolkit-floating-btn');
    if (!floatingButton) {
        floatingButton = document.createElement('div');
        floatingButton.id = 'discourse-graph-toolkit-floating-btn';
        floatingButton.innerHTML = '📊';
        floatingButton.title = 'Restaurar Discourse Graph Toolkit';
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #2196F3, #1976D2);
            border-radius: 50%;
            display: none;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
            z-index: 9998;
            transition: transform 0.2s, box-shadow 0.2s;
            user-select: none;
        `;
        floatingButton.onmouseenter = () => {
            floatingButton.style.transform = 'scale(1.1)';
            floatingButton.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.5)';
        };
        floatingButton.onmouseleave = () => {
            floatingButton.style.transform = 'scale(1)';
            floatingButton.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
        };
        floatingButton.onclick = () => {
            DiscourseGraphToolkit.openModal();
        };
        document.body.appendChild(floatingButton);
    }

    // Función para minimizar (oculta pero mantiene estado + muestra botón flotante)
    const minimize = () => {
        div.style.display = 'none';
        // Mostrar botón flotante
        const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
        if (btn) btn.style.display = 'flex';
        // Restaurar foco a Roam
        setTimeout(() => {
            const article = document.querySelector('.roam-article') ||
                document.querySelector('.rm-article-wrapper') ||
                document.querySelector('.roam-body-main');
            if (article) {
                article.focus();
                article.click();
            }
        }, 50);
    };

    // Función para cerrar (destruye el componente + oculta botón flotante)
    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
            if (div.parentNode) div.parentNode.removeChild(div);
            // Ocultar botón flotante
            const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
            if (btn) btn.style.display = 'none';

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

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close, onMinimize: minimize }), div);
};

// Función auxiliar para minimizar desde cualquier parte del código
DiscourseGraphToolkit.minimizeModal = function () {
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        existing.style.display = 'none';
        // Mostrar botón flotante
        const btn = document.getElementById('discourse-graph-toolkit-floating-btn');
        if (btn) btn.style.display = 'flex';
        // Restaurar foco a Roam
        const article = document.querySelector('.roam-article') ||
            document.querySelector('.rm-article-wrapper') ||
            document.querySelector('.roam-body-main');
        if (article) {
            article.focus();
            article.click();
        }
    }
};
