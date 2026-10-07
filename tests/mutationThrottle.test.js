const test = require('node:test');
const assert = require('node:assert');

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
const MT = DGT.MutationThrottle;

// Reloj simulado: sleep avanza el reloj en vez de esperar de verdad
function useFakeClock() {
    let clock = 1000000;
    const sleeps = [];
    MT.callTimestamps = [];
    MT.MAX_OPS_PER_WINDOW = 3;
    MT.now = () => clock;
    MT.sleep = async (ms) => { sleeps.push(ms); clock += ms; };
    return { sleeps, advance: (ms) => { clock += ms; } };
}

function fakeRoamWrites() {
    const calls = [];
    window.roamAlphaAPI = {
        data: {
            async: { q: async () => [] },
            block: {
                create: async (a) => { calls.push('block.create'); },
                update: async (a) => { calls.push('block.update'); },
                delete: async (a) => { calls.push('block.delete'); }
            },
            page: {
                create: async (a) => { calls.push('page.create'); },
                delete: async (a) => { calls.push('page.delete'); }
            }
        }
    };
    return calls;
}

test('roamWrite - Todas las escrituras comparten el mismo presupuesto', async () => {
    const { sleeps } = useFakeClock();
    const calls = fakeRoamWrites();

    await DGT.roamWrite.createPage({ page: { title: 'x' } });
    await DGT.roamWrite.createBlock({ location: { 'parent-uid': 'p', order: 0 }, block: { string: 'a' } });
    await DGT.roamWrite.updateBlock({ block: { uid: 'b', string: 'c' } });
    assert.deepStrictEqual(sleeps.filter(ms => ms > 0), [], 'bajo el límite no hay pausas');

    await DGT.roamWrite.deleteBlock({ block: { uid: 'b' } });
    assert.deepStrictEqual(calls, ['page.create', 'block.create', 'block.update', 'block.delete']);
    const pauses = sleeps.filter(ms => ms > 0);
    assert.strictEqual(pauses.length, 1, 'la cuarta escritura espera a que se libere la ventana');
    assert.ok(pauses[0] >= MT.WINDOW_MS, 'espera hasta que vence la escritura más antigua');
});

test('setProgressCallback - No reinicia el conteo de escrituras previas', async () => {
    const { sleeps } = useFakeClock();
    fakeRoamWrites();

    await DGT.roamWrite.updateBlock({ block: { uid: 'a', string: '1' } });
    await DGT.roamWrite.updateBlock({ block: { uid: 'a', string: '2' } });
    await DGT.roamWrite.updateBlock({ block: { uid: 'a', string: '3' } });

    const messages = [];
    MT.setProgressCallback(msg => messages.push(msg));
    await DGT.roamWrite.updateBlock({ block: { uid: 'a', string: '4' } });
    MT.setProgressCallback(null);

    assert.strictEqual(sleeps.filter(ms => ms > 0).length, 1);
    assert.ok(messages.some(m => m.includes('Pausa preventiva')), 'informa la pausa al callback de progreso');
});

test('applyProjectChanges - Sus escrituras pasan por el limitador', async () => {
    const { sleeps } = useFakeClock();
    fakeRoamWrites();

    const changes = ['a', 'b', 'c', 'd'].map(uid => ({ uid, from: null, to: 'tesis' }));
    const res = await DGT.applyProjectChanges(changes);

    assert.strictEqual(res.created, 4);
    assert.strictEqual(sleeps.filter(ms => ms > 0).length, 1, 'la cuarta creación espera');
});

test('execute - Reintenta ante un error de límite de Roam', async () => {
    const { sleeps } = useFakeClock();
    let attempts = 0;
    const result = await MT.execute(async () => {
        attempts++;
        if (attempts === 1) throw new Error('maximum mutation rate limit exceeded');
        return 'ok';
    });
    assert.strictEqual(result, 'ok');
    assert.strictEqual(attempts, 2);
    assert.ok(sleeps.includes(20000), 'espera 20 s antes de reintentar');
});
