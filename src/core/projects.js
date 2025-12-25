// ============================================================================
// PROJECT MANAGER: Centralized Project Logic
// ============================================================================

/**
 * ProjectManager - Provides centralized helpers for project field handling.
 * This module addresses the fragmentation of project-related logic across
 * multiple files and eliminates hardcoded "Proyecto Asociado::" strings.
 */
DiscourseGraphToolkit.ProjectManager = {

    /**
     * Gets the configured project field name (e.g., "Proyecto Asociado")
     * Falls back to default if not configured.
     * @returns {string} The field name without "::"
     */
    getFieldName: function () {
        const config = DiscourseGraphToolkit.getConfig();
        return config.projectFieldName || "Proyecto Asociado";
    },

    /**
     * Gets the full field pattern including "::" (e.g., "Proyecto Asociado::")
     * Use this for string matching and queries.
     * @returns {string} The field pattern with "::"
     */
    getFieldPattern: function () {
        return this.getFieldName() + "::";
    },

    /**
     * Gets a regex to extract project name from a block string.
     * Matches pattern: FieldName:: [[ProjectName]]
     * @returns {RegExp} Regex with capture group for project name
     */
    getFieldRegex: function () {
        const fieldName = this.getFieldName();
        // Escape special regex characters in field name
        const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped + "::\\s*\\[\\[([^\\]]+)\\]\\]");
    },

    /**
     * Builds a complete field value string for a project.
     * Result: "Proyecto Asociado:: [[ProjectName]]"
     * @param {string} projectName - The project name to include
     * @returns {string} Complete field value string
     */
    buildFieldValue: function (projectName) {
        return this.getFieldName() + ":: [[" + projectName + "]]";
    },

    /**
     * Escapes the field name for use in Datalog queries.
     * @returns {string} Escaped field name safe for Datalog
     */
    getEscapedFieldName: function () {
        return DiscourseGraphToolkit.escapeDatalogString(this.getFieldName());
    },

    /**
     * Escapes the field pattern for use in Datalog queries.
     * @returns {string} Escaped field pattern safe for Datalog
     */
    getEscapedFieldPattern: function () {
        return DiscourseGraphToolkit.escapeDatalogString(this.getFieldPattern());
    }
};


