// ============================================================================
// CORE: Markdown Generator
// Wrapper que usa MarkdownCore para mantener la interfaz pública
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, flatMode = false, skeletonMode = false, formatOptions = {}) {
        // Delegar completamente a MarkdownCore
        return MarkdownCore.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, flatMode, skeletonMode, formatOptions);
    },

    // Convenience wrapper for flat markdown export (EPUB-ready)
    generateFlatMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true, skeletonMode = false, formatOptions = {}) {
        return this.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora, true, skeletonMode, formatOptions);
    }
};
