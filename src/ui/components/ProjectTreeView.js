// ============================================================================
// UI: ProjectTreeView Component
// Componente reutilizable para renderizar árboles jerárquicos de proyectos
// Usado por BranchesTab y ExportTab
// ============================================================================

DiscourseGraphToolkit.ProjectTreeView = function (props) {
    const React = window.React;
    const {
        tree,                    // Objeto { [key]: { project, children, ... } }
        renderNodeHeader,        // (node, key, depth, isExpanded, toggleFn) => React.Element
        renderNodeContent,       // (node, depth) => React.Element | null
        defaultExpanded = true   // Si los nodos inician expandidos
    } = props;

    // --- Estado de nodos expandidos ---
    const [expandedNodes, setExpandedNodes] = React.useState({});

    // --- Toggle expand/collapse ---
    const toggleExpand = (nodePath) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodePath]: prev[nodePath] === undefined ? !defaultExpanded : !prev[nodePath]
        }));
    };

    // --- Determinar si un nodo está expandido ---
    const isNodeExpanded = (nodePath) => {
        return expandedNodes[nodePath] === undefined ? defaultExpanded : expandedNodes[nodePath];
    };

    // --- Render recursivo de nodo ---
    const renderNode = (node, key, depth) => {
        const isExpanded = isNodeExpanded(node.project);
        const hasChildren = Object.keys(node.children || {}).length > 0;

        return React.createElement('div', {
            key: key,
            style: { marginLeft: depth > 0 ? '1rem' : 0 }
        },
            // Header del nodo (personalizado por el tab)
            renderNodeHeader(node, key, depth, isExpanded, () => toggleExpand(node.project)),

            // Contenido cuando está expandido
            isExpanded && React.createElement('div', null,
                // Contenido específico del nodo (preguntas, etc.)
                renderNodeContent && renderNodeContent(node, depth),
                // Hijos recursivos
                hasChildren && Object.keys(node.children).sort().map(childKey =>
                    renderNode(node.children[childKey], childKey, depth + 1)
                )
            )
        );
    };

    // --- Render principal ---
    return React.createElement('div', null,
        Object.keys(tree).sort().map(projectKey =>
            renderNode(tree[projectKey], projectKey, 0)
        )
    );
};

