#!/usr/bin/env python3
"""Example usage of the Ontology Control Plane."""

from watchmen_ai.auto import (
    OntologyControlPlane,
    BusinessOntology,
    OntologyNode,
)


def main():
    """Demonstrate the Ontology Control Plane in action."""

    # 1. Initialize control plane with an empty ontology
    print("=" * 60)
    print("Ontology Control Plane - Example")
    print("=" * 60)

    control_plane = OntologyControlPlane()
    ontology = control_plane.get_ontology()

    print(f"\n✓ Created ontology: {ontology.name}")
    print(f"  ID: {ontology.ontology_id}")
    print(f"  Nodes: {len(ontology.nodes)}")

    # 2. Manually add some initial nodes
    print("\n" + "=" * 60)
    print("Adding initial business objects...")
    print("=" * 60)

    customer_node = OntologyNode(
        node_id="node-customer",
        name="Customer",
        description="Unified customer view",
        node_type="business_object",
    )
    customer_node.add_attribute("domain", "CRM")
    customer_node.add_attribute("owner", "Data Platform Team")

    ontology.add_node(customer_node)
    print(f"✓ Added node: {customer_node.name}")

    # 3. Run the architect agent to discover new objects
    print("\n" + "=" * 60)
    print("Running Architect Agent...")
    print("=" * 60)

    architect_proposals = control_plane.run_agent("architect", auto_approve=True)
    print(f"✓ Architect discovered {len(architect_proposals)} potential objects")

    for proposal in architect_proposals:
        print(f"  - {proposal.payload.get('name', 'Unknown')}")
        print(f"    Rationale: {proposal.rationale}")
        print(f"    Confidence: {proposal.confidence:.2f}")

    # 4. Run the health agent to check data quality
    print("\n" + "=" * 60)
    print("Running Health Agent...")
    print("=" * 60)

    health_proposals = control_plane.run_agent("health", auto_approve=True)
    print(f"✓ Health agent updated {len(health_proposals)} nodes")

    # 5. Check the ontology state
    print("\n" + "=" * 60)
    print("Current Ontology State")
    print("=" * 60)

    ontology = control_plane.get_ontology()
    print(f"\nTotal nodes: {len(ontology.nodes)}")
    for node_id, node in ontology.nodes.items():
        print(f"\n  [{node.node_type}] {node.name}")
        print(f"    ID: {node.node_id}")
        if node.description:
            print(f"    Description: {node.description}")
        if node.health:
            print(f"    Health Score: {node.health.overall_score:.1f}")
        if node.data_sources:
            print(f"    Data Sources: {', '.join(node.data_sources)}")

    # 6. Check audit log
    print("\n" + "=" * 60)
    print("Audit Log")
    print("=" * 60)

    audit_log = control_plane.get_audit_log()
    print(f"\nTotal events: {len(audit_log)}")
    for event in audit_log[:10]:  # Show first 10
        print(f"  [{event['action']}] {event['timestamp']}")

    # 7. Run a full cycle
    print("\n" + "=" * 60)
    print("Running Full Cycle (all agents)...")
    print("=" * 60)

    results = control_plane.run_full_cycle(auto_approve=True)
    print(f"\n✓ Full cycle complete")
    for agent_type, proposals in results.items():
        print(f"  {agent_type}: {len(proposals)} proposals")

    print("\n" + "=" * 60)
    print("Example complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
