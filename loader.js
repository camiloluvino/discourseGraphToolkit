/**
 * Discourse Graph Toolkit - Auto-Update Loader
 * 
 * Copia este código en un bloque {{[[roam/js]]}} en cualquier grafo.
 * El plugin se cargará siempre desde la versión más reciente en GitHub Pages.
 */
var s = document.createElement('script');
s.src = 'https://camiloluvino.github.io/discourseGraphToolkit/discourse-graph-toolkit.js';
s.type = 'text/javascript';
s.onload = function () {
    console.log('[Discourse Graph Toolkit] Loaded from GitHub Pages');
};
s.onerror = function () {
    console.error('[Discourse Graph Toolkit] Failed to load from GitHub Pages');
};
document.head.appendChild(s);
