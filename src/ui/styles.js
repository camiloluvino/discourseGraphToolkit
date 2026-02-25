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
            right: 0;
            margin-top: var(--dgt-spacing-sm);
            background: #ffffff;
            border-radius: var(--dgt-radius-md);
            box-shadow: var(--dgt-shadow-lg);
            border: 1px solid var(--dgt-border-color);
            z-index: 1000;
            min-width: 18rem;
            max-width: 24rem;
            max-height: 18rem;
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
        }
        .dgt-popover-item {
            padding: 8px 12px;
            border-bottom: 1px solid var(--dgt-border-color);
            display: flex;
            align-items: flex-start;
            gap: 8px;
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
