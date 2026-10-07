const test = require('node:test');
const assert = require('node:assert');

// Mocks globales mínimos para cargar los módulos fuera de Roam
global.window = { location: { hash: '' } };
global.localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
global.DiscourseGraphToolkit = {};

require('../src/config.js');
require('../src/utils/helpers.js');
require('../src/utils/mutationThrottle.js');
require('../src/state.js');
require('../src/core/projects.js');
require('../src/api/roamProjects.js');
require('../src/api/roamBranchVerification.js');

const DGT = global.DiscourseGraphToolkit;

// Construye un resultado de coherencia como el que devuelve verifyProjectCoherence
function coherence(rootProject, groups) {
    return {
        rootProject,
        coherent: groups.coherent || [],
        specialized: groups.specialized || [],
        different: groups.different || [],
        missing: groups.missing || []
    };
}

function changesByUid(plan) {
    return Object.fromEntries(plan.changes.map(c => [c.uid, c.to]));
}

// --- Planificador ---

test('planBranchPropagation - Caso 1: el valor editado de la raíz llega a los hijos', () => {
    const coh = coherence('tesis', {
        missing: [{ uid: 'clm', parentUid: 'root', project: null, parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'artículo/simmel', new Set(['clm']));
    assert.deepStrictEqual(changesByUid(plan), { root: 'artículo/simmel', clm: 'artículo/simmel' });
    assert.deepStrictEqual(plan.pending, []);
});

test('planBranchPropagation - Caso 2: una cadena de errores se corrige en una pasada', () => {
    const coh = coherence('artículo/simmel', {
        different: [
            { uid: 'clm', parentUid: 'root', project: 'tesis/marco', parentProject: 'artículo/simmel' },
            { uid: 'evd', parentUid: 'clm', project: 'curso/teoría', parentProject: 'tesis/marco' }
        ]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'artículo/simmel', new Set(['clm', 'evd']));
    assert.deepStrictEqual(changesByUid(plan), { clm: 'artículo/simmel', evd: 'artículo/simmel' });
});

test('planBranchPropagation - La raíz sin cambios no genera escritura', () => {
    const coh = coherence('tesis', {
        missing: [{ uid: 'clm', parentUid: 'root', project: null, parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'tesis', new Set(['clm']));
    assert.deepStrictEqual(changesByUid(plan), { clm: 'tesis' });
});

test('planBranchPropagation - Una especialización queda pendiente al cambiar la raíz', () => {
    const coh = coherence('tesis', {
        specialized: [{ uid: 'esp', parentUid: 'root', project: 'tesis/método', parentProject: 'tesis' }],
        missing: [{ uid: 'sin', parentUid: 'root', project: null, parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'artículo', new Set(['sin']));
    assert.deepStrictEqual(changesByUid(plan), { root: 'artículo', sin: 'artículo' });
    assert.deepStrictEqual(plan.pending.map(p => [p.uid, p.project, p.parentProject]), [['esp', 'tesis/método', 'artículo']]);
});

test('planBranchPropagation - Una especialización compatible con la raíz nueva se conserva', () => {
    const coh = coherence('tesis', {
        specialized: [{ uid: 'esp', parentUid: 'root', project: 'tesis/método', parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'tesis/método', new Set());
    assert.deepStrictEqual(changesByUid(plan), { root: 'tesis/método' });
    assert.deepStrictEqual(plan.pending, []);
});

test('planBranchPropagation - Un nodo que solo heredaba el proyecto de su padre lo sigue', () => {
    const coh = coherence('tesis', {
        coherent: [{ uid: 'clm', parentUid: 'root', project: 'tesis', parentProject: 'tesis' }],
        specialized: [{ uid: 'evd', parentUid: 'clm', project: 'tesis/marco', parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'artículo', new Set());
    assert.deepStrictEqual(changesByUid(plan), { root: 'artículo', clm: 'artículo' });
    assert.deepStrictEqual(plan.pending.map(p => p.uid), ['evd']);
});

test('planBranchPropagation - Los descendientes de un nodo pendiente se evalúan contra su proyecto actual', () => {
    const coh = coherence('tesis', {
        specialized: [{ uid: 'esp', parentUid: 'root', project: 'tesis/método', parentProject: 'tesis' }],
        coherent: [{ uid: 'hijo', parentUid: 'esp', project: 'tesis/método', parentProject: 'tesis/método' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'artículo', new Set());
    assert.deepStrictEqual(changesByUid(plan), { root: 'artículo' });
    assert.deepStrictEqual(plan.pending.map(p => p.uid), ['esp']);
});

test('planBranchPropagation - Generalización: el nodo recibe el proyecto de su padre', () => {
    const coh = coherence('tesis', {
        specialized: [{ uid: 'clm', parentUid: 'root', project: 'tesis/marco', parentProject: 'tesis' }],
        different: [{ uid: 'evd', parentUid: 'clm', project: 'tesis', parentProject: 'tesis/marco', reason: 'generalization' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'tesis', new Set(['evd']));
    assert.deepStrictEqual(changesByUid(plan), { evd: 'tesis/marco' });
});

test('planBranchPropagation - Cadena de nodos sin proyecto', () => {
    const coh = coherence('tesis', {
        missing: [
            { uid: 'evd', parentUid: 'clm', project: null, parentProject: 'tesis' },
            { uid: 'clm', parentUid: 'root', project: null, parentProject: 'tesis' }
        ]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'tesis', new Set(['clm', 'evd']));
    assert.deepStrictEqual(plan.changes.map(c => c.uid), ['clm', 'evd'], 'el padre debe procesarse antes que el hijo');
    assert.deepStrictEqual(changesByUid(plan), { clm: 'tesis', evd: 'tesis' });
});

test('planBranchPropagation - Corregir missing no toca los nodos diferentes', () => {
    const coh = coherence('tesis', {
        different: [{ uid: 'dif', parentUid: 'root', project: 'otro', parentProject: 'tesis' }],
        missing: [{ uid: 'sin', parentUid: 'root', project: null, parentProject: 'tesis' }]
    });
    const plan = DGT.planBranchPropagation(coh, 'root', 'tesis', new Set(['sin']));
    assert.deepStrictEqual(changesByUid(plan), { sin: 'tesis' });
});

// --- Ejecutor (con una API de Roam falsa) ---

function fakeRoam(projects) {
    const writes = [];
    window.roamAlphaAPI = {
        data: {
            async: {
                // Filas [pageUid, blockUid, texto, orden], como _queryProjectBlocks
                q: async (query, uids) => (uids || [])
                    .filter(uid => projects[uid])
                    .map(uid => [uid, uid + '-pb', 'Proyecto Asociado:: [[' + projects[uid] + ']]', 0])
            },
            block: {
                update: async (a) => { writes.push(['update', a.block.uid, a.block.string]); },
                create: async (a) => { writes.push(['create', a.location['parent-uid'], a.block.string]); }
            }
        }
    };
    return writes;
}

test('applyProjectChanges - Actualiza o crea el bloque de proyecto según corresponda', async () => {
    const writes = fakeRoam({ root: 'tesis', clm: 'otro' });
    const res = await DGT.applyProjectChanges([
        { uid: 'root', from: 'tesis', to: 'artículo' },
        { uid: 'clm', from: 'otro', to: 'artículo' },
        { uid: 'evd', from: null, to: 'artículo' }
    ]);
    assert.deepStrictEqual(writes, [
        ['update', 'root-pb', 'Proyecto Asociado:: [[artículo]]'],
        ['update', 'clm-pb', 'Proyecto Asociado:: [[artículo]]'],
        ['create', 'evd', 'Proyecto Asociado:: [[artículo]]']
    ]);
    assert.deepStrictEqual([res.success, res.updated, res.created], [true, 2, 1]);
});

test('applyProjectChanges - Un error en un nodo no detiene los demás', async () => {
    const writes = fakeRoam({ a: 'x', b: 'y' });
    const original = window.roamAlphaAPI.data.block.update;
    window.roamAlphaAPI.data.block.update = async (a) => {
        if (a.block.uid === 'a-pb') throw new Error('falla simulada');
        return original(a);
    };
    const res = await DGT.applyProjectChanges([
        { uid: 'a', from: 'x', to: 'z' },
        { uid: 'b', from: 'y', to: 'z' }
    ]);
    assert.strictEqual(res.success, false);
    assert.deepStrictEqual(res.errors.map(e => e.uid), ['a']);
    assert.deepStrictEqual(writes, [['update', 'b-pb', 'Proyecto Asociado:: [[z]]']]);
});

// --- Reemplazo del proyecto conservando el resto del bloque (caso 3) ---

test('_replaceProjectInString - Conserva el texto que acompaña al proyecto', () => {
    assert.strictEqual(
        DGT._replaceProjectInString('Proyecto Asociado:: [[tesis]] (revisar si va al capítulo 2)', 'artículo/simmel'),
        'Proyecto Asociado:: [[artículo/simmel]] (revisar si va al capítulo 2)'
    );
    assert.strictEqual(
        DGT._replaceProjectInString('nota previa Proyecto Asociado::[[tesis]]', 'artículo'),
        'nota previa Proyecto Asociado::[[artículo]]'
    );
});

test('_replaceProjectInString - Completa un campo vacío o sin enlace', () => {
    assert.strictEqual(DGT._replaceProjectInString('Proyecto Asociado::', 'tesis'), 'Proyecto Asociado:: [[tesis]]');
    assert.strictEqual(
        DGT._replaceProjectInString('Proyecto Asociado:: tesis (pendiente)', 'artículo'),
        'Proyecto Asociado:: [[artículo]] (pendiente)'
    );
});

test('applyProjectChanges - Caso 3: no borra la nota escrita junto al proyecto', async () => {
    const writes = [];
    window.roamAlphaAPI = {
        data: {
            async: { q: async () => [['clm', 'clm-pb', 'Proyecto Asociado:: [[otro]] (esta nota debería conservarse)', 0]] },
            block: {
                update: async (a) => { writes.push([a.block.uid, a.block.string]); },
                create: async () => { throw new Error('no debería crear'); }
            }
        }
    };
    await DGT.applyProjectChanges([{ uid: 'clm', from: 'otro', to: 'pruebaDGT/caso3' }]);
    assert.deepStrictEqual(writes, [['clm-pb', 'Proyecto Asociado:: [[pruebaDGT/caso3]] (esta nota debería conservarse)']]);
});

test('fixContainerAlignment - Tampoco borra la nota junto al proyecto', async () => {
    const writes = [];
    window.roamAlphaAPI = {
        data: {
            async: { q: async () => [['cont', 'cont-pb', 'Proyecto Asociado:: [[tesis]] #pendiente', 0]] },
            block: {
                update: async (a) => { writes.push([a.block.uid, a.block.string]); },
                create: async () => { throw new Error('no debería crear'); }
            }
        }
    };
    const res = await DGT.fixContainerAlignment('cont', 'tesis/marco');
    assert.deepStrictEqual(res, { success: true, action: 'updated' });
    assert.deepStrictEqual(writes, [['cont-pb', 'Proyecto Asociado:: [[tesis/marco]] #pendiente']]);
});

// --- Bloques de proyecto duplicados (caso 5) ---

test('_pickProjectBlocks - Elige siempre el primer bloque válido según su orden en la página', () => {
    const rows = [
        ['p1', 'b2', 'Proyecto Asociado:: [[artículo/simmel]]', 1],
        ['p1', 'b1', 'Proyecto Asociado:: [[tesis/marco]]', 0]
    ];
    const picked = DGT._pickProjectBlocks(rows).get('p1');
    assert.deepStrictEqual(
        [picked.project, picked.blockUid, picked.projects],
        ['tesis/marco', 'b1', ['tesis/marco', 'artículo/simmel']]
    );
});

test('_pickProjectBlocks - Ignora bloques escapados y no los cuenta como duplicados', () => {
    const rows = [
        ['p1', 'b0', '`Proyecto Asociado:: [[ejemplo]]`', 0],
        ['p1', 'b1', 'Proyecto Asociado:: [[tesis]]', 1]
    ];
    const picked = DGT._pickProjectBlocks(rows).get('p1');
    assert.deepStrictEqual([picked.project, picked.blockUid, picked.projects], ['tesis', 'b1', ['tesis']]);
});

test('_pickProjectBlocks - Un campo sin enlace se puede escribir pero no tiene proyecto', () => {
    const picked = DGT._pickProjectBlocks([['p1', 'b1', 'Proyecto Asociado::', 0]]).get('p1');
    assert.deepStrictEqual([picked.project, picked.blockUid, picked.projects], [null, 'b1', []]);
});

test('verifyProjectCoherence - Informa los nodos con más de un bloque de proyecto', async () => {
    window.roamAlphaAPI = {
        data: {
            async: {
                q: async () => [
                    ['root', 'r1', 'Proyecto Asociado:: [[tesis]]', 0],
                    ['clm', 'c2', 'Proyecto Asociado:: [[artículo]]', 2],
                    ['clm', 'c1', 'Proyecto Asociado:: [[tesis]]', 0]
                ]
            }
        }
    };
    const branch = [{ uid: 'clm', title: '[[CLM]] - x', type: 'CLM', parentUid: 'root' }];
    const coh = await DGT.verifyProjectCoherence('root', branch);
    assert.deepStrictEqual(coh.coherent.map(n => [n.uid, n.project]), [['clm', 'tesis']], 'usa el primer bloque');
    assert.deepStrictEqual(coh.duplicates.map(n => [n.uid, n.projects]), [['clm', ['tesis', 'artículo']]]);
    assert.strictEqual(DGT.getBranchStatus(coh), 'different', 'una rama con duplicados no figura como coherente');
});

test('getBranchStatus - Prioridad de estados', () => {
    const base = { coherent: [], specialized: [], different: [], missing: [], duplicates: [] };
    assert.strictEqual(DGT.getBranchStatus(base), 'coherent');
    assert.strictEqual(DGT.getBranchStatus({ ...base, specialized: [{}] }), 'specialized');
    assert.strictEqual(DGT.getBranchStatus({ ...base, specialized: [{}], duplicates: [{}] }), 'different');
    assert.strictEqual(DGT.getBranchStatus({ ...base, different: [{}], missing: [{}] }), 'missing');
});
