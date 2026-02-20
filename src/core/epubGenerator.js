// ============================================================================
// CORE: EPUB Generator
// Generates EPUB files directly in the browser using JSZip
// ============================================================================

DiscourseGraphToolkit.EpubGenerator = {
    // JSZip will be loaded dynamically
    JSZip: null,

    // Load JSZip from CDN if not already loaded
    loadJSZip: async function () {
        if (this.JSZip) return this.JSZip;
        if (window.JSZip) {
            this.JSZip = window.JSZip;
            return this.JSZip;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                this.JSZip = window.JSZip;
                resolve(this.JSZip);
            };
            script.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(script);
        });
    },

    // Convert flat markdown to EPUB
    generateEpub: async function (flatMarkdown, metadata = {}) {
        const JSZip = await this.loadJSZip();
        const zip = new JSZip();

        const title = metadata.title || 'Discourse Graph Export';
        const author = metadata.author || 'Discourse Graph Toolkit';
        const date = new Date().toISOString().split('T')[0];
        const uuid = 'urn:uuid:' + this.generateUUID();

        // Parse markdown into chapters
        const chapters = this.parseMarkdownToChapters(flatMarkdown);

        // Create EPUB structure
        // 1. mimetype (must be first and uncompressed)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

        // 2. META-INF/container.xml
        zip.file('META-INF/container.xml', this.createContainerXml());

        // 3. OEBPS/content.opf (package file)
        zip.file('OEBPS/content.opf', this.createContentOpf(title, author, date, uuid, chapters));

        // 4. OEBPS/toc.ncx (navigation)
        zip.file('OEBPS/toc.ncx', this.createTocNcx(title, uuid, chapters));

        // 5. OEBPS/nav.xhtml (EPUB3 navigation)
        zip.file('OEBPS/nav.xhtml', this.createNavXhtml(title, chapters));

        // 6. OEBPS/styles.css
        zip.file('OEBPS/styles.css', this.createStylesCss());

        // 7. OEBPS/chapter files
        chapters.forEach((chapter, index) => {
            zip.file(`OEBPS/chapter${index + 1}.xhtml`, this.createChapterXhtml(chapter, index + 1));
        });

        // Generate the zip file
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/epub+zip',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        return blob;
    },

    // Parse flat markdown into chapters based on ## headings (QUE nodes)
    parseMarkdownToChapters: function (markdown) {
        const chapters = [];
        const lines = markdown.split('\n');
        let currentChapter = null;

        // Use a counter tracker exactly like markdownToXhtml to build IDs for ToC
        let counters = [0, 0, 0, 0, 0, 0];

        const getHierarchyPrefix = (level) => {
            const index = level - 1;
            counters[index]++;
            for (let i = index + 1; i < counters.length; i++) {
                counters[i] = 0;
            }
            return counters.slice(1, index + 1).join('.') + ' ';
        };

        for (const line of lines) {
            // H1 is the main title, skip it
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                continue;
            }

            // H2 (##) starts a new chapter (QUE)
            if (line.startsWith('## ')) {
                if (currentChapter) {
                    chapters.push(currentChapter);
                }
                const rawTitle = line.replace(/^##\s*/, '');
                counters[0] = 0; // NOT USED
                counters[1]++; // chapterNum
                for (let i = 2; i < 6; i++) counters[i] = 0; // reset lower

                currentChapter = {
                    title: this.cleanTitle(rawTitle),
                    nodeType: this.extractNodeType(rawTitle),
                    level: 2,
                    content: [],
                    id: `node-${counters[1]}`, // H2 anchor
                    numberPrefix: `${counters[1]}. `,
                    subItems: []
                };
            } else if (currentChapter) {
                currentChapter.content.push(line);

                // Track subheadings for ToC
                const trimmed = line.trim();
                if (trimmed.startsWith('### ')) {
                    const prefix = getHierarchyPrefix(3);
                    currentChapter.subItems.push({
                        level: 3,
                        title: this.cleanTitle(trimmed.replace(/^###\s*/, '')),
                        id: `node-${counters.slice(1, 3).join('-')}`,
                        numberPrefix: prefix
                    });
                } else if (trimmed.startsWith('#### ')) {
                    const prefix = getHierarchyPrefix(4);
                    currentChapter.subItems.push({
                        level: 4,
                        title: this.cleanTitle(trimmed.replace(/^####\s*/, '')),
                        id: `node-${counters.slice(1, 4).join('-')}`,
                        numberPrefix: prefix
                    });
                } else if (trimmed.startsWith('##### ')) {
                    const prefix = getHierarchyPrefix(5);
                    currentChapter.subItems.push({
                        level: 5,
                        title: this.cleanTitle(trimmed.replace(/^#####\s*/, '')),
                        id: `node-${counters.slice(1, 5).join('-')}`,
                        numberPrefix: prefix
                    });
                }
            }
        }

        if (currentChapter) {
            chapters.push(currentChapter);
        }

        return chapters;
    },

    // Detect node type from title
    extractNodeType: function (title) {
        if (title.indexOf('[[QUE]]') !== -1) return 'QUE';
        if (title.indexOf('[[CLM]]') !== -1) return 'CLM';
        if (title.indexOf('[[EVD]]') !== -1) return 'EVD';
        return null;
    },

    // Clean title from Roam markup
    cleanTitle: function (title) {
        return title
            .replace(/\[\[QUE\]\]\s*-\s*/g, '')
            .replace(/\[\[CLM\]\]\s*-\s*/g, '')
            .replace(/\[\[EVD\]\]\s*-\s*/g, '')
            .replace(/\[\[([^\]]+)\]\]/g, '$1')
            .trim();
    },

    // Convert markdown content to XHTML
    markdownToXhtml: function (lines, chapterNum) {
        let html = '';
        let inParagraph = false;

        // Counters for H2, H3, H4, H5, H6 (index 0 is unused, index 1 is H2, index 2 is H3, etc.)
        // We use an offset since chapter H2 is tracked by chapterNum
        let counters = [0, chapterNum, 0, 0, 0, 0];

        // Helper to increment counters and get the hierarchy string
        const getHierarchyPrefix = (level) => {
            // Level 2 is H2, Level 3 is H3, etc.
            const index = level - 1;
            counters[index]++;
            // Reset lower levels
            for (let i = index + 1; i < counters.length; i++) {
                counters[i] = 0;
            }
            // Build the string
            return counters.slice(1, index + 1).join('.') + ' ';
        };

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                if (inParagraph) {
                    html += '</p>\n';
                    inParagraph = false;
                }
                continue;
            }

            // Headers - with explicit level and node type prefixes for e-ink readability
            if (trimmed.startsWith('##### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const prefix = getHierarchyPrefix(5);
                const cleanText = this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^#####\s*/, '')));
                const id = `node-${counters.slice(1, 5).join('-')}`;
                html += `<h5 id="${id}">${prefix}[EVD] ${cleanText}</h5>\n`;
            } else if (trimmed.startsWith('#### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const prefix = getHierarchyPrefix(4);
                const nodeType = this.extractNodeType(trimmed) || 'EVD';
                const cleanText = this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^####\s*/, '')));
                const id = `node-${counters.slice(1, 4).join('-')}`;
                html += `<h4 id="${id}">${prefix}[${nodeType}] ${cleanText}</h4>\n`;
            } else if (trimmed.startsWith('### ')) {
                if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                const prefix = getHierarchyPrefix(3);
                const nodeType = this.extractNodeType(trimmed) || 'CLM';
                const cleanText = this.processInlineMarkdown(this.cleanTitle(trimmed.replace(/^###\s*/, '')));
                const id = `node-${counters.slice(1, 3).join('-')}`;
                html += `<h3 id="${id}">${prefix}[${nodeType}] ${cleanText}</h3>\n`;
            } else {
                // Detectar bloque estructural: *— texto —*
                const isStructuralBlock = /^\*—\s.+\s—\*$/.test(trimmed);
                if (isStructuralBlock) {
                    if (inParagraph) { html += '</p>\n'; inParagraph = false; }
                    html += `<p class="structural-block">${this.processInlineMarkdown(trimmed)}</p>\n`;
                } else {
                    // Regular paragraph
                    const cleanedLine = this.processInlineMarkdown(trimmed);
                    if (!inParagraph) {
                        html += '<p>';
                        inParagraph = true;
                    } else {
                        html += '<br/>\n';
                    }
                    html += cleanedLine;
                }
            }
        }

        if (inParagraph) {
            html += '</p>\n';
        }

        return html;
    },

    // Process inline markdown (bold, links, etc.)
    processInlineMarkdown: function (text) {
        let result = this.escapeHtml(text);
        // Bold **text**
        result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic *text*
        result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Clean Roam references [[text]]
        result = result.replace(/\[\[([^\]]+)\]\]/g, '$1');
        // Clean Roam block references ((uid))
        result = result.replace(/\(\([a-zA-Z0-9_-]+\)\)/g, '');
        return result;
    },

    escapeHtml: function (text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Strip markdown formatting for plain text contexts (titles, TOC)
    stripMarkdown: function (text) {
        return text
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text** → text
            .replace(/\*([^*]+)\*/g, '$1')       // Remove italic *text* → text
            .replace(/\[\[([^\]]+)\]\]/g, '$1'); // Remove [[links]] → links
    },

    generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // EPUB Structure Files
    createContainerXml: function () {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    },

    createContentOpf: function (title, author, date, uuid, chapters) {
        const manifestItems = chapters.map((_, i) =>
            `    <item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`
        ).join('\n');

        const spineItems = chapters.map((_, i) =>
            `    <itemref idref="chapter${i + 1}"/>`
        ).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${this.escapeHtml(title)}</dc:title>
    <dc:creator>${this.escapeHtml(author)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:date>${date}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
${spineItems}
  </spine>
</package>`;
    },

    createTocNcx: function (title, uuid, chapters) {
        let playOrder = 1;

        const tocNavPoint = `
    <navPoint id="navpoint${playOrder}" playOrder="${playOrder}">
      <navLabel><text>Tabla de Contenidos</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>`;
        playOrder++;

        let navPointsMarkup = '';
        chapters.forEach((chapter, i) => {
            const chapId = `navpoint${playOrder}`;
            const chapOrder = playOrder++;
            const chapTitle = this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)));
            const chapSrc = `chapter${i + 1}.xhtml`;

            navPointsMarkup += `
    <navPoint id="${chapId}" playOrder="${chapOrder}">
      <navLabel><text>${chapTitle}</text></navLabel>
      <content src="${chapSrc}"/>`;

            if (chapter.subItems && chapter.subItems.length > 0) {
                chapter.subItems.forEach((subItem) => {
                    const subId = `navpoint${playOrder}`;
                    const subOrder = playOrder++;
                    const subTitle = this.escapeHtml(this.stripMarkdown(subItem.title.substring(0, 80)));
                    navPointsMarkup += `
      <navPoint id="${subId}" playOrder="${subOrder}">
        <navLabel><text>${subItem.numberPrefix}${subTitle}</text></navLabel>
        <content src="${chapSrc}#${subItem.id}"/>
      </navPoint>`;
                });
            }

            navPointsMarkup += `
    </navPoint>`;
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeHtml(title)}</text></docTitle>
  <navMap>
${tocNavPoint}${navPointsMarkup}
  </navMap>
</ncx>`;
    },

    createNavXhtml: function (title, chapters) {
        const navItems = chapters.map((chapter, i) => {
            let itemHtml = `        <li><a href="chapter${i + 1}.xhtml">${chapter.numberPrefix}${this.escapeHtml(this.stripMarkdown(chapter.title.substring(0, 80)))}</a>`;
            if (chapter.subItems && chapter.subItems.length > 0) {
                itemHtml += `\n          <ol>\n`;
                chapter.subItems.forEach((subItem) => {
                    itemHtml += `            <li><a href="chapter${i + 1}.xhtml#${subItem.id}">${subItem.numberPrefix}${this.escapeHtml(this.stripMarkdown(subItem.title.substring(0, 80)))}</a></li>\n`;
                });
                itemHtml += `          </ol>\n        `;
            }
            itemHtml += `</li>`;
            return itemHtml;
        }).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this.escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Tabla de Contenidos</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
    },

    createStylesCss: function () {
        return `body {
  font-family: Georgia, "Times New Roman", serif;
  margin: 1em;
  line-height: 1.6;
}

h1, h2, h3, h4, h5 {
  font-family: Helvetica, Arial, sans-serif;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; color: #2196F3; }
h3 { font-size: 1.3em; color: #4CAF50; }
h4 { font-size: 1.1em; color: #FF9800; }
h5 { font-size: 1em; color: #666; }

p {
  margin: 0.5em 0;
  text-align: justify;
}

strong { font-weight: bold; }
em { font-style: italic; }

.structural-block {
  margin-top: 1.2em;
  margin-bottom: 1.2em;
}

nav ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}

nav li {
  margin: 0.3em 0;
}`;
    },

    createChapterXhtml: function (chapter, chapterNum) {
        const content = this.markdownToXhtml(chapter.content, chapterNum);

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeHtml(this.stripMarkdown(chapter.title))}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h2 id="node-${chapterNum}">${chapterNum}. [QUE] ${this.processInlineMarkdown(chapter.title)}</h2>
${content}
</body>
</html>`;
    }
};
