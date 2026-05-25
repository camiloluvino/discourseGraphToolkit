const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Configurar mocks globales para el entorno de Node.js
global.window = {
    location: { hash: '' }
};
global.DiscourseGraphToolkit = {};

// Cargar archivos de origen
require('../src/config.js');
require('../src/utils/helpers.js');

// markdownCore.js declara var MarkdownCore en el scope local del m├│dulo en Node.js,
// por lo que debemos evaluarlo en el contexto global de test para que sea accesible.
const markdownCoreCode = fs.readFileSync(path.resolve(__dirname, '../src/core/markdownCore.js'), 'utf8');
vm.runInThisContext(markdownCoreCode + '\nglobal.MarkdownCore = MarkdownCore;');

const DGT = global.DiscourseGraphToolkit;

test('computeFavoriteName - Set de proyectos con ancestro com├║n', () => {
    const set = new Set(['tesis', 'tesis/marco', 'tesis/marco/metodologia', 'tesis/marco/analisis']);
    assert.strictEqual(DGT.computeFavoriteName(set), 'tesis/marco');
});

test('computeFavoriteName - Set de proyectos sin ancestro com├║n', () => {
    const set = new Set(['proyectoA/sub', 'proyectoB/sub']);
    assert.strictEqual(DGT.computeFavoriteName(set), 'proyectoA/sub|proyectoB/sub');
});

test('computeFavoriteName - Array de proyectos', () => {
    const arr = ['tesis/marco/metodologia', 'tesis/marco/analisis'];
    assert.strictEqual(DGT.computeFavoriteName(arr), 'tesis/marco');
});

test('computeFavoriteName - Objeto de proyectos de ExportTab', () => {
    const obj = {
        'tesis/marco/metodologia': true,
        'tesis/marco/analisis': true,
        'otro/proyecto': false
    };
    assert.strictEqual(DGT.computeFavoriteName(obj), 'tesis/marco');
});

test('computeFavoriteName - Casos vac├¡os y nulos', () => {
    assert.strictEqual(DGT.computeFavoriteName(null), 'favorito');
    assert.strictEqual(DGT.computeFavoriteName(new Set()), 'favorito');
});

test('sanitizeFilename - Limpieza de nombres de archivo', () => {
    assert.strictEqual(DGT.sanitizeFilename('Simple Name'), 'simple_name');
    assert.strictEqual(DGT.sanitizeFilename('Name/With/Slashes'), 'name-with-slashes');
    assert.strictEqual(DGT.sanitizeFilename('../../etc/passwd'), '--etc-passwd');
    assert.strictEqual(DGT.sanitizeFilename('Invalid*Chars?'), 'invalidchars');
    assert.strictEqual(DGT.sanitizeFilename('A'.repeat(100)), 'a'.repeat(50));
    assert.strictEqual(DGT.sanitizeFilename(''), 'export');
});

test('escapeDatalogString - Escape de consultas Datalog', () => {
    assert.strictEqual(DGT.escapeDatalogString('normal string'), 'normal string');
    assert.strictEqual(DGT.escapeDatalogString('string con "comillas"'), 'string con \\"comillas\\"');
    assert.strictEqual(DGT.escapeDatalogString('string con \\barra'), 'string con \\\\barra');
    assert.strictEqual(DGT.escapeDatalogString(null), '');
});

test('cleanText - Limpieza de formato de Roam', () => {
    assert.strictEqual(DGT.cleanText('[[QUE]] - texto'), 'QUE - texto');
    assert.strictEqual(DGT.cleanText('**negrita** texto'), 'negrita texto');
    assert.strictEqual(DGT.cleanText('[[enlace]]'), 'enlace');
    assert.strictEqual(DGT.cleanText('  espacios  '), 'espacios');
});

test('getNodeType - Detecci├│n de tipos de nodo', () => {
    assert.strictEqual(DGT.getNodeType('[[QUE]] - La pregunta?'), 'QUE');
    assert.strictEqual(DGT.getNodeType('[[CLM]] - La afirmaci├│n'), 'CLM');
    assert.strictEqual(DGT.getNodeType('[[EVD]] - La evidencia'), 'EVD');
    assert.strictEqual(DGT.getNodeType('[[GRI]] - El grupo'), 'GRI');
    assert.strictEqual(DGT.getNodeType('T├¡tulo cualquiera'), null);
    assert.strictEqual(DGT.getNodeType(null), null);
});

test('formatExportProjectName - Formateo de nombres de proyecto para exportaci├│n', () => {
    assert.strictEqual(DGT.formatExportProjectName('tesis/marco/analisis'), 'tesis_marco_analisis');
    assert.strictEqual(DGT.formatExportProjectName('tesis/marco/epistemolog├¡a'), 'tesis_marco_epistemologa');
});

test('MarkdownCore.cleanText - Limpieza de espacios extra', () => {
    assert.strictEqual(global.MarkdownCore.cleanText('  hola   mundo  '), 'hola mundo');
    assert.strictEqual(global.MarkdownCore.cleanText(''), '');
});
