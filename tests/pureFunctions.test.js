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
require('../src/core/epubGenerator.js');

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

test('EpubGenerator.processInlineMarkdown - Formateo de cursivas de Roam (__texto__)', () => {
    const epub = DGT.EpubGenerator;
    assert.strictEqual(epub.processInlineMarkdown('Texto en __cursiva__'), 'Texto en <em>cursiva</em>');
    assert.strictEqual(epub.processInlineMarkdown('__una__ y __dos__ cursivas'), '<em>una</em> y <em>dos</em> cursivas');
    assert.strictEqual(epub.processInlineMarkdown('**negrita con __cursiva__**'), '<strong>negrita con <em>cursiva</em></strong>');
    assert.strictEqual(epub.processInlineMarkdown('__cursiva con **negrita**__'), '<em>cursiva con <strong>negrita</strong></em>');
    assert.strictEqual(epub.processInlineMarkdown('*asteriscos* y __guiones bajos__'), '<em>asteriscos</em> y <em>guiones bajos</em>');
});

test('EpubGenerator.stripMarkdown - Limpieza de cursivas de Roam (__texto__)', () => {
    const epub = DGT.EpubGenerator;
    assert.strictEqual(epub.stripMarkdown('Título con __cursiva__ y **negrita**'), 'Título con cursiva y negrita');
    assert.strictEqual(epub.stripMarkdown('__cursiva__'), 'cursiva');
});

test('EpubGenerator.parseMarkdownToChapters - Con namespaces como títulos H1', () => {
    const epub = DGT.EpubGenerator;
    const md = `# Estructura de Investigación

# Marco Teórico

## [[QUE]] - ¿Pregunta 1?
### [[CLM]] - Afirmación 1

## [[QUE]] - ¿Pregunta 2?

# Metodología

## [[QUE]] - ¿Pregunta 3?
`;

    const items = epub.parseMarkdownToChapters(md);
    assert.strictEqual(items.length, 5);

    // Item 0: Section Marco Teórico
    assert.strictEqual(items[0].type, 'section');
    assert.strictEqual(items[0].title, 'Marco Teórico');
    assert.strictEqual(items[0].fileId, 'section1');
    assert.strictEqual(items[0].id, 'section-1');

    // Item 1: Chapter 1
    assert.strictEqual(items[1].type, 'chapter');
    assert.strictEqual(items[1].title, '¿Pregunta 1?');
    assert.strictEqual(items[1].numberPrefix, '1. ');
    assert.strictEqual(items[1].sectionId, 'section-1');
    assert.strictEqual(items[1].subItems.length, 1);

    // Item 2: Chapter 2
    assert.strictEqual(items[2].type, 'chapter');
    assert.strictEqual(items[2].title, '¿Pregunta 2?');
    assert.strictEqual(items[2].numberPrefix, '2. ');
    assert.strictEqual(items[2].sectionId, 'section-1');

    // Item 3: Section Metodología
    assert.strictEqual(items[3].type, 'section');
    assert.strictEqual(items[3].title, 'Metodología');
    assert.strictEqual(items[3].fileId, 'section2');
    assert.strictEqual(items[3].id, 'section-2');

    // Item 4: Chapter 3
    assert.strictEqual(items[4].type, 'chapter');
    assert.strictEqual(items[4].title, '¿Pregunta 3?');
    assert.strictEqual(items[4].numberPrefix, '3. ');
    assert.strictEqual(items[4].sectionId, 'section-2');
});

test('EpubGenerator.parseMarkdownToChapters - Sin namespaces (retrocompatibilidad)', () => {
    const epub = DGT.EpubGenerator;
    const md = `# Estructura de Investigación

## [[QUE]] - ¿Pregunta A?
## [[QUE]] - ¿Pregunta B?
`;

    const items = epub.parseMarkdownToChapters(md);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].type, 'chapter');
    assert.strictEqual(items[0].numberPrefix, '1. ');
    assert.strictEqual(items[1].type, 'chapter');
    assert.strictEqual(items[1].numberPrefix, '2. ');
});

test('EpubGenerator._groupItemsBySection - Agrupamiento de secciones y capítulos', () => {
    const epub = DGT.EpubGenerator;
    const items = [
        { type: 'section', title: 'Sec1', fileId: 'section1' },
        { type: 'chapter', title: 'Chap1', fileIndex: 1 },
        { type: 'chapter', title: 'Chap2', fileIndex: 2 },
        { type: 'section', title: 'Sec2', fileId: 'section2' },
        { type: 'chapter', title: 'Chap3', fileIndex: 3 }
    ];

    const groups = epub._groupItemsBySection(items);
    assert.strictEqual(groups.length, 2);
    assert.strictEqual(groups[0].section.title, 'Sec1');
    assert.strictEqual(groups[0].chapters.length, 2);
    assert.strictEqual(groups[1].section.title, 'Sec2');
    assert.strictEqual(groups[1].chapters.length, 1);
});

test('EpubGenerator.createSectionXhtml - Generación de página divisora', () => {
    const epub = DGT.EpubGenerator;
    const section = { type: 'section', title: 'Marco Teórico', fileId: 'section1', id: 'section-1' };
    const html = epub.createSectionXhtml(section);

    assert.ok(html.includes('<title>Marco Teórico</title>'));
    assert.ok(html.includes('<div class="section-divider">'));
    assert.ok(html.includes('<h1 id="section-1">Marco Teórico</h1>'));
});

test('EpubGenerator - Manifest y Spine en createContentOpf con secciones', () => {
    const epub = DGT.EpubGenerator;
    const items = [
        { type: 'section', fileId: 'section1' },
        { type: 'chapter', fileIndex: 1 }
    ];
    const opf = epub.createContentOpf('Test Title', 'Test Author', '2026-09-16', 'uuid-123', items);

    assert.ok(opf.includes('<item id="section1" href="section1.xhtml" media-type="application/xhtml+xml"/>'));
    assert.ok(opf.includes('<item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>'));
    assert.ok(opf.includes('<itemref idref="section1"/>'));
    assert.ok(opf.includes('<itemref idref="chapter1"/>'));
});

test('EpubGenerator - Estructura jerárquica en nav.xhtml y toc.ncx', () => {
    const epub = DGT.EpubGenerator;
    const items = [
        { type: 'section', title: 'Marco', fileId: 'section1', id: 'section-1' },
        { type: 'chapter', title: 'Pregunta 1', fileIndex: 1, numberPrefix: '1. ', subItems: [] }
    ];

    const nav = epub.createNavXhtml('Test Title', items);
    assert.ok(nav.includes('<a href="section1.xhtml">Marco</a>'));
    assert.ok(nav.includes('<a href="chapter1.xhtml">1. Pregunta 1</a>'));

    const ncx = epub.createTocNcx('Test Title', 'uuid-123', items);
    assert.ok(ncx.includes('<content src="section1.xhtml"/>'));
    assert.ok(ncx.includes('<content src="chapter1.xhtml"/>'));
});


