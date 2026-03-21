// ============================================================================
// UI: Modal Principal
// ============================================================================

// Componente inner que usa los contextos (debe estar DENTRO de los Providers)
DiscourseGraphToolkit._ModalInner = function ({ onClose, onMinimize }) {
    const React = window.React;
    const { activeTab, setActiveTab } = DiscourseGraphToolkit.useNav();
    const { projects, setProjects, newProjectsAlert, setNewProjectsAlert } = DiscourseGraphToolkit.useProjects();

    // --- Helpers ---
    const tabStyle = React.useCallback((id) => ({
        padding: '0.625rem 1.25rem', cursor: 'pointer', borderBottom: activeTab === id ? '0.125rem solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    }), [activeTab]);

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
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                    // Botón Minimizar
                    React.createElement('button', {
                        onClick: onMinimize,
                        title: 'Minimizar (mantiene estado)',
                        style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                    }, '-'),
                    // Botón Cerrar
                    React.createElement('button', {
                        onClick: onClose,
                        title: 'Cerrar (resetea estado)',
                        style: { border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
                    }, 'X')
                )
            ),
            React.createElement('div', { style: { display: 'flex', borderBottom: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.border || '#eee'}` } },
                ['proyectos', 'ramas', 'nodos', 'panoramica', 'exportar', 'importar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) },
                        t === 'panoramica' ? 'Panorámica' : t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),

            // Alerta de proyectos nuevos descubiertos
            newProjectsAlert.length > 0 && React.createElement('div', {
                style: {
                    padding: '0.75rem 1.25rem',
                    backgroundColor: '#fff3e0', // Soft warning
                    borderBottom: '1px solid #ffcc80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }
            },
                React.createElement('span', { style: { fontWeight: 'bold', color: DiscourseGraphToolkit.THEME?.colors?.warning || '#f59e0b' } },
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
                        backgroundColor: DiscourseGraphToolkit.THEME?.colors?.success || '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        marginLeft: 'auto'
                    }
                }, 'Agregar todos'),
                React.createElement('button', {
                    onClick: () => setNewProjectsAlert([]),
                    style: {
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        color: DiscourseGraphToolkit.THEME?.colors?.neutral || '#6b7280',
                        border: `1px solid ${DiscourseGraphToolkit.THEME?.colors?.border || '#ccc'}`,
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                    }
                }, 'X')
            ),

            // Content
            React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.25rem 3.125rem 1.25rem', minHeight: 0 } },

                // Pestaña Proyectos
                activeTab === 'proyectos' && React.createElement(DiscourseGraphToolkit.ProjectsTab),

                // Pestaña Ramas
                activeTab === 'ramas' && React.createElement(DiscourseGraphToolkit.BranchesTab),

                // Pestaña Nodos
                activeTab === 'nodos' && React.createElement(DiscourseGraphToolkit.NodesTab),

                // Pestaña Panorámica
                activeTab === 'panoramica' && React.createElement(DiscourseGraphToolkit.PanoramicTab),

                // Pestaña Exportar
                activeTab === 'exportar' && React.createElement(DiscourseGraphToolkit.ExportTab),

                // Pestaña Importar
                activeTab === 'importar' && React.createElement(DiscourseGraphToolkit.ImportTab)
            )
        )
    );
};

// Componente raíz que envuelve todo en los Providers
DiscourseGraphToolkit.ToolkitModal = function ({ onClose, onMinimize }) {
    const React = window.React;

    // Los Providers se anidan aquí para que el estado persista mientras el modal esté abierto.
    // Cada Provider gestiona su propio dominio de estado independientemente.
    return React.createElement(DiscourseGraphToolkit.NavProvider, null,
        React.createElement(DiscourseGraphToolkit.ProjectsProvider, null,
            React.createElement(DiscourseGraphToolkit.BranchesProvider, null,
                React.createElement(DiscourseGraphToolkit.ExportProvider, null,
                    React.createElement(DiscourseGraphToolkit.PanoramicProvider, null,
                        React.createElement(DiscourseGraphToolkit._ModalInner, { onClose, onMinimize })
                    )
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
        floatingButton.innerHTML = 'Discourse Graph';
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
