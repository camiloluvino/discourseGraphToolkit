import re

with open("src/ui/tabs/ExportTab.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove orderedQuestions, setOrderedQuestions, orderedGroups, setOrderedGroups from useExport
content = re.sub(
    r'previewPages, setPreviewPages,\s*orderedQuestions, setOrderedQuestions,\s*orderedGroups, setOrderedGroups',
    r'previewPages, setPreviewPages',
    content
)

# 2. Remove useEffect that clears previewPages, orderedQuestions, orderedGroups
content = re.sub(
    r'setPreviewPages\(\[\]\);\s*setOrderedQuestions\(\[\]\);\s*setOrderedGroups\(\[\]\);',
    r'setPreviewPages([]);',
    content
)

# 3. Remove D&D states
content = re.sub(
    r'// --- Estado D&D para Paso 3 ---.*?// --- Helper',
    r'// --- Helper',
    content,
    flags=re.DOTALL
)

# 4. Replace handlePreview and D&D handlers with fetchPagesToExport
fetch_pages_logic = """
    // --- Fetch Pages ---
    const fetchPagesToExport = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return null;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            const uidToProject = {};
            for (let p of pNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                for (const page of pages) {
                    if (!uidToProject[page.pageUid]) {
                        uidToProject[page.pageUid] = p; // primer proyecto encontrado gana
                    }
                }
                allPages = allPages.concat(pages);
            }

            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());
            setPreviewPages(uniquePages);
            return { uniquePages, uidToProject };
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return null;
        }
    };
"""

content = re.sub(
    r'// --- D&D handlers para grupos \(Paso 3\).*?// --- Helpers para Seleccionar Todo ---',
    r'// --- Helpers para Seleccionar Todo ---',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'// --- Handlers ---.*?const prepareExportData = async',
    fetch_pages_logic + '\n    const prepareExportData = async',
    content,
    flags=re.DOTALL
)

# 5. Fix prepareExportData to remove currentOrderedQuestions and use localStorage
prepare_start_re = r'const prepareExportData = async \(pagesToExport, pNames, currentOrderedQuestions\) => \{'
new_prepare_start = r'const prepareExportData = async (pagesToExport, pNames, uidToProject) => {'
content = re.sub(prepare_start_re, new_prepare_start, content)

sort_logic_old_re = r'// Usar el orden definido en Paso 3.*?// Retornar preguntas YA ordenadas para el export'
sort_logic_new = """// Aplicar orden desde localStorage (Conexión Absoluta con Panorámica)
        let orderedQuestionsToExport = [];
        const parentKey = getParentProjectKey(pNames);
        
        // Nodos que tienen project mapeado
        const annotated = questions.map(q => ({
            ...q, 
            _project: uidToProject[q.uid] || null
        }));

        const subProjectSet = new Set();
        pNames.forEach(p => {
            if (p === parentKey) {
                subProjectSet.add(p);
            } else if (p.startsWith(parentKey + '/')) {
                const rest = p.substring(parentKey.length + 1);
                const immediate = rest.split('/')[0];
                subProjectSet.add(parentKey + '/' + immediate);
            }
        });

        const hasGroups = subProjectSet.size > 1;

        if (hasGroups) {
            // Modo agrupado
            const savedGroupOrder = DiscourseGraphToolkit.loadGroupOrder(parentKey);
            const orderedGroups = savedGroupOrder && savedGroupOrder.length > 0
                ? [...savedGroupOrder.filter(g => subProjectSet.has(g)), ...Array.from(subProjectSet).filter(g => !savedGroupOrder.includes(g))]
                : Array.from(subProjectSet).sort();

            let finalUidOrder = [];
            for (const gk of orderedGroups) {
                const groupNodes = annotated.filter(q => q._project === gk || (q._project && q._project.startsWith(gk + '/')));
                const savedQ = DiscourseGraphToolkit.loadQuestionOrder(gk);
                if (savedQ && savedQ.length > 0) {
                    const ordered = savedQ.map(uid => groupNodes.find(q => q.uid === uid)).filter(Boolean);
                    const unseen = groupNodes.filter(q => !savedQ.includes(q.uid));
                    finalUidOrder.push(...ordered.map(q => q.uid), ...unseen.map(q => q.uid));
                } else {
                    finalUidOrder.push(...groupNodes.map(q => q.uid));
                }
            }
            
            // Nodos sin grupo
            const assignedUids = new Set(finalUidOrder);
            const unassignedNodes = annotated.filter(q => !assignedUids.has(q.uid));
            finalUidOrder.push(...unassignedNodes.map(q => q.uid));

            const reordered = finalUidOrder.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
            orderedQuestionsToExport = reordered;
        } else {
            // Modo plano
            const savedQ = DiscourseGraphToolkit.loadQuestionOrder(parentKey);
            if (savedQ && savedQ.length > 0) {
                const ordered = savedQ.map(uid => annotated.find(q => q.uid === uid)).filter(Boolean);
                const unseen = annotated.filter(q => !savedQ.includes(q.uid));
                orderedQuestionsToExport = [...ordered, ...unseen];
            } else {
                orderedQuestionsToExport = annotated;
            }
        }

        const sanitizedNames = DiscourseGraphToolkit.formatExportProjectName(parentKey);
        const filename = `DG_${sanitizedNames}`;

        // Retornar preguntas YA ordenadas para el export"""
content = re.sub(sort_logic_old_re, sort_logic_new, content, flags=re.DOTALL)

# 6. Update handleExport functions
def fix_handle_export(match):
    body = match.group(0)
    body = re.sub(
        r'let pagesToExport = previewPages;.*?if \(pagesToExport\.length === 0\) \{.*?\}',
        r'''let pagesToExport = previewPages;
        let uidToProject = {};
        if (pagesToExport.length === 0) {
            const result = await fetchPagesToExport();
            if (!result || !result.uniquePages || result.uniquePages.length === 0) return;
            pagesToExport = result.uniquePages;
            uidToProject = result.uidToProject;
        }''',
        body,
        flags=re.DOTALL
    )
    body = re.sub(r'prepareExportData\(pagesToExport, pNames, exportOrderedQuestions\)', r'prepareExportData(pagesToExport, pNames, uidToProject)', body)
    return body

content = re.sub(r'const handleExport = async \(\) => \{.*?finally \{\s*setIsExporting\(false\);\s*\}\s*\}', fix_handle_export, content, flags=re.DOTALL)
content = re.sub(r'const handleExportHtml = async \(\) => \{.*?finally \{\s*setIsExporting\(false\);\s*\}\s*\}', fix_handle_export, content, flags=re.DOTALL)
content = re.sub(r'const handleExportMarkdown = async \(\) => \{.*?finally \{\s*setIsExporting\(false\);\s*\}\s*\}', fix_handle_export, content, flags=re.DOTALL)
content = re.sub(r'const handleExportFlatMarkdown = async \(\) => \{.*?finally \{\s*setIsExporting\(false\);\s*\}\s*\}', fix_handle_export, content, flags=re.DOTALL)
content = re.sub(r'const handleExportEpub = async \(\) => \{.*?finally \{\s*setIsExporting\(false\);\s*\}\s*\}', fix_handle_export, content, flags=re.DOTALL)

# 7. Remove UI Step 3
content = re.sub(
    r'// --- Paso 3: Orden de Exportación \(D&D\) ---.*?\)(?=\s*\)\s*;\s*\};\s*DiscourseGraphToolkit)',
    r'',
    content,
    flags=re.DOTALL
)

with open("src/ui/tabs/ExportTab.js", "w", encoding="utf-8") as f:
    f.write(content)
