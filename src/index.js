// ============================================================================
// INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Run storage migration to graph-specific keys (one-time)
    DiscourseGraphToolkit.migrateStorageToGraphSpecific();

    // Helper para esperar a que la API de Roam esté funcional
    DiscourseGraphToolkit._waitForRoamReady = async function (maxWait = 15000, interval = 500) {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            try {
                // Verificar que la API responde a queries asíncronas
                const test = await window.roamAlphaAPI.data.async.q('[:find ?e :where [?e :db/ident :db/ident] :limit 1]');
                if (test) return true;
            } catch (e) { /* Aún no lista */ }
            await new Promise(r => setTimeout(r, interval));
        }
        return false;
    };

    // Inicializar sincronización secuencialmente cuando Roam esté listo
    DiscourseGraphToolkit._waitForRoamReady().then(ready => {
        if (!ready) {
            console.warn("[DiscourseGraphToolkit] Roam API no estuvo lista después de 15 segundos.");
            return;
        }

        console.log("[DiscourseGraphToolkit] Roam API lista, iniciando sincronización...");
        
        DiscourseGraphToolkit.initializeProjectsSync()
            .then(() => {
                return DiscourseGraphToolkit.loadConfigFromRoam();
            })
            .then(data => {
                if (data) console.log("Configuración cargada desde Roam.");
            })
            .catch(e => {
                console.error("Error en inicialización:", e);
                DiscourseGraphToolkit.showToast("⚠️ Error inicializando plugin", "warning");
            });
    });

    // Registrar Comandos
    // Lista de comandos registrados (para cleanup en recargas)
    DiscourseGraphToolkit._registeredCommands = [
        'Discourse Graph Toolkit: Abrir',
        'Discourse Graph: Crear Pregunta (QUE)',
        'Discourse Graph: Crear Afirmación (CLM)',
        'Discourse Graph: Crear Evidencia (EVD)'
    ];

    // Limpiar comandos previos si existen (para manejar recargas del script)
    DiscourseGraphToolkit._registeredCommands.forEach(label => {
        try {
            window.roamAlphaAPI.ui.commandPalette.removeCommand({ label });
        } catch (e) { /* Ignorar - el comando no existía */ }
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph Toolkit: Abrir',
        callback: () => DiscourseGraphToolkit.openModal()
    });


    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Pregunta (QUE)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("QUE"),
        "default-hotkey": "ctrl-shift-q"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Afirmación (CLM)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("CLM"),
        "default-hotkey": "ctrl-shift-c"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Evidencia (EVD)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("EVD"),
        "default-hotkey": "ctrl-shift-e"
    });

    console.log(`✅ Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION} cargado.`);
} else {
    console.error("Roam Alpha API no disponible.");
}
