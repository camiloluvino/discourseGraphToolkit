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
require('../src/core/export.js');
require('../src/api/roamProjects.js');
require('../src/api/roamBranchVerification.js');

const DGT = global.DiscourseGraphToolkit;

// Bloque en el formato que produce transformToNativeFormat
function block(string, refUids = [], children = []) {
    return { string, refs: refUids.map(uid => ({ uid })), children };
}

function refsOf(children) {
    return [...DGT._extractAllReferencesFromNode({ children })].sort();
}

// --- Detección del bloque de bitácora ---

test('isBitacoraBlock - Reconoce [[bitácora]] dentro del bloque', () => {
    assert.strictEqual(DGT.isBitacoraBlock('[[bitácora]]'), true);
    assert.strictEqual(DGT.isBitacoraBlock('[[bitácora]] títulos anteriores'), true);
    assert.strictEqual(DGT.isBitacoraBlock('movido a la [[bitácora]]'), true);
    assert.strictEqual(DGT.isBitacoraBlock('[[Bitácora]]'), true, 'igual que la exportación, sin distinguir mayúsculas');
});

test('isBitacoraBlock - Exige doble corchete y tilde', () => {
    assert.strictEqual(DGT.isBitacoraBlock('bitácora'), false);
    assert.strictEqual(DGT.isBitacoraBlock('[[bitacora]]'), false);
    assert.strictEqual(DGT.isBitacoraBlock('#SupportedBy'), false);
    assert.strictEqual(DGT.isBitacoraBlock(''), false);
    assert.strictEqual(DGT.isBitacoraBlock(undefined), false);
});

// --- Recorrido de la rama ---

test('_extractAllReferencesFromNode - No sigue lo que cuelga de una bitácora dentro de un bloque de relación', () => {
    const refs = refsOf([
        block('#SupportedBy', [], [
            block('[[[[EVD]] - vigente]]', ['evdVigente']),
            block('[[bitácora]]', [], [
                block('[[[[CLM]] - formulación vieja]]', ['clmViejo'])
            ])
        ])
    ]);
    assert.deepStrictEqual(refs, ['evdVigente']);
});

test('_extractAllReferencesFromNode - Una bitácora a mayor profundidad también corta su subárbol', () => {
    const refs = refsOf([
        block('#RespondedBy', [], [
            block('[[[[CLM]] - vigente]]', ['clmVigente'], [
                block('notas', [], [
                    block('[[bitácora]]', [], [
                        block('#Contains', ['Contains'], [
                            block('[[[[GRI]] - antiguo]]', ['griAntiguo'])
                        ])
                    ])
                ])
            ])
        ])
    ]);
    assert.deepStrictEqual(refs, ['clmVigente']);
});

test('_extractAllReferencesFromNode - Las referencias escritas en el propio bloque de bitácora tampoco cuentan', () => {
    const refs = refsOf([
        block('#SupportedBy', [], [
            block('[[bitácora]] antes era [[[[CLM]] - viejo]]', ['bitacora', 'clmViejo'])
        ])
    ]);
    assert.deepStrictEqual(refs, []);
});

test('_extractAllReferencesFromNode - Un bloque de relación que es a la vez bitácora se ignora completo', () => {
    const refs = refsOf([
        block('#SupportedBy [[bitácora]]', ['SupportedBy', 'bitacora'], [
            block('[[[[EVD]] - antigua]]', ['evdAntigua'])
        ])
    ]);
    assert.deepStrictEqual(refs, []);
});

test('_extractAllReferencesFromNode - La bitácora de primer nivel sigue fuera de la rama', () => {
    const refs = refsOf([
        block('#RespondedBy', [], [block('[[[[CLM]] - vigente]]', ['clmVigente'])]),
        block('[[bitácora]]', [], [
            block('#RespondedBy', [], [block('[[[[CLM]] - viejo]]', ['clmViejo'])])
        ])
    ]);
    assert.deepStrictEqual(refs, ['clmVigente']);
});

test('_extractAllReferencesFromNode - #RelatedTo sigue funcionando como escape', () => {
    const refs = refsOf([
        block('#SupportedBy', [], [
            block('[[[[EVD]] - vigente]]', ['evdVigente']),
            block('#RelatedTo', [], [block('[[[[CLM]] - lateral]]', ['clmLateral'])])
        ])
    ]);
    assert.deepStrictEqual(refs, ['evdVigente']);
});

// --- Integración: la rama verificada no incluye las páginas guardadas en bitácora ---

test('getBranchNodes - Los nodos guardados en bitácora no entran a la rama', async () => {
    const raw = (uid, title, children) => ({ ':block/uid': uid, ':node/title': title, ':block/children': children });
    const rawBlock = (uid, string, refUids, children = [], order = 0) => ({
        ':block/uid': uid, ':block/string': string, ':block/order': order,
        ':block/refs': refUids.map(r => ({ ':block/uid': r })), ':block/children': children
    });
    const pages = {
        que: raw('que', '[[QUE]] - pregunta', [
            rawBlock('b1', 'Proyecto Asociado:: [[tesis]]', ['tesisPage'], [], 0),
            rawBlock('b2', '#RespondedBy', ['RespondedBy'], [
                rawBlock('b3', '[[[[CLM]] - vigente]]', ['clmVigente'], [], 0),
                rawBlock('b4', '[[bitácora]]', ['bitacora'], [
                    rawBlock('b5', '[[[[CLM]] - formulación vieja]]', ['clmViejo'])
                ], 1)
            ], 1)
        ]),
        clmVigente: raw('clmVigente', '[[CLM]] - vigente', [
            rawBlock('c1', 'Proyecto Asociado:: [[tesis]]', ['tesisPage'])
        ]),
        clmViejo: raw('clmViejo', '[[CLM]] - formulación vieja', [
            rawBlock('v1', 'Proyecto Asociado:: [[otro proyecto]]', ['otroPage'])
        ])
    };
    const pulled = [];
    window.roamAlphaAPI = {
        data: {
            async: {
                pull_many: async (pattern, eids) => eids.map(([, uid]) => {
                    pulled.push(uid);
                    return pages[uid] || null;
                })
            }
        }
    };

    const nodes = await DGT.getBranchNodes('que');
    assert.deepStrictEqual(nodes.map(n => n.uid), ['clmVigente']);
    assert.ok(!pulled.includes('clmViejo'), 'la página guardada en bitácora ni siquiera se consulta');
});
