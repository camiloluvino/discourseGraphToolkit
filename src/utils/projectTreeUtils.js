// ============================================================================
// UTILS: Project Tree Utilities
// Funciones para construir árbol jerárquico de proyectos por namespace
// ============================================================================

/**
 * Construye un árbol jerárquico a partir de resultados de verificación
 * @param {Array} results - Array de bulkVerificationResults
 * @returns {Object} - Árbol jerárquico { projectName: { project, questions, children, aggregatedStatus, issueCount } }
 */
DiscourseGraphToolkit.buildProjectTree = function (results) {
    const tree = {};
    const noProject = { project: null, questions: [], children: {}, aggregatedStatus: 'missing', issueCount: 0 };

    for (const result of results) {
        const project = result.coherence.rootProject;

        if (!project) {
            noProject.questions.push(result);
            continue;
        }

        // Dividir namespace en partes
        const parts = project.split('/');
        let currentLevel = tree;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? currentPath + '/' + part : part;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    project: currentPath,
                    questions: [],
                    children: {},
                    aggregatedStatus: 'coherent',
                    issueCount: 0
                };
            }

            // Si es el último nivel, agregar la pregunta aquí
            if (i === parts.length - 1) {
                currentLevel[part].questions.push(result);
            }

            currentLevel = currentLevel[part].children;
        }
    }

    // Agregar nodo para preguntas sin proyecto
    if (noProject.questions.length > 0) {
        tree['(sin proyecto)'] = noProject;
    }

    // Calcular estados agregados recursivamente
    this._calculateAggregatedStatus(tree);

    return tree;
};

/**
 * Calcula el estado agregado y conteo de issues para cada nodo del árbol
 * @param {Object} tree - Nodo del árbol o árbol completo
 */
DiscourseGraphToolkit._calculateAggregatedStatus = function (tree) {
    const statusPriority = { 'missing': 4, 'different': 3, 'specialized': 2, 'coherent': 1 };

    for (const key of Object.keys(tree)) {
        const node = tree[key];

        // Primero calcular hijos recursivamente
        if (Object.keys(node.children).length > 0) {
            this._calculateAggregatedStatus(node.children);
        }

        // Recopilar todos los estados (propios + hijos)
        let worstStatus = 'coherent';
        let issueCount = 0;

        // Estados de preguntas propias
        for (const q of node.questions) {
            if (statusPriority[q.status] > statusPriority[worstStatus]) {
                worstStatus = q.status;
            }
            if (q.status === 'different' || q.status === 'missing') {
                issueCount++;
            }
        }

        // Estados de hijos
        for (const childKey of Object.keys(node.children)) {
            const child = node.children[childKey];
            if (statusPriority[child.aggregatedStatus] > statusPriority[worstStatus]) {
                worstStatus = child.aggregatedStatus;
            }
            issueCount += child.issueCount;
        }

        node.aggregatedStatus = worstStatus;
        node.issueCount = issueCount;
    }
};

/**
 * Cuenta el total de preguntas en un nodo (propias + descendientes)
 * @param {Object} node - Nodo del árbol
 * @returns {number}
 */
DiscourseGraphToolkit.countTreeQuestions = function (node) {
    let count = node.questions.length;
    for (const childKey of Object.keys(node.children)) {
        count += this.countTreeQuestions(node.children[childKey]);
    }
    return count;
};

/**
 * Obtiene todas las preguntas de un nodo (propias + descendientes) como array plano
 * @param {Object} node - Nodo del árbol
 * @returns {Array}
 */
DiscourseGraphToolkit.getTreeQuestions = function (node) {
    let questions = [...node.questions];
    for (const childKey of Object.keys(node.children)) {
        questions = questions.concat(this.getTreeQuestions(node.children[childKey]));
    }
    return questions;
};

/**
 * Construye un árbol jerárquico simple a partir de nombres de proyectos
 * @param {Array<string>} projectNames - Array de nombres de proyectos
 * @returns {Object} - Árbol jerárquico { key: { project, children, isLeaf } }
 */
DiscourseGraphToolkit.buildSimpleProjectTree = function (projectNames) {
    const tree = {};

    for (const project of projectNames) {
        const parts = project.split('/');
        let currentLevel = tree;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? currentPath + '/' + part : part;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    project: currentPath,
                    children: {},
                    isLeaf: false
                };
            }

            // Marcar como hoja si es el último nivel
            if (i === parts.length - 1) {
                currentLevel[part].isLeaf = true;
            }

            currentLevel = currentLevel[part].children;
        }
    }

    return tree;
};

/**
 * Obtiene todos los proyectos descendientes de un nodo (incluyendo el propio)
 * @param {Object} node - Nodo del árbol
 * @returns {Array<string>} - Array de nombres de proyectos
 */
DiscourseGraphToolkit.getAllDescendantProjects = function (node) {
    let projects = [];
    if (node.isLeaf) {
        projects.push(node.project);
    }
    for (const childKey of Object.keys(node.children)) {
        projects = projects.concat(this.getAllDescendantProjects(node.children[childKey]));
    }
    return projects;
};

/**
 * Cuenta cuántos proyectos hoja hay en un nodo
 * @param {Object} node - Nodo del árbol
 * @returns {number}
 */
DiscourseGraphToolkit.countLeafProjects = function (node) {
    let count = node.isLeaf ? 1 : 0;
    for (const childKey of Object.keys(node.children)) {
        count += this.countLeafProjects(node.children[childKey]);
    }
    return count;
};

