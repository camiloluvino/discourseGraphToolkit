
import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Asegurar que el directorio raíz está en el path para importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.node_processor import process_single_page as _process_single_page
from core.relationship_mapper import map_relationships
from core.config import NodeType

# --- Fixtures ---

@pytest.fixture
def mock_que_node():
    """Simula un nodo de tipo PREGUNTA (QUE)"""
    return {
        "uid": "que_123",
        "title": "[[QUE]] ¿Cuál es el impacto de los tests?",
        "children": [
            {
                "string": "#RespondedBy",
                "children": [
                    {
                        "string": "Esto se responde en [[CLM]] Los tests mejoran la calidad",
                        "refs": [{"uid": "clm_456"}]
                    }
                ]
            }
        ]
    }

@pytest.fixture
def mock_clm_node():
    """Simula un nodo de tipo AFIRMACIÓN (CLM)"""
    return {
        "uid": "clm_456",
        "title": "[[CLM]] Los tests mejoran la calidad",
        "children": [
            {
                "string": "#SupportedBy",
                "children": [
                    {
                        "string": "Evidencia en [[EVD]] Estudio de calidad de software",
                        "refs": [{"uid": "evd_789"}]
                    }
                ]
            }
        ]
    }

@pytest.fixture
def mock_evd_node():
    """Simula un nodo de tipo EVIDENCIA (EVD)"""
    return {
        "uid": "evd_789",
        "title": "[[EVD]] Estudio de calidad de software",
        "children": [
            {"string": "El 90% de los bugs se detectan antes de producción."}
        ]
    }

# --- Tests de Procesamiento de Nodos ---

def test_process_single_page_que(mock_que_node):
    """Verifica que se detecte correctamente un nodo QUE"""
    all_nodes = {}
    title_to_uid = {}
    
    result = _process_single_page(mock_que_node, "dummy.json", title_to_uid, all_nodes)
    
    assert result is not None
    assert result["type"] == NodeType.QUE
    assert result["uid"] == "que_123"
    assert result["title"] == "[[QUE]] ¿Cuál es el impacto de los tests?"

def test_process_single_page_clm(mock_clm_node):
    """Verifica que se detecte correctamente un nodo CLM"""
    all_nodes = {}
    title_to_uid = {}
    
    result = _process_single_page(mock_clm_node, "dummy.json", title_to_uid, all_nodes)
    
    assert result is not None
    assert result["type"] == NodeType.CLM
    assert result["uid"] == "clm_456"

def test_process_single_page_evd(mock_evd_node):
    """Verifica que se detecte correctamente un nodo EVD"""
    all_nodes = {}
    title_to_uid = {}
    
    result = _process_single_page(mock_evd_node, "dummy.json", title_to_uid, all_nodes)
    
    assert result is not None
    assert result["type"] == NodeType.EVD
    assert result["uid"] == "evd_789"

def test_process_single_page_unknown():
    """Verifica que un nodo sin etiquetas conocidas sea ignorado o marcado como UNKNOWN"""
    unknown_node = {
        "uid": "unk_000",
        "title": "Página normal de Roam",
        "children": []
    }
    all_nodes = {}
    title_to_uid = {}
    
    result = _process_single_page(unknown_node, "dummy.json", title_to_uid, all_nodes)
    
    # Dependiendo de la implementación, puede devolver un nodo UNKNOWN o None si se filtra antes
    # En la implementación actual devuelve el nodo con tipo UNKNOWN
    assert result is not None
    assert result["type"] == NodeType.UNKNOWN

# --- Tests de Relaciones ---

def test_map_relationships_que_to_clm(mock_que_node, mock_clm_node):
    """Verifica que se mapee la relación QUE -> CLM vía #RespondedBy"""
    
    # 1. Procesar nodos individualmente para tener la estructura base
    all_nodes = {}
    title_to_uid = {}
    
    node_que = _process_single_page(mock_que_node, "dummy.json", title_to_uid, all_nodes)
    all_nodes[node_que["uid"]] = node_que
    
    node_clm = _process_single_page(mock_clm_node, "dummy.json", title_to_uid, all_nodes)
    all_nodes[node_clm["uid"]] = node_clm
    
    # 2. Ejecutar mapeo
    map_relationships(all_nodes)
    
    # 3. Verificar conexiones
    assert "clm_456" in all_nodes["que_123"]["related_clms"]

def test_map_relationships_clm_to_evd(mock_clm_node, mock_evd_node):
    """Verifica que se mapee la relación CLM -> EVD vía #SupportedBy"""
    
    all_nodes = {}
    title_to_uid = {}
    
    node_clm = _process_single_page(mock_clm_node, "dummy.json", title_to_uid, all_nodes)
    all_nodes[node_clm["uid"]] = node_clm
    
    node_evd = _process_single_page(mock_evd_node, "dummy.json", title_to_uid, all_nodes)
    all_nodes[node_evd["uid"]] = node_evd
    
    map_relationships(all_nodes)
    
    assert "evd_789" in all_nodes["clm_456"]["related_evds"]
