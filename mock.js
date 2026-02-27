global.window = { location: { hash: '' } };
global.document = {
    head: { appendChild: () => { } },
    createElement: () => ({ style: {} }),
    readyState: 'complete',
    getElementById: () => null
};
global.localStorage = { getItem: () => { }, setItem: () => { } };
try {
    require('./discourse-graph-toolkit.js');
    console.log("Script evaluated successfully.");
} catch (e) {
    console.error("ERROR EVALUATING:\n", e.stack);
}
