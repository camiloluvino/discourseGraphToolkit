// ============================================================================
// UTILS: Limitador de escrituras (Roam API Rate Limiter)
// Roam comparte entre TODAS las escrituras (y algunas funciones de UI) un
// presupuesto de 1500 llamadas por 60 segundos; al superarlo, la API lanza un
// error. Toda escritura del plugin debe pasar por DiscourseGraphToolkit.roamWrite
// (o por MutationThrottle.execute) para que el conteo sea compartido.
// ============================================================================

DiscourseGraphToolkit.MutationThrottle = {
    MAX_OPS_PER_WINDOW: 1400,   // Margen de seguridad sobre el límite de 1500/60s de Roam
    WINDOW_MS: 60000,           // Ventana móvil de 60 segundos
    MIN_DELAY_MS: 0,            // Yield mínimo (~4ms por setTimeout) para no congelar la UI
    callTimestamps: [],         // Persiste entre operaciones: el presupuesto de Roam es global
    onProgress: null,

    // Define a quién se informan las pausas (p. ej. la pestaña Importar); null para ninguno
    setProgressCallback: function (progressCallback) {
        this.onProgress = progressCallback || null;
    },

    now: function () {
        return Date.now();
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    _pruneWindow: function () {
        const now = this.now();
        this.callTimestamps = this.callTimestamps.filter(t => (now - t) < this.WINDOW_MS);
    },

    execute: async function (mutationFn) {
        // 1. Limpiar timestamps que salieron de la ventana móvil de 60s
        this._pruneWindow();

        // 2. Si alcanzamos el umbral de seguridad, esperar a que venza el más antiguo
        while (this.callTimestamps.length >= this.MAX_OPS_PER_WINDOW) {
            const oldest = this.callTimestamps[0];
            const waitMs = (oldest + this.WINDOW_MS) - this.now() + 25;
            if (waitMs > 0) {
                const waitSec = Math.ceil(waitMs / 1000);
                const msg = `⏳ Pausa preventiva por cuota de Roam (${this.callTimestamps.length}/1500 ops). Esperando ${waitSec}s para continuar con seguridad...`;
                console.warn(msg);
                if (this.onProgress) this.onProgress(msg);
                await this.sleep(waitMs);
                if (this.onProgress) this.onProgress(`✅ Cuota renovada. Reanudando...`);
            }
            this._pruneWindow();
        }

        // 3. Ejecución segura con reintento ante error 429 / Rate Limit
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                await this.sleep(this.MIN_DELAY_MS);
                const result = await mutationFn();
                this.callTimestamps.push(this.now());
                return result;
            } catch (err) {
                const isRateLimit = err && err.message && (
                    err.message.includes("maximum mutation rate limit exceeded") ||
                    err.message.includes("rate limit")
                );

                if (isRateLimit && attempts < maxAttempts - 1) {
                    attempts++;
                    const backoffMs = 20000 * attempts;
                    const msg = `⚠️ Cuota de Roam excedida. Esperando ${backoffMs / 1000}s para reintentar (intento ${attempts}/${maxAttempts})...`;
                    console.warn(msg, err);
                    if (this.onProgress) this.onProgress(msg);
                    await this.sleep(backoffMs);
                    this._pruneWindow();
                } else {
                    throw err;
                }
            }
        }
    }
};

// Escrituras en Roam a través del limitador compartido
DiscourseGraphToolkit.roamWrite = {
    createBlock: (args) => DiscourseGraphToolkit.MutationThrottle.execute(() => window.roamAlphaAPI.data.block.create(args)),
    updateBlock: (args) => DiscourseGraphToolkit.MutationThrottle.execute(() => window.roamAlphaAPI.data.block.update(args)),
    deleteBlock: (args) => DiscourseGraphToolkit.MutationThrottle.execute(() => window.roamAlphaAPI.data.block.delete(args)),
    createPage: (args) => DiscourseGraphToolkit.MutationThrottle.execute(() => window.roamAlphaAPI.data.page.create(args)),
    deletePage: (args) => DiscourseGraphToolkit.MutationThrottle.execute(() => window.roamAlphaAPI.data.page.delete(args))
};
