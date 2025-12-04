"""
Tests unitarios para el módulo utils
"""

import os
import sys
import pytest
from pathlib import Path

# Añadir el directorio padre al path para importar los módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils import (
    clean_text,
    starts_with_ignore_case,
    contains_any_marker,
    get_node_type
)
from config import NodeType


class TestCleanText:
    """Tests para la función clean_text"""

    def test_clean_text_removes_brackets(self):
        """Verifica que se eliminen los corchetes dobles"""
        assert clean_text("[[CLM]] - Test") == "CLM - Test"
        assert clean_text("[[EVD]]") == "EVD"

    def test_clean_text_removes_asterisks(self):
        """Verifica que se eliminen los asteriscos"""
        assert clean_text("**Bold text**") == "Bold text"

    def test_clean_text_strips_whitespace(self):
        """Verifica que se eliminen espacios en blanco"""
        assert clean_text("  text  ") == "text"

    def test_clean_text_with_none(self):
        """Verifica el manejo de None"""
        assert clean_text(None) == ""

    def test_clean_text_with_non_string(self):
        """Verifica el manejo de tipos no-string"""
        assert clean_text(123) == ""
        assert clean_text([]) == ""

    def test_clean_text_combined(self):
        """Verifica limpieza combinada"""
        assert clean_text("  [[CLM]] - **Test**  ") == "CLM - Test"


class TestStartsWithIgnoreCase:
    """Tests para la función starts_with_ignore_case"""

    def test_basic_match(self):
        """Verifica coincidencia básica"""
        assert starts_with_ignore_case("Hello World", "hello")
        assert starts_with_ignore_case("HELLO", "hello")
        assert starts_with_ignore_case("hello", "HELLO")

    def test_no_match(self):
        """Verifica cuando no coincide"""
        assert not starts_with_ignore_case("Hello", "goodbye")

    def test_empty_strings(self):
        """Verifica manejo de strings vacíos"""
        assert starts_with_ignore_case("", "")
        assert starts_with_ignore_case("hello", "")
        assert not starts_with_ignore_case("", "hello")

    def test_special_characters(self):
        """Verifica manejo de caracteres especiales"""
        assert starts_with_ignore_case("#SupportedBy", "#supported")
        assert starts_with_ignore_case("Sección narrativa::", "sección")

    def test_non_string_inputs(self):
        """Verifica manejo de tipos no-string"""
        assert not starts_with_ignore_case(123, "test")
        assert not starts_with_ignore_case("test", 123)
        assert not starts_with_ignore_case(None, "test")


class TestContainsAnyMarker:
    """Tests para la función contains_any_marker"""

    def test_single_marker_found(self):
        """Verifica encontrar un marcador simple"""
        markers = ["#SupportedBy", "#RespondedBy"]
        assert contains_any_marker("#SupportedBy content", markers)

    def test_multiple_markers(self):
        """Verifica con múltiples marcadores"""
        markers = ["#SupportedBy", "#RespondedBy", "#RelatedTo"]
        assert contains_any_marker("Some #RespondedBy text", markers)

    def test_case_insensitive(self):
        """Verifica búsqueda case-insensitive"""
        markers = ["#SupportedBy"]
        assert contains_any_marker("#supportedby", markers, case_sensitive=False)
        assert not contains_any_marker("#supportedby", markers, case_sensitive=True)

    def test_no_marker_found(self):
        """Verifica cuando no se encuentra marcador"""
        markers = ["#SupportedBy", "#RespondedBy"]
        assert not contains_any_marker("Plain text", markers)

    def test_empty_markers(self):
        """Verifica con lista de marcadores vacía"""
        assert not contains_any_marker("Some text", [])

    def test_non_string_input(self):
        """Verifica manejo de tipos no-string"""
        markers = ["test"]
        assert not contains_any_marker(123, markers)
        assert not contains_any_marker(None, markers)


class TestGetNodeType:
    """Tests para la función get_node_type"""

    def test_que_detection(self):
        """Verifica detección de nodos QUE"""
        assert get_node_type("[[QUE]] - ¿Qué es X?") == NodeType.QUE

    def test_clm_detection(self):
        """Verifica detección de nodos CLM"""
        assert get_node_type("[[CLM]] - Afirmación") == NodeType.CLM

    def test_evd_detection(self):
        """Verifica detección de nodos EVD"""
        assert get_node_type("[[EVD]] - Evidencia") == NodeType.EVD

    def test_unknown_type(self):
        """Verifica detección de tipo desconocido"""
        assert get_node_type("Texto sin marcador") == NodeType.UNKNOWN

    def test_case_insensitive(self):
        """Verifica que la detección sea case-insensitive"""
        assert get_node_type("[[que]] - pregunta") == NodeType.QUE
        assert get_node_type("[[CLm]] - afirmación") == NodeType.CLM

    def test_none_input(self):
        """Verifica manejo de None"""
        assert get_node_type(None) == NodeType.UNKNOWN

    def test_non_string_input(self):
        """Verifica manejo de tipos no-string"""
        assert get_node_type(123) == NodeType.UNKNOWN
        assert get_node_type([]) == NodeType.UNKNOWN


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
