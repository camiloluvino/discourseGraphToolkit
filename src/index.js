// ============================================================================
// 6. INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Run storage migration to graph-specific keys (one-time)
    DiscourseGraphToolkit.migrateStorageToGraphSpecific();

    // Inicializar sincronización con un pequeño retraso para asegurar que Roam esté listo
    setTimeout(() => {
        DiscourseGraphToolkit.initializeProjectsSync();
    }, 5000);

    // Cargar config desde Roam si existe
    setTimeout(() => {
        DiscourseGraphToolkit.loadConfigFromRoam().then(data => {
            if (data) console.log("Configuración cargada desde Roam.");
        });
    }, 5500);

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
