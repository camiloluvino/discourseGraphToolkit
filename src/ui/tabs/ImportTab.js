// ============================================================================
// UI: Import Tab Component
// ============================================================================

DiscourseGraphToolkit.ImportTab = function (props) {
    const React = window.React;
    const { exportStatus, setExportStatus } = props;

    // --- Render ---
    return React.createElement('div', null,
        React.createElement('h3', null, 'Importar Grafos'),
        React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

        React.createElement('div', { style: { marginTop: '1.25rem', padding: '1.25rem', border: '2px dashed #ccc', borderRadius: '0.5rem', textAlign: 'center' } },
            React.createElement('input', {
                type: 'file',
                accept: '.json',
                id: 'import-file-input',
                style: { display: 'none' },
                onChange: (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                            setExportStatus("Importando...");
                            try {
                                const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setExportStatus(msg));

                                let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                if (result.errors && result.errors.length > 0) {
                                    statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                    DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                } else {
                                    DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                }
                                setExportStatus(statusMsg);

                            } catch (err) {
                                console.error(err);
                                setExportStatus(`❌ Error fatal: ${err.message}`);
                                DiscourseGraphToolkit.showToast("Error en importación.", "error");
                            }
                        };
                        reader.readAsText(file);
                    }
                }
            }),
            React.createElement('label', {
                htmlFor: 'import-file-input',
                style: {
                    display: 'inline-block', padding: '0.625rem 1.25rem', backgroundColor: '#2196F3', color: 'white',
                    borderRadius: '0.25rem', cursor: 'pointer', fontSize: '1rem'
                }
            }, 'Seleccionar Archivo JSON')
        ),
        exportStatus && React.createElement('div', { style: { marginTop: '1.25rem', padding: '0.625rem', backgroundColor: '#f5f5f5', borderRadius: '0.25rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' } }, exportStatus)
    );
};
