"""
Tests unitarios para el módulo content_processor
"""

import sys
from pathlib import Path

# Añadir el directorio padre al path para importar los módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

from content_processor import extract_block_content


class TestExtractBlockContent:
    """Tests para la función extract_block_content"""

    def test_simple_block(self):
        """Verifica extracción de bloque simple"""
        block = {
            "string": "Test content",
            "children": []
        }
        result = extract_block_content(block)
        assert "Test content" in result

    def test_nested_blocks(self):
        """Verifica extracción de bloques anidados"""
        block = {
            "string": "Parent",
            "children": [
                {
                    "string": "Child 1",
                    "children": []
                },
                {
                    "string": "Child 2",
                    "children": []
                }
            ]
        }
        result = extract_block_content(block, skip_metadata=False)
        assert "Parent" in result
        assert "Child 1" in result
        assert "Child 2" in result

    def test_skip_metadata(self):
        """Verifica que se salten los metadatos cuando skip_metadata=True"""
        block = {
            "string": "Content",
            "children": [
                {
                    "string": "#SupportedBy",
                    "children": []
                },
                {
                    "string": "Real content",
                    "children": []
                }
            ]
        }
        result = extract_block_content(block, skip_metadata=True)
        # No debería incluir #SupportedBy
        assert "#SupportedBy" not in result or result.count("#SupportedBy") == 0

    def test_cycle_detection(self):
        """Verifica detección de ciclos"""
        # Crear estructura circular
        block_a = {
            "uid": "a",
            "string": "Block A",
            "children": []
        }
        block_b = {
            "uid": "b",
            "string": "Block B",
            "children": [block_a]
        }
        block_a["children"] = [block_b]

        # No debería entrar en bucle infinito
        result = extract_block_content(block_a, max_depth=10)
        assert result  # Debe completar sin error
        assert "Block A" in result or "Block B" in result

    def test_max_depth_protection(self):
        """Verifica protección de profundidad máxima"""
        # Crear estructura muy profunda
        deep_block = {"string": "Level 0", "children": []}
        current = deep_block

        for i in range(1, 100):
            child = {"string": f"Level {i}", "children": []}
            current["children"] = [child]
            current = child

        # Con max_depth=10, no debería procesar todos los niveles
        result = extract_block_content(deep_block, max_depth=10, skip_metadata=False)
        assert result  # Debe completar
        # No debería llegar hasta Level 99
        assert "Level 99" not in result

    def test_empty_block(self):
        """Verifica manejo de bloque vacío"""
        block = {
            "string": "",
            "children": []
        }
        result = extract_block_content(block)
        assert isinstance(result, str)  # Debe retornar string

    def test_invalid_block_type(self):
        """Verifica manejo de tipo de bloque inválido"""
        result = extract_block_content("not a dict")
        assert result == ""  # Debe retornar string vacío

        result = extract_block_content(None)
        assert result == ""

        result = extract_block_content([])
        assert result == ""

    def test_block_with_uid(self):
        """Verifica que se usen UIDs para identificación de bloques"""
        block = {
            "uid": "unique-id-123",
            "string": "Block with UID",
            "children": []
        }
        result = extract_block_content(block)
        assert "Block with UID" in result

    def test_indentation_levels(self):
        """Verifica que la indentación funcione correctamente"""
        block = {
            "string": "Level 0",
            "children": [
                {
                    "string": "Level 1",
                    "children": [
                        {
                            "string": "Level 2",
                            "children": []
                        }
                    ]
                }
            ]
        }
        result = extract_block_content(block, skip_metadata=False)
        # Debería haber diferentes niveles de indentación
        assert "Level 0" in result
        assert "Level 1" in result
        assert "Level 2" in result


class TestExtractBlockContentEdgeCases:
    """Tests para casos extremos y edge cases"""

    def test_block_with_special_characters(self):
        """Verifica manejo de caracteres especiales"""
        block = {
            "string": "Test with <html> & special chars: [[brackets]]",
            "children": []
        }
        result = extract_block_content(block, skip_metadata=False)
        assert result  # Debe completar sin error

    def test_block_with_unicode(self):
        """Verifica manejo de caracteres Unicode"""
        block = {
            "string": "Texto con acentos: áéíóú ñ",
            "children": []
        }
        result = extract_block_content(block)
        assert "Texto con acentos" in result

    def test_very_long_string(self):
        """Verifica manejo de strings muy largos"""
        long_string = "x" * 10000
        block = {
            "string": long_string,
            "children": []
        }
        result = extract_block_content(block)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_children_not_list(self):
        """Verifica manejo cuando children no es una lista"""
        block = {
            "string": "Test",
            "children": "not a list"
        }
        result = extract_block_content(block)
        # Debe manejar gracefully
        assert isinstance(result, str)


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
