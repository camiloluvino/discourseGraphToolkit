# Tests Unitarios - roamMap

## Instalación de dependencias para tests

```bash
pip install pytest
```

## Ejecutar todos los tests

```bash
# Desde el directorio raíz del proyecto
python -m pytest tests/ -v

# O ejecutar pytest directamente
pytest tests/ -v
```

## Ejecutar tests específicos

```bash
# Tests de utils solamente
pytest tests/test_utils.py -v

# Tests de content_processor solamente
pytest tests/test_content_processor.py -v
```

## Ejecutar con cobertura

```bash
pip install pytest-cov
pytest tests/ --cov=. --cov-report=html
```

## Estructura de tests

- `test_utils.py`: Tests para funciones utilitarias (clean_text, starts_with_ignore_case, etc.)
- `test_content_processor.py`: Tests para procesamiento de contenido y extracción de bloques

## Convenciones

- Cada clase de test agrupa tests relacionados
- Los nombres de tests son descriptivos y explican qué se está probando
- Se incluyen tests para casos normales, edge cases y manejo de errores
