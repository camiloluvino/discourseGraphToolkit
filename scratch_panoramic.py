import re

with open("src/ui/tabs/PanoramicTab.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Drag and Drop state variables below orderedGroupKeys
dd_state = """
    // --- Estado D&D ---
    const [dragType, setDragType] = React.useState(null); // 'group' | 'node'
    const [dragGroupKey, setDragGroupKey] = React.useState(null);
    const [dragIdx, setDragIdx] = React.useState(null);
    const [dragOverIdx, setDragOverIdx] = React.useState(null);

    // --- D&D handlers para grupos ---
    const handleGroupDragStart = (e, idx) => { setDragType('group'); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleGroupDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleGroupDragOver = (e) => { e.preventDefault(); };
    const handleGroupDragEnd = () => { setDragType(null); setDragIdx(null); setDragOverIdx(null); };
    const handleGroupDrop = (e, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) { handleGroupDragEnd(); return; }
        const newGroups = [...orderedGroupKeys];
        const [item] = newGroups.splice(dragIdx, 1);
        newGroups.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        setOrderedGroupKeys(newGroups);
        DiscourseGraphToolkit.saveGroupOrder(selectedProject, newGroups);
        handleGroupDragEnd();
    };

    // --- D&D handlers para nodos ---
    const handleNodeDragStart = (e, groupKey, idx) => { setDragType('node'); setDragGroupKey(groupKey); setDragIdx(idx); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
    const handleNodeDragEnter = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
    const handleNodeDragOver = (e) => { e.preventDefault(); };
    const handleNodeDragEnd = () => { setDragType(null); setDragGroupKey(null); setDragIdx(null); setDragOverIdx(null); };
    const handleNodeDrop = (e, groupKey, dropIdx) => {
        e.preventDefault();
        if (dragIdx === null || dropIdx === null || dragIdx === dropIdx || dragGroupKey !== groupKey) { handleNodeDragEnd(); return; }
        
        let targetList = groupKey ? orderedQuestionUIDsForGroup(groupKey) : [...orderedQuestionUIDs];
        
        const [item] = targetList.splice(dragIdx, 1);
        targetList.splice(dragIdx < dropIdx ? dropIdx - 1 : dropIdx, 0, item);
        
        if (groupKey) {
            DiscourseGraphToolkit.saveQuestionOrder(groupKey, targetList);
            // We force a re-render of this specific group by updating a dummy state or relying on the fact that we can just update the group Nodes in cache. Wait.
            // In grouped mode, we don't have a single orderedQuestionUIDs array. Let's just save it to localStorage and trigger a re-render by updating a timestamp.
            setCacheTimestamp(Date.now());
        } else {
            setOrderedQuestionUIDs(targetList);
            DiscourseGraphToolkit.saveQuestionOrder(selectedProject, targetList);
        }
        handleNodeDragEnd();
    };

    const orderedQuestionUIDsForGroup = (groupKey) => {
        const groupNodes = panoramicData.questions.filter(q => {
            if (!q.project) return false;
            return q.project === groupKey || q.project.startsWith(groupKey + '/');
        });
        const savedOrder = DiscourseGraphToolkit.loadQuestionOrder(groupKey);
        if (savedOrder && savedOrder.length > 0) {
            const validSaved = savedOrder.filter(uid => groupNodes.some(q => q.uid === uid));
            const newUids = groupNodes.filter(q => !savedOrder.includes(q.uid)).map(q=>q.uid);
            return [...validSaved, ...newUids];
        }
        return groupNodes.map(q=>q.uid);
    };
"""

content = re.sub(
    r'const \[cacheTimestamp, setCacheTimestamp\] = React\.useState\(null\);',
    r'const [cacheTimestamp, setCacheTimestamp] = React.useState(null);\n' + dd_state,
    content
)

# 2. Update renderQuestion to add D&D
render_q_old = r'const renderQuestion = \(q, allNodes, isRoot = true, index = 0\) => \{'
render_q_new = """const renderQuestion = (q, allNodes, isRoot = true, index = 0, groupKey = null) => {
        const isNodeDragOver = dragType === 'node' && dragGroupKey === groupKey && dragOverIdx === index;
"""
content = re.sub(render_q_old, render_q_new, content)

# 3. Update renderQuestion return to include draggable props
q_return_old = r'return React\.createElement\(\'div\', \{\s*key: q\.uid,\s*className: `dgt-panoramic-node'
q_return_new = """return React.createElement('div', {
            key: q.uid,
            draggable: true,
            onDragStart: e => handleNodeDragStart(e, groupKey, index),
            onDragEnter: e => handleNodeDragEnter(e, index),
            onDragOver: handleNodeDragOver,
            onDragEnd: handleNodeDragEnd,
            onDrop: e => handleNodeDrop(e, groupKey, index),
            style: { 
                border: isNodeDragOver ? '2px dashed var(--dgt-accent-purple)' : undefined, 
                opacity: dragType === 'node' && dragGroupKey === groupKey && dragIdx === index ? 0.4 : 1,
                cursor: 'grab'
            },
            className: `dgt-panoramic-node"""
content = re.sub(q_return_old, q_return_new, content)

# 4. Update renderSubProjectGroup to add D&D and pass groupKey to renderQuestion
render_g_old = r'const renderSubProjectGroup = \(groupKey, groupIndex\) => \{'
render_g_new = """const renderSubProjectGroup = (groupKey, groupIndex) => {
        const isGroupDragOver = dragType === 'group' && dragOverIdx === groupIndex;"""
content = re.sub(render_g_old, render_g_new, content)

g_return_old = r'return React\.createElement\(\'div\', \{\s*key: groupKey,\s*className: \'dgt-panoramic-group\'\s*\},'
g_return_new = """return React.createElement('div', {
            key: groupKey,
            draggable: true,
            onDragStart: e => handleGroupDragStart(e, groupIndex),
            onDragEnter: e => handleGroupDragEnter(e, groupIndex),
            onDragOver: handleGroupDragOver,
            onDragEnd: handleGroupDragEnd,
            onDrop: e => handleGroupDrop(e, groupIndex),
            style: { 
                border: isGroupDragOver ? '2px dashed var(--dgt-accent-purple)' : undefined,
                opacity: dragType === 'group' && dragIdx === groupIndex ? 0.4 : 1,
                cursor: 'grab'
            },
            className: 'dgt-panoramic-group'
        },"""
content = re.sub(g_return_old, g_return_new, content)

# 5. Pass groupKey and index to renderQuestion inside renderSubProjectGroup
q_call_old = r'groupNodes\.map\(\(q\) => renderQuestion\(q, panoramicData\.allNodes, false\)\)'
q_call_new = r'groupNodes.map((q, idx) => renderQuestion(q, panoramicData.allNodes, false, idx, groupKey))'
content = re.sub(q_call_old, q_call_new, content)

# 6. Pass null groupKey inside the main list render
q_flat_call_old = r'filteredQuestions\.map\(\(q, index\) => renderQuestion\(q, panoramicData\.allNodes, true, index\)\)'
q_flat_call_new = r'filteredQuestions.map((q, index) => renderQuestion(q, panoramicData.allNodes, true, index, null))'
content = re.sub(q_flat_call_old, q_flat_call_new, content)

with open("src/ui/tabs/PanoramicTab.js", "w", encoding="utf-8") as f:
    f.write(content)
