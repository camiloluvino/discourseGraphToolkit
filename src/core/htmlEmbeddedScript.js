// ============================================================================
// CORE: HTML Embedded Script
// Este código se inyecta en el HTML exportado por htmlGenerator.js
// ============================================================================

// IMPORTANTE: Este archivo se lee como texto plano durante el build
// y se inserta dentro de tags de script en el HTML final.
// NO uses import/export, este código corre standalone en el navegador.



// --- MarkdownCore se inyecta aquí por build.ps1 ---
// (El build concatena markdownCore.js ANTES de este archivo)


// --- Orden persistido ---
var ORDER_KEY = 'discourseGraph_questionOrder';

function saveOrder() {
    var order = [];
    document.querySelectorAll('.que-node').forEach(function (el) {
        order.push(el.id);
    });
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    showCopySuccess('Orden guardado');
}

function loadOrder() {
    var saved = localStorage.getItem(ORDER_KEY);
    if (!saved) return;
    try {
        var order = JSON.parse(saved);
        var container = document.querySelector('.que-node').parentNode;
        order.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) container.appendChild(el);
        });
    } catch (e) { console.warn('Error loading order:', e); }
}

function resetOrder() {
    localStorage.removeItem(ORDER_KEY);
    location.reload();
}

document.addEventListener('DOMContentLoaded', function () {
    // Cargar orden guardado
    loadOrder();

    var coll = document.getElementsByClassName("collapsible");
    for (var i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function (e) {
            if (e.target.tagName === 'BUTTON') return;
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.classList.contains("show-content")) {
                content.classList.remove("show-content");
                content.style.maxHeight = "0";
            } else {
                content.classList.add("show-content");
                content.style.maxHeight = content.scrollHeight + "px";
                setTimeout(function () { if (content.classList.contains("show-content")) content.style.maxHeight = "none"; }, 300);
            }
        });
    }

    document.getElementById('expandAll').addEventListener('click', function () {
        document.querySelectorAll('.content').forEach(function (c) { c.classList.add('show-content'); c.style.maxHeight = "none"; });
        document.querySelectorAll('.collapsible').forEach(function (c) { c.classList.add('active'); });
    });

    document.getElementById('collapseAll').addEventListener('click', function () {
        document.querySelectorAll('.content').forEach(function (c) { c.classList.remove('show-content'); c.style.maxHeight = "0"; });
        document.querySelectorAll('.collapsible').forEach(function (c) { c.classList.remove('active'); });
    });

    document.getElementById('copyAll').addEventListener('click', function () {
        var text = document.body.innerText;
        copyToClipboard(text);
    });

    document.getElementById('exportMarkdown').addEventListener('click', function () {
        exportToMarkdown();
    });
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
        showCopySuccess();
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

function showCopySuccess(msg) {
    var div = document.createElement('div');
    div.className = 'copy-success show';
    div.textContent = msg || 'Copiado!';
    document.body.appendChild(div);
    setTimeout(function () { document.body.removeChild(div); }, 2000);
}

function exportToMarkdown() {
    // Cargar datos embebidos
    var dataEl = document.getElementById('embedded-data');
    if (!dataEl) {
        alert('Error: No se encontraron datos embebidos para exportar.');
        return;
    }
    var data = JSON.parse(dataEl.textContent);
    var originalQuestions = data.questions;
    var allNodes = data.allNodes;
    var config = data.config;
    var excludeBitacora = data.excludeBitacora;

    // Reordenar questions según el orden actual del DOM
    var domOrder = [];
    document.querySelectorAll('.que-node').forEach(function (el) {
        // El ID es "q0", "q1", etc. - extraer el índice
        var idx = parseInt(el.id.replace('q', ''), 10);
        if (!isNaN(idx) && originalQuestions[idx]) {
            domOrder.push(originalQuestions[idx]);
        }
    });
    // Usar el orden del DOM si está disponible, sino el original
    var questions = domOrder.length > 0 ? domOrder : originalQuestions;

    // Usar MarkdownCore (inyectado por build.ps1)
    var result = MarkdownCore.generateMarkdown(questions, allNodes, config, excludeBitacora, false);

    // Descargar archivo con el mismo nombre que el HTML
    var fileName = (document.title || 'mapa_discurso').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_') + '.md';
    var blob = new Blob([result], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    showCopySuccess('Markdown exportado');
}

function copyIndividualQuestion(id) { copyToClipboard(document.getElementById(id).innerText); }
function copyIndividualCLM(id) { copyToClipboard(document.getElementById(id).innerText); }

function exportQuestionMarkdown(questionIndex) {
    var dataEl = document.getElementById('embedded-data');
    if (!dataEl) { alert('Error: No se encontraron datos embebidos.'); return; }
    var data = JSON.parse(dataEl.textContent);
    var allNodes = data.allNodes;
    var config = data.config;
    var excludeBitacora = data.excludeBitacora;
    var question = data.questions[questionIndex];
    if (!question) { alert('Error: Pregunta no encontrada.'); return; }

    // Usar MarkdownCore para generar Markdown de una pregunta
    var result = MarkdownCore.generateQuestionMarkdown(question, allNodes, config, excludeBitacora);

    var qTitle = MarkdownCore.cleanText((question.title || '').replace('[[QUE]] - ', ''));
    var fileName = 'QUE_' + qTitle.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_') + '.md';
    var blob = new Blob([result], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    showCopySuccess('Markdown exportado: ' + qTitle.substring(0, 20) + '...');
}

function moveQuestionUp(id) {
    var el = document.getElementById(id);
    // Buscar el hermano anterior que sea un que-node
    var prev = el.previousElementSibling;
    while (prev && !prev.classList.contains('que-node')) {
        prev = prev.previousElementSibling;
    }
    if (prev) {
        el.parentNode.insertBefore(el, prev);
        saveOrder();
    }
}
function moveQuestionDown(id) {
    var el = document.getElementById(id);
    // Buscar el hermano siguiente que sea un que-node
    var next = el.nextElementSibling;
    while (next && !next.classList.contains('que-node')) {
        next = next.nextElementSibling;
    }
    if (next) {
        // Insertar después del siguiente que-node
        el.parentNode.insertBefore(el, next.nextSibling);
        saveOrder();
    }
}
