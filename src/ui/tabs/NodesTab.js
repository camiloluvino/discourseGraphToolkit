// ============================================================================
// UI: Nodes Tab Component
// ============================================================================

DiscourseGraphToolkit.NodesTab = function () {
    const React = window.React;
    const {
        orphanResults, setOrphanResults,
        isSearchingOrphans, setIsSearchingOrphans
    } = DiscourseGraphToolkit.useToolkit();

    // --- Helpers (shared) ---
    const parseMarkdownBold = DiscourseGraphToolkit.parseMarkdownBold;
    const handleNavigateToPage = DiscourseGraphToolkit.navigateToPage;

    // --- Handlers ---
    const handleFindOrphans = async () => {
        setIsSearchingOrphans(true);
        try {
            const orphans = await DiscourseGraphToolkit.findOrphanNodes();
            setOrphanResults(orphans);
            DiscourseGraphToolkit.showToast(`Encontrados ${orphans.length} huérfanos.`, 'success');
        } catch (e) {
            console.error('Orphan search error:', e);
            DiscourseGraphToolkit.showToast('Error al buscar huérfanos: ' + e.message, 'error');
        } finally {
            setIsSearchingOrphans(false);
        }
    };

    // --- Render ---
    return React.createElement('div', { className: 'dgt-container' },
        // Header
        React.createElement('div', {
            className: 'dgt-flex-between dgt-flex-wrap dgt-gap-md dgt-mb-sm',
            style: { alignItems: 'flex-start' }
        },
            // Left side: Title and search button
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-sm' },
                React.createElement('h3', { className: 'dgt-mb-0', style: { fontSize: '1.125rem' } }, 'Nodos Huérfanos'),
                React.createElement('div', { className: 'dgt-text-secondary dgt-text-sm dgt-mb-xs' },
                    'Nodos (GRI, QUE, CLM, EVD) que no pertenecen a ningún proyecto y no están conectados a otros nodos.'
                ),
                React.createElement('button', {
                    onClick: handleFindOrphans,
                    title: 'Buscar ramas o nodos que no tienen un proyecto asignado ni conexiones',
                    disabled: isSearchingOrphans,
                    className: 'dgt-btn dgt-btn-primary'
                }, isSearchingOrphans ? '⏳ Buscando...' : '👻 Buscar Huérfanos')
            ),

            // Right side: Counter badge
            orphanResults.length > 0 &&
            React.createElement('div', { className: 'dgt-flex-column dgt-gap-xs', style: { alignItems: 'flex-end' } },
                React.createElement('span', { className: 'dgt-badge dgt-badge-warning', style: { fontSize: '0.875rem' } },
                    `👻 ${orphanResults.length} Encontrados`
                )
            )
        ),

        // Result List Content
        orphanResults.length > 0 ? (
            React.createElement('div', { className: 'dgt-card', style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none', background: 'transparent' } },
                React.createElement('div', { className: 'dgt-list-container dgt-scrollable dgt-p-sm', style: { flex: 1, maxHeight: 'none', border: '1px solid var(--dgt-border-color)' } },
                    orphanResults.map(node =>
                        React.createElement('div', { key: node.uid, className: 'dgt-popover-item', style: { padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--dgt-border-color)', borderRadius: 'var(--dgt-radius-md)', background: '#fff' } },
                            React.createElement('span', { className: 'dgt-text-warning dgt-text-sm', style: { fontSize: '1.25rem', flexShrink: 0 } }, '👻'),
                            React.createElement('div', { style: { flex: 1, lineHeight: '1.5', padding: '0 0.5rem' } },
                                React.createElement('span', { className: 'dgt-badge dgt-badge-neutral dgt-mr-xs' }, node.type),
                                React.createElement('div', { className: 'dgt-text-sm dgt-text-primary dgt-text-bold', style: { fontSize: '0.9375rem', marginBottom: '4px' } }, parseMarkdownBold((node.title || '').replace(/\[\[(GRI|CLM|EVD|QUE)\]\] - /, '').replace(/\[\[(.*?)\]\]/g, '$1'))),
                                React.createElement('div', { className: 'dgt-text-secondary', style: { fontSize: '0.75rem', opacity: 0.8 } },
                                    `Referencias de Discourse: ${node.refCount || 0}`
                                )
                            ),
                            React.createElement('button', {
                                onClick: () => handleNavigateToPage(node.uid),
                                className: 'dgt-btn dgt-btn-primary dgt-text-xs', style: { padding: '6px 12px', flexShrink: 0 }
                            }, '→ Ir al Nodo')
                        )
                    )
                )
            )
        ) : (
            !isSearchingOrphans && orphanResults.length === 0 && React.createElement('div', { className: 'dgt-flex-column', style: { alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--dgt-text-muted)' } },
                React.createElement('span', { style: { fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 } }, '📝'),
                React.createElement('p', null, 'Haz clic en "Buscar Huérfanos" para analizar el grafo.')
            )
        )
    );
};
