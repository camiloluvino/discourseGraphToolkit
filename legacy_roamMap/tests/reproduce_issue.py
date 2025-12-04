
import sys
import os
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.node_processor import process_single_page
from core.relationship_mapper import map_relationships
from core.config import NodeType

def reproduce_issue():
    print("--- Starting Reproduction Script ---")

    # Mock Data
    # Parent CLM
    parent_clm_uid = "parent_uid"
    parent_clm_title = "[[CLM]] - Parent Claim"
    
    # Child CLM (Supporting)
    child_clm_uid = "child_uid"
    child_clm_title = "[[CLM]] - Child Claim (Supporting)"

    # Mock JSON structure mimicking Roam export
    mock_data = [
        {
            "uid": parent_clm_uid,
            "title": parent_clm_title,
            "children": [
                {
                    "string": "#SupportedBy",
                    "children": [
                        {
                            "string": child_clm_title, # Embedded reference
                            "uid": "some_block_uid"
                        }
                    ]
                }
            ]
        },
        {
            "uid": child_clm_uid,
            "title": child_clm_title,
            "children": [
                {"string": "Contenido adicional de prueba"}
            ]
        }
    ]

    # 1. Process Nodes
    all_nodes = {}
    title_to_uid = {}

    print("Processing nodes...")
    for page in mock_data:
        # Enable additional content extraction
        node_info = process_single_page(page, "mock_file.json", title_to_uid, all_nodes, extract_additional_content=True)
        if node_info:
            all_nodes[node_info["uid"]] = node_info

    # 2. Map Relationships
    print("Mapping relationships...")
    map_relationships(all_nodes)

    # 3. Verify Results
    parent_node = all_nodes[parent_clm_uid]
    
    print(f"\nResults for Parent Node ({parent_node['title']}):")
    print(f"  - Connected CLMs: {parent_node['connected_clms']}")
    print(f"  - Related EVDs: {parent_node['related_evds']}")
    
    # Check if 'supporting_clms' exists (it shouldn't yet)
    if "supporting_clms" in parent_node:
        print(f"  - Supporting CLMs: {parent_node['supporting_clms']}")
    else:
        print("  - Supporting CLMs field: NOT FOUND (Expected)")

    # Verification Logic
    # After fix, it should be in 'supporting_clms' and NOT in 'connected_clms'.
    
    is_in_supporting = child_clm_uid in parent_node['supporting_clms']
    is_in_connected = child_clm_uid in parent_node['connected_clms']
    
    print(f"\nChild CLM in 'supporting_clms': {is_in_supporting}")
    print(f"Child CLM in 'connected_clms': {is_in_connected}")

    # Check for additional content in the child node (simulated)
    # Note: The reproduction script uses process_single_page which calls extract_clm_content.
    # We need to ensure our mock data has content that would be extracted.
    child_node = all_nodes[child_clm_uid]
    has_content = "additional_content" in child_node and len(child_node["additional_content"]) > 0
    print(f"Child CLM has additional content: {has_content}")

    if is_in_supporting and not is_in_connected:
        print(">> SUCCESS: Supporting CLM is correctly identified!")
    else:
        print(">> FAILURE: Supporting CLM is NOT correctly identified.")

if __name__ == "__main__":
    reproduce_issue()
