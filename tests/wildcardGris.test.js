const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Set up global mock for window
global.window = {
    location: { hash: '' }
};
global.DiscourseGraphToolkit = {
    VERSION: 'test',
    cleanText: (text) => {
        if (!text || typeof text !== 'string') return "";
        return text.replace(/\[\[QUE\]\] - |\[\[CLM\]\] - |\[\[EVD\]\] - |\[\[GRI\]\] - /, "").trim();
    },
    getNodeType: (title) => {
        if (!title) return null;
        if (title.includes('[[QUE]]')) return 'QUE';
        if (title.includes('[[CLM]]')) return 'CLM';
        if (title.includes('[[EVD]]')) return 'EVD';
        if (title.includes('[[GRI]]')) return 'GRI';
        return null;
    }
};

// Mock HtmlHelpers and ContentProcessor
global.DiscourseGraphToolkit.HtmlHelpers = {
    generateMetadataHtml: () => '',
    formatContentForHtml: (content) => content
};
global.DiscourseGraphToolkit.ContentProcessor = {
    extractNodeContent: (data, configFlag, type) => data ? (data.string || '') : ''
};

// Load relationshipMapper.js
const mapperCode = fs.readFileSync(path.resolve(__dirname, '../src/core/relationshipMapper.js'), 'utf8');
vm.runInThisContext(mapperCode);

// Load markdownCore.js
const markdownCoreCode = fs.readFileSync(path.resolve(__dirname, '../src/core/markdownCore.js'), 'utf8');
vm.runInThisContext(markdownCoreCode + '\nglobal.MarkdownCore = MarkdownCore;');

// Load htmlNodeRenderers.js
const htmlRenderersCode = fs.readFileSync(path.resolve(__dirname, '../src/core/html/htmlNodeRenderers.js'), 'utf8');
vm.runInThisContext(htmlRenderersCode);

test('Wildcard GRI relationships mapping and rendering', () => {
    // 1. Mock Node structure
    const allNodes = {
        'que1': {
            uid: 'que1',
            type: 'QUE',
            title: '[[QUE]] - ¿Cómo influyen los GRIs?',
            data: {
                children: [
                    {
                        string: '[[GRI]] - Grupo Wildcard #RespondedBy',
                        refs: [{ uid: 'gri1' }]
                    }
                ]
            }
        },
        'gri1': {
            uid: 'gri1',
            type: 'GRI',
            title: '[[GRI]] - Grupo Wildcard',
            data: {
                children: [
                    {
                        string: '[[CLM]] - Afirmación dentro de GRI #Contains',
                        refs: [{ uid: 'clm1' }]
                    },
                    {
                        string: '[[CLM]] - Afirmación de soporte #SupportedBy',
                        refs: [{ uid: 'clm2' }]
                    },
                    {
                        string: '[[CLM]] - Afirmación conectada #RelatedTo',
                        children: [
                            {
                                string: '[[CLM]] - Afirmación conectada',
                                refs: [{ uid: 'clm3' }]
                            }
                        ]
                    }
                ]
            }
        },
        'clm1': {
            uid: 'clm1',
            type: 'CLM',
            title: '[[CLM]] - Afirmación dentro de GRI',
            data: { children: [] }
        },
        'clm2': {
            uid: 'clm2',
            type: 'CLM',
            title: '[[CLM]] - Afirmación de soporte',
            data: { children: [] }
        },
        'clm3': {
            uid: 'clm3',
            type: 'CLM',
            title: '[[CLM]] - Afirmación conectada',
            data: { children: [] }
        }
    };

    // 2. Map relationships
    DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

    // Verify mapping
    assert.ok(allNodes['que1'].related_gris.includes('gri1'), 'QUE should respond by GRI');
    assert.ok(allNodes['gri1'].contained_nodes.includes('clm1'), 'GRI should contain CLM1');
    assert.ok(allNodes['gri1'].supporting_clms.includes('clm2'), 'GRI should be supported by CLM2');
    assert.ok(allNodes['gri1'].connected_clms.includes('clm3'), 'GRI should relate to CLM3');

    // 3. Verify Markdown Rendering
    const md = MarkdownCore.generateMarkdown([allNodes['que1']], allNodes, { QUE: true, CLM: true, GRI: true, EVD: true }, false, false);
    console.log('--- Generated Markdown ---');
    console.log(md);
    assert.ok(md.includes('¿Cómo influyen los GRIs?'), 'Markdown should contain QUE title');
    assert.ok(md.includes('Grupo Wildcard'), 'Markdown should contain GRI title');
    assert.ok(md.includes('Afirmación dentro de GRI'), 'Markdown should contain contained CLM title');
    assert.ok(md.includes('Afirmación de soporte'), 'Markdown should contain supporting CLM title');
    assert.ok(md.includes('Afirmación conectada'), 'Markdown should contain connected CLM title');

    // 4. Verify HTML Rendering
    const html = DiscourseGraphToolkit.HtmlNodeRenderers.renderQuestion(allNodes['que1'], 1, allNodes, { QUE: true, CLM: true, GRI: true, EVD: true }, false, false);
    console.log('--- Generated HTML ---');
    console.log(html);
    assert.ok(html.includes('¿Cómo influyen los GRIs?'), 'HTML should contain QUE title');
    assert.ok(html.includes('Grupo Wildcard'), 'HTML should contain GRI title');
    assert.ok(html.includes('Afirmación dentro de GRI'), 'HTML should contain contained CLM title');
    assert.ok(html.includes('Afirmación de soporte'), 'HTML should contain supporting CLM title');
    assert.ok(html.includes('Afirmación conectada'), 'HTML should contain connected CLM title');
});
