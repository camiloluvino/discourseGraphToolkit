// ============================================================================
// UI: Base Styles (Claude-Inspired Minimalism)
// ============================================================================

DiscourseGraphToolkit.injectBaseStyles = function () {
    const styleId = 'dgt-base-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        :root {
            /* Color palette - Claude-inspired Minimalist */
            --dgt-bg-primary: #fbfaf8;
            --dgt-bg-secondary: #f3f1eb;
            --dgt-bg-tertiary: #ebe8e0;
            --dgt-border-color: #e5e3dc;
            --dgt-border-focus: #b5b3ad;

            /* Text colors */
            --dgt-text-primary: #2d2c2b;
            --dgt-text-secondary: #6b6a68;
            --dgt-text-muted: #999793;

            /* Accent colors */
            --dgt-accent-blue: #000000;
            --dgt-accent-green: #377d61;
            --dgt-accent-red: #bb4f43;
            --dgt-accent-yellow: #a87e27;
            --dgt-accent-purple: #6c5c99;

            /* Shadows */
            --dgt-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.02);
            --dgt-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.04);
            --dgt-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.06);

            /* Spacing */
            --dgt-spacing-xs: 6px;
            --dgt-spacing-sm: 12px;
            --dgt-spacing-md: 20px;
            --dgt-spacing-lg: 32px;

            /* Border radius */
            --dgt-radius-sm: 6px;
            --dgt-radius-md: 8px;
            --dgt-radius-lg: 12px;

            /* Transitions */
            --dgt-transition-fast: 150ms ease;
            --dgt-transition-normal: 250ms ease;
        }

        /* Modal Container Override */
        #discourse-graph-toolkit-modal > div > div {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: var(--dgt-bg-primary) !important;
            color: var(--dgt-text-primary) !important;
            box-shadow: var(--dgt-shadow-lg) !important;
            border: 1px solid var(--dgt-border-color) !important;
        }

        #discourse-graph-toolkit-modal h2, 
        #discourse-graph-toolkit-modal h3, 
        #discourse-graph-toolkit-modal h4 {
            font-family: 'Lora', 'Georgia', serif !important;
            font-weight: 500 !important;
            color: var(--dgt-text-primary) !important;
        }

        /* Buttons */
        .dgt-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--dgt-spacing-sm);
            padding: 8px 16px;
            font-size: 0.8125rem;
            font-weight: 500;
            border: 1px solid transparent;
            border-radius: var(--dgt-radius-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            font-family: inherit;
        }
        .dgt-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .dgt-btn-primary {
            background: var(--dgt-accent-blue);
            color: white;
        }
        .dgt-btn-primary:hover:not(:disabled) {
            background: #2d2c2b;
        }
        .dgt-btn-secondary {
            background: transparent;
            color: var(--dgt-text-primary);
            border: 1px solid var(--dgt-border-color);
        }
        .dgt-btn-secondary:hover:not(:disabled) {
            background: var(--dgt-bg-secondary);
        }
        .dgt-btn-ghost {
            background: transparent;
            color: var(--dgt-text-secondary);
            padding: var(--dgt-spacing-xs) var(--dgt-spacing-sm);
        }
        .dgt-btn-ghost:hover:not(:disabled) {
            color: var(--dgt-text-primary);
            background: var(--dgt-bg-secondary);
        }

        /* Badges */
        .dgt-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            border-radius: 12px;
            border: 1px solid transparent;
            cursor: default;
        }
        .dgt-badge.clickable { cursor: pointer; }
        .dgt-badge.active { border-color: currentColor; }
        
        .dgt-badge-success {
            background: rgba(55, 125, 97, 0.1);
            color: var(--dgt-accent-green);
        }
        .dgt-badge-error {
            background: rgba(187, 79, 67, 0.1);
            color: var(--dgt-accent-red);
        }
        .dgt-badge-warning {
            background: rgba(168, 126, 39, 0.1);
            color: var(--dgt-accent-yellow);
        }
        .dgt-badge-info {
            background: rgba(108, 92, 153, 0.1);
            color: var(--dgt-accent-purple);
        }
        .dgt-badge-neutral {
            background: var(--dgt-bg-tertiary);
            color: var(--dgt-text-secondary);
            border-color: var(--dgt-border-color);
        }

        /* Accordion / Hierarchy Lists */
        .dgt-accordion-item {
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
            overflow: hidden;
        }
        .dgt-accordion-header {
            padding: 10px 14px;
            background: transparent;
            border-bottom: 1px solid var(--dgt-border-color);
            display: flex;
            align-items: center;
            gap: var(--dgt-spacing-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
        }
        .dgt-accordion-header:hover {
            background: var(--dgt-bg-secondary);
        }
        .dgt-accordion-header.depth-0 {
            background: var(--dgt-bg-primary);
            font-weight: 600;
        }
        .dgt-accordion-header.depth-1, .dgt-accordion-header.depth-odd {
            background: #ffffff;
        }
        .dgt-accordion-header.depth-even {
            background: var(--dgt-bg-primary);
        }

        /* Popovers */
        .dgt-popover {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: var(--dgt-spacing-sm);
            background: #ffffff;
            border-radius: var(--dgt-radius-md);
            box-shadow: var(--dgt-shadow-lg);
            border: 1px solid var(--dgt-border-color);
            z-index: 1000;
            min-width: 20rem;
            max-width: 32rem;
            max-height: 24rem;
            overflow-y: auto;
        }
        .dgt-popover-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--dgt-border-color);
            font-weight: 600;
            font-size: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: #ffffff;
            z-index: 10;
        }
        .dgt-popover-item {
            padding: 10px 12px;
            border-bottom: 1px solid var(--dgt-border-color);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.75rem;
            color: var(--dgt-text-primary);
        }
        .dgt-popover-item:last-child { border-bottom: none; }
        .dgt-popover-item:hover { background: var(--dgt-bg-secondary); }

        /* Forms */
        .dgt-input {
            width: 100%;
            padding: 6px 12px;
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            color: var(--dgt-text-primary);
            font-size: 0.8125rem;
            transition: var(--dgt-transition-fast);
            font-family: inherit;
        }
        .dgt-input:focus {
            outline: none;
            border-color: var(--dgt-border-focus);
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
        }

        /* General Layout */
        .dgt-container { display: flex; flex-direction: column; height: 100%; }

        /* Utility Classes - Layout */
        .dgt-flex-row { display: flex; align-items: center; }
        .dgt-flex-column { display: flex; flex-direction: column; }
        .dgt-flex-between { display: flex; align-items: center; justify-content: space-between; }
        .dgt-flex-wrap { flex-wrap: wrap; }
        .dgt-gap-xs { gap: var(--dgt-spacing-xs); }
        .dgt-gap-sm { gap: var(--dgt-spacing-sm); }
        .dgt-gap-md { gap: var(--dgt-spacing-md); }
        .dgt-gap-lg { gap: var(--dgt-spacing-lg); }

        /* Utility Classes - Spacing */
        .dgt-mb-0 { margin-bottom: 0 !important; }
        .dgt-mb-sm { margin-bottom: var(--dgt-spacing-sm); }
        .dgt-mb-md { margin-bottom: var(--dgt-spacing-md); }
        .dgt-mb-lg { margin-bottom: var(--dgt-spacing-lg); }
        .dgt-mt-sm { margin-top: var(--dgt-spacing-sm); }
        .dgt-mr-xs { margin-right: var(--dgt-spacing-xs); }
        .dgt-p-sm { padding: var(--dgt-spacing-sm); }
        .dgt-p-md { padding: var(--dgt-spacing-md); }

        /* Utility Classes - Typography */
        .dgt-text-sm { font-size: 0.8125rem; }
        .dgt-text-xs { font-size: 0.75rem; }
        .dgt-text-primary { color: var(--dgt-text-primary); }
        .dgt-text-secondary { color: var(--dgt-text-secondary); }
        .dgt-text-muted { color: var(--dgt-text-muted); }
        .dgt-text-success { color: var(--dgt-accent-green); }
        .dgt-text-error { color: var(--dgt-accent-red); }
        .dgt-text-warning { color: var(--dgt-accent-yellow); }
        .dgt-text-bold { font-weight: 600; }
        .dgt-text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Tree View Container */
        .dgt-tree-container {
            height: 100%;
            max-height: 28rem;
            overflow-y: auto;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            background-color: var(--dgt-bg-primary);
        }

        /* Tree Depth Guide Lines */
        .dgt-tree-guide {
            border-left: 2px solid var(--dgt-border-color);
            margin-left: 0.5rem;
            padding-left: 0.5rem;
        }

        /* Summary Bar */
        .dgt-summary-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: var(--dgt-spacing-sm);
            padding: 8px 14px;
            background: var(--dgt-bg-secondary);
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
        }

        /* Form Layout */
        .dgt-form-group {
            display: flex;
            gap: var(--dgt-spacing-sm);
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: var(--dgt-spacing-sm);
        }
        .dgt-form-label {
            font-weight: 600;
            font-size: 0.8125rem;
            color: var(--dgt-text-primary);
            white-space: nowrap;
        }

        /* Panels / Cards */
        .dgt-panel {
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            padding: 12px;
            background: #ffffff;
        }
        .dgt-panel-header {
            margin: 0 0 12px 0;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--dgt-text-primary);
        }

        .dgt-card {
            background: #ffffff;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-md);
            margin-bottom: var(--dgt-spacing-sm);
            box-shadow: var(--dgt-shadow-sm);
            transition: var(--dgt-transition-fast);
        }
        .dgt-card:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
        }
        .dgt-card-body {
            padding: var(--dgt-spacing-sm) var(--dgt-spacing-md);
        }

        .dgt-list-container {
            max-height: 40rem;
            overflow-y: auto;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            background-color: #ffffff;
        }

        /* Panoramic Specific Utilities */
        .dgt-panoramic-root {
            border-left: 3px solid var(--dgt-border-color);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
            background-color: var(--dgt-bg-primary);
            transition: var(--dgt-transition-fast);
            margin-bottom: var(--dgt-spacing-sm);
            padding-left: var(--dgt-spacing-sm);
        }
        .dgt-panoramic-root:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
            background-color: #ffffff;
        }
        .dgt-panoramic-root-que { border-left-color: var(--dgt-accent-blue); }
        .dgt-panoramic-root-gri { border-left-color: var(--dgt-accent-purple); }
        
        .dgt-panoramic-node-row {
            display: flex;
            align-items: flex-start;
            padding: 4px;
            margin-left: -4px;
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            border-radius: var(--dgt-radius-sm);
            line-height: 1.4;
        }
        .dgt-panoramic-node-row.has-children:hover {
            background-color: var(--dgt-bg-secondary);
        }
        
        .dgt-panoramic-branch-line {
            border-left: 1px solid var(--dgt-border-color);
            margin-left: 1rem;
            padding-left: 0.5rem;
            padding-top: 0.125rem;
        }

        /* Panoramic Sub-Project Group */
        .dgt-panoramic-group {
            border: 1px solid var(--dgt-border-color);
            border-left: 3px solid var(--dgt-accent-purple);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
            background-color: var(--dgt-bg-primary);
            transition: var(--dgt-transition-fast);
            margin-bottom: var(--dgt-spacing-sm);
        }
        .dgt-panoramic-group:hover {
            box-shadow: var(--dgt-shadow-md);
            border-color: var(--dgt-border-focus);
            border-left-color: var(--dgt-accent-purple);
        }
        .dgt-panoramic-group-header {
            display: flex;
            align-items: center;
            padding: 8px 10px;
            cursor: pointer;
            gap: 8px;
            transition: var(--dgt-transition-fast);
            border-radius: 0 var(--dgt-radius-sm) var(--dgt-radius-sm) 0;
        }
        .dgt-panoramic-group-header:hover {
            background-color: var(--dgt-bg-secondary);
        }
        .dgt-panoramic-group-body {
            border-top: 1px solid var(--dgt-border-color);
            padding: 4px 8px 8px 8px;
            background: #ffffff;
        }
        .dgt-panoramic-group-nav {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 6px;
            font-size: 0.6875rem;
            color: var(--dgt-text-muted);
            background: transparent;
            border: 1px solid var(--dgt-border-color);
            border-radius: var(--dgt-radius-sm);
            cursor: pointer;
            transition: var(--dgt-transition-fast);
            flex-shrink: 0;
        }
        .dgt-panoramic-group-nav:hover {
            color: var(--dgt-text-primary);
            background: var(--dgt-bg-secondary);
            border-color: var(--dgt-border-focus);
        }

        /* Scrollbars */
        .dgt-scrollable::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .dgt-scrollable::-webkit-scrollbar-track {
            background: transparent;
        }
        .dgt-scrollable::-webkit-scrollbar-thumb {
            background: var(--dgt-border-color);
            border-radius: 4px;
        }
        .dgt-scrollable::-webkit-scrollbar-thumb:hover {
            background: var(--dgt-text-muted);
        }
    `;
    document.head.appendChild(style);
};

// Auto-inyectar al cargar
if (document.readyState === 'complete') {
    DiscourseGraphToolkit.injectBaseStyles();
} else {
    window.addEventListener('load', () => DiscourseGraphToolkit.injectBaseStyles());
}
