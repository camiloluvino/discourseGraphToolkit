// ============================================================================
// API: Roam Structure Verification
// ============================================================================

/**
 * Verifica la estructura de un nodo individual
 * @param {object} nodeData - Datos del nodo (ya transformados)
 * @param {string} nodeType - Tipo del nodo (QUE, CLM, EVD)
 * @returns {{ valid: boolean, issues: string[] }}
 */
DiscourseGraphToolkit.verifyNodeStructure = function (nodeData, nodeType) {
    const issues = [];

    if (!nodeData || !nodeData.children) {
        return { valid: true, issues: [] };
    }

    const children = nodeData.children || [];

    if (nodeType === 'QUE') {
        // Verificar que QUE use #RespondedBy (no #SupportedBy directamente)
        let hasRespondedBy = false;
        let hasSupportedByDirect = false;

        for (const child of children) {
            const str = child.string || "";
            if (str.includes("#RespondedBy")) {
                hasRespondedBy = true;
            }
            if (str.includes("#SupportedBy")) {
                hasSupportedByDirect = true;
            }
        }

        // Si tiene #SupportedBy pero no #RespondedBy, es un problema
        if (hasSupportedByDirect && !hasRespondedBy) {
            issues.push("Usa #SupportedBy en lugar de #RespondedBy. Las respuestas no se exportarán correctamente.");
        }

        // Si no tiene ninguno de los dos, también es un problema
        if (!hasRespondedBy && !hasSupportedByDirect) {
            // Verificar si tiene CLMs/EVDs como hijos directos sin marcador
            const hasDiscourseRefs = children.some(child => {
                const str = child.string || "";
                return str.includes("[[CLM]]") || str.includes("[[EVD]]");
            });

            if (hasDiscourseRefs) {
                issues.push("Tiene referencias a CLM/EVD pero sin marcador #RespondedBy. Las respuestas podrían no exportarse.");
            }
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
};

/**
 * Verifica la estructura completa de una rama (QUE y sus descendientes)
 * @param {string} questionUid - UID de la pregunta a verificar
 * @returns {Promise<{ structureIssues: Array<{uid, title, type, issues}>, isExportable: boolean }>}
 */
DiscourseGraphToolkit.verifyBranchStructure = async function (questionUid) {
    try {
        const structureIssues = [];

        // 1. Obtener datos del QUE
        const rawData = await window.roamAlphaAPI.data.async.pull(
            this.ROAM_PULL_PATTERN,
            [':block/uid', questionUid]
        );

        if (!rawData) {
            return { structureIssues: [], isExportable: true };
        }

        const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
        if (!nodeData) {
            return { structureIssues: [], isExportable: true };
        }

        // 2. Verificar estructura del QUE
        const queVerification = this.verifyNodeStructure(nodeData, 'QUE');
        if (!queVerification.valid) {
            structureIssues.push({
                uid: questionUid,
                title: nodeData.title,
                type: 'QUE',
                issues: queVerification.issues
            });
        }

        // 3. Determinar si es exportable (si tiene problemas críticos, no lo es)
        const isExportable = structureIssues.length === 0;

        return { structureIssues, isExportable };

    } catch (e) {
        console.error("Error verifying branch structure:", e);
        return { structureIssues: [], isExportable: true };
    }
};

/**
 * Corrige la estructura de un QUE: cambia #SupportedBy a #RespondedBy
 * @param {string} questionUid - UID de la pregunta a corregir
 * @returns {Promise<{ success: boolean, fixed: number }>}
 */
DiscourseGraphToolkit.fixQueStructure = async function (questionUid) {
    try {
        // Buscar bloques hijos que tengan #SupportedBy
        const query = `[:find ?block-uid ?string
                       :where 
                       [?page :block/uid "${questionUid}"]
                       [?block :block/parents ?page]
                       [?block :block/uid ?block-uid]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "#SupportedBy")]]`;

        const results = await window.roamAlphaAPI.data.async.q(query);

        let fixed = 0;
        for (const [blockUid, blockString] of results) {
            // Reemplazar #SupportedBy con #RespondedBy
            const newString = blockString.replace(/#SupportedBy/g, "#RespondedBy");

            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newString }
            });
            fixed++;
        }

        return { success: true, fixed };

    } catch (e) {
        console.error("Error fixing QUE structure:", e);
        return { success: false, fixed: 0 };
    }
};
