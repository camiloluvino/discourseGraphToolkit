# Guía Completa: roamMap.exe

Esta guía cubre todo lo necesario para generar y usar el ejecutable de roamMap.

---

## 📦 Parte 1: Generar el Ejecutable

### ⚡ Opción 1: Método Rápido (Windows)

```bash
# Abre CMD o PowerShell en la carpeta del proyecto
cd C:\ruta\a\roamMap

# Ejecuta el script desde el directorio raíz
build\build_exe.bat
```

¡Listo! Tu ejecutable estará en `dist/roamMap.exe`

---

### 🐍 Opción 2: Método Python (Multiplataforma)

```bash
# Instala PyInstaller (solo primera vez)
pip install pyinstaller

# Ejecuta el script de construcción desde el directorio raíz
python build/build_exe.py
```

¡Listo! Tu ejecutable estará en `dist/roamMap.exe`

---

### 🛠️ Opción 3: Comando Manual

```bash
pyinstaller --name=roamMap --onefile --windowed --noconfirm gui.py
```

---

### ⚙️ Configuración Antes de Generar

#### Cambiar directorio de salida

Edita `config.py` línea 23:

```python
# Para carpeta personalizada (tu configuración actual):
CUSTOM_OUTPUT_DIR = r"C:\Users\redk8\OneDrive\Documentos\roamDiscourseSelector_output"

# Para carpeta junto al .exe:
CUSTOM_OUTPUT_DIR = None
```

#### Agregar un ícono (opcional)

1. Consigue un archivo `.ico`
2. Edita `build/build_exe.py` o `build/build_exe.bat`
3. Agrega: `--icon=mi_icono.ico`

---

## 🚀 Parte 2: Usar el Ejecutable

### Primera Vez

1. **Copia `roamMap.exe`** a la carpeta donde quieras trabajar
   - Ejemplo: `C:\MisProyectos\`

2. **Ejecuta `roamMap.exe`** (doble click)

3. **El programa creará automáticamente:**
   ```
   C:\MisProyectos\
   ├── roamMap.exe
   ├── input/          ← Aquí se guardan temporalmente los archivos
   └── output/         ← Solo si CUSTOM_OUTPUT_DIR está en None
   ```

   **NOTA:** Si configuraste `CUSTOM_OUTPUT_DIR` en `config.py`,
   los resultados irán a tu carpeta personalizada:
   ```
   C:\Users\redk8\OneDrive\Documentos\roamDiscourseSelector_output\
   ```

### Uso Normal

1. **Abre roamMap.exe**

2. **Selecciona archivos JSON:**
   - Click en "Seleccionar Archivos..."
   - O arrastra archivos JSON a la ventana

3. **(Opcional) Escribe un nombre de carpeta**
   - Si lo dejas vacío, se genera automáticamente

4. **Click en "Procesar Archivos"**

5. **Cuando termine, click en "Abrir Resultados"**

---

## ✅ Verificación

Después de generar el ejecutable:

1. **Busca el archivo:** `dist/roamMap.exe`
2. **Tamaño esperado:** 15-25 MB
3. **Prueba:** Doble click en roamMap.exe

---

## 📂 Estructura de Archivos

```
Tu carpeta de trabajo/
├── roamMap.exe              ← El ejecutable
├── input/                   ← Se crea automáticamente
│   └── (archivos temporales)
├── C:\Users\redk8\OneDrive\Documentos\roamDiscourseSelector_output\
│   ├── proyecto_1/
│   │   ├── proyecto_1.md
│   │   └── proyecto_1.html
│   └── proyecto_2/
│       ├── proyecto_2.md
│       └── proyecto_2.html
└── roammap.log              ← Log de actividades
```

---

## 🔧 Solución de Problemas

### El ejecutable no se genera

**Problema:** `PyInstaller no encontrado`
```bash
pip install pyinstaller
```

**Problema:** `Python no está en el PATH`
- Reinstala Python y marca "Add Python to PATH"

### El ejecutable se genera pero no abre

**Problema:** Antivirus bloquea el .exe
- Agrega `roamMap.exe` a las excepciones del antivirus
- Windows Defender puede marcarlo como falso positivo

**Problema:** Error al abrir
- Ejecuta desde CMD para ver errores:
  ```bash
  cd dist
  roamMap.exe
  ```

### El programa no encuentra las carpetas

**Problema:** `input/` o `output/` no se crean
- El ejecutable debe tener permisos de escritura
- Ejecuta como administrador (click derecho → "Ejecutar como administrador")

---

## 📋 Checklist Completo

- [ ] Python 3.7+ instalado
- [ ] PyInstaller instalado (`pip install pyinstaller`)
- [ ] Configuración en `config.py` lista
- [ ] Ejecutar `build_exe.bat` o `python build_exe.py`
- [ ] Verificar `dist/roamMap.exe` existe
- [ ] Probar ejecutable (doble click)
- [ ] Verificar que crea carpetas `input/`
- [ ] Procesar archivos de prueba
- [ ] Verificar que guarda en directorio correcto

---

## 📝 Notas Importantes

1. **Tamaño del ejecutable:** ~15-25 MB (es normal, incluye Python)

2. **Primera ejecución lenta:** La primera vez puede tardar más en abrir

3. **Sin internet:** El ejecutable funciona 100% offline

4. **Portabilidad:** Puedes copiar el .exe a cualquier PC Windows sin instalar nada

5. **Drag & Drop:**
   - Si `tkinterdnd2` está instalado → Funciona
   - Si NO está instalado → Usa "Seleccionar Archivos"

---

## 🎯 Ventajas del Ejecutable

✅ No necesitas Python instalado
✅ No necesitas instalar dependencias
✅ Funciona en cualquier PC Windows
✅ Interfaz gráfica amigable
✅ Drag & drop de archivos
✅ Genera nombres únicos automáticamente
✅ Abre resultados con un click

---

## 💡 Tips

- **Múltiples versiones:** Ejecuta varias veces con diferentes archivos
- **Nombres automáticos:** Deja el campo vacío para generación automática
- **Log de errores:** Revisa `roammap.log` si algo falla
- **Actualizaciones:** Regenera el .exe cada vez que actualices el código

---

## 📦 Distribución

Para compartir tu programa:

1. **Copia solo:** `roamMap.exe`
2. **NO necesitas copiar:** archivos .py, carpetas build/, dist/
3. **El ejecutable es portátil:** funciona en cualquier Windows sin Python

---

¿Necesitas ayuda? Revisa el archivo `roammap.log` para detalles de errores.
