// ============================================================================
// HTML: Styles
// CSS embebido para el HTML exportado
// ============================================================================

DiscourseGraphToolkit.HtmlStyles = {
    getCSS: function () {
        return `
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        h1 { font-size: 24px; font-weight: 300; margin: 0 0 30px 0; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; }
        h2 { font-size: 16px; font-weight: 500; margin: 20px 0 10px 0; position: relative; }
        h3 { font-size: 14px; font-weight: 500; margin: 15px 0 8px 0; }
        h4 { font-size: 13px; font-weight: 500; margin: 12px 0 6px 0; }
        h5 { font-size: 12px; font-weight: 500; margin: 10px 0 5px 0; color: #555; }
        h6 { font-size: 11px; font-weight: 500; margin: 8px 0 4px 0; color: #666; }
        .node { margin-bottom: 8px; padding-left: 12px; }
        .que-node { border-left: 2px solid #000; margin-bottom: 15px; }
        .clm-node { margin-left: 20px; border-left: 1px solid #d0d0d0; }
        .evd-node { margin-left: 40px; border-left: 1px solid #e0e0e0; }
        .direct-evd-node { margin-left: 20px; border-left: 1px solid #c8c8c8; background-color: #fafafa; border-radius: 3px; padding: 8px 12px; }
        .content-node, .direct-content-node { margin-left: 60px; border-left: 1px solid #f0f0f0; font-size: 12px; color: #4a4a4a; }
        .project-metadata { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 11px; color: #6c757d; }
        .supporting-clms { margin-left: 40px; background-color: #f0f7ff; border-left: 2px solid #007acc; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .connected-clm-item, .supporting-clm-item { margin-left: 10px; border-left: 1px solid #d8d8d8; padding: 6px 8px; margin-bottom: 8px; background-color: #fff; border-radius: 2px; }
        .collapsible { cursor: pointer; position: relative; padding-right: 25px; user-select: none; }
        .collapsible::after { content: '+'; position: absolute; right: 8px; top: 0; font-size: 14px; color: #888; }
        .active::after { content: '−'; }
        .content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; padding-right: 15px; }
        .show-content { max-height: none; overflow: visible; }
        .controls { position: sticky; top: 10px; background: rgba(255,255,255,0.95); padding: 12px 0; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; z-index: 100; }
        .btn { background: #fff; border: 1px solid #e0e0e0; padding: 6px 12px; margin-right: 8px; cursor: pointer; border-radius: 4px; }
        .btn:hover { background-color: #f8f8f8; }
        .btn-copy { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
        .btn-export { background: #007acc; color: #fff; border-color: #007acc; }
        .btn-copy-individual, .btn-reorder { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 2px 6px; margin-left: 8px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .btn-export-md { background: #4CAF50; color: white; border: 1px solid #4CAF50; padding: 2px 6px; margin-left: 4px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .btn-export-md:hover { background: #45a049; }
        .node-tag { font-weight: 600; font-family: monospace; font-size: 11px; }
        .error-message { color: #777; font-style: italic; background-color: #f8f8f8; padding: 8px; }
        .copy-success { position: fixed; top: 20px; right: 20px; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; }
        .copy-success.show { opacity: 1; }
    </style>`;
    }
};
