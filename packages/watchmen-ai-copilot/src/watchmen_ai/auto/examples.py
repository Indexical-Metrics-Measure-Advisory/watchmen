"""Ontology Control Plane 使用示例（新分层架构版）"""
import json

from watchmen_ai.auto import (
    BusinessOntology,
    InMemoryLogBus,
    InMemoryOntologyStore,
    LogBus,
    LogLine,
    OntologyNode,
    OntologyRelation,
    Orchestrator,
)


def _print_logs(log_bus: LogBus, task_id: str | None = None) -> None:
    """打印日志总线的流式日志（模拟 Xterm.js 终端输出）"""
    for line in log_bus.history(task_id):
        prefix = f"[{line.worker_type}]"
        print(f"  {prefix:<22} {line.message}")


def example_basic_usage() -> None:
    """示例 1: 基础使用 - Architect Worker 发现新业务对象"""
    print("=" * 60)
    print("示例 1: 基础使用 (Architect Worker)")
    print("=" * 60)

    # 1. 准备共享基础设施（蓝图分层）
    store = InMemoryOntologyStore(BusinessOntology(
        ontology_id="demo-ontology",
        name="Demo Ontology",
        description="演示用本体",
    ))
    log_bus = InMemoryLogBus()

    # 2. 初始化 Orchestrator（注入 store + log_bus）
    orch = Orchestrator(store=store, log_bus=log_bus)

    # 3. 添加初始节点
    customer = OntologyNode(node_id="customer", name="Customer", description="客户信息")
    customer.add_attribute("domain", "CRM")
    store.add_node(customer)

    order = OntologyNode(node_id="order", name="Order", description="订单信息")
    store.add_node(order)
    store.add_relation(OntologyRelation(
        relation_id="customer-order", source_node_id="customer",
        target_node_id="order", relation_type="places", description="客户下单",
    ))

    print(f"✓ 初始 ontology: {len(store.list_nodes())} 节点, "
          f"{len(store.get_ontology().relations)} 关系")

    # 4. 运行 Architect Worker（通过 queue 分发）
    print("\n运行 Architect Worker...")
    result = orch.run_worker("architect", auto_approve=True)

    print(f"✓ 发现 {result['discovered']} 个对象, 物化 {result['materialized']} 个提案")
    for p in result["proposals"]:
        print(f"  - {p['payload']['name']}: {p['rationale']}")

    # 5. 查看流式日志（蓝图 UI 层消费的内容）
    print("\n--- 流式日志 (LogBus 输出) ---")
    _print_logs(log_bus)

    ontology = store.get_ontology()
    print(f"\n当前 ontology: {len(ontology.nodes)} 节点, 版本 {ontology.version}")


def example_full_cycle() -> None:
    """示例 2: 完整循环 - 4 个 Worker 顺序执行"""
    print("\n" + "=" * 60)
    print("示例 2: 完整循环 (4 个 Worker)")
    print("=" * 60)

    orch = Orchestrator()  # 全部使用默认内存实现

    print("运行完整循环 (Architect → Materialization → Health → Insight)...")
    results = orch.run_full_cycle(auto_approve=True)

    print("\n各 Worker 执行结果:")
    for worker_type, result in results.items():
        if isinstance(result, dict) and "error" in result:
            print(f"  - {worker_type}: ✗ {result['error']}")
        else:
            print(f"  - {worker_type}: 发现 {result.get('discovered', 0)}, "
                  f"物化 {result.get('materialized', 0)}")

    # 查看任务队列状态
    print(f"\n任务队列: {len(orch.get_tasks())} 个任务")
    for t in orch.get_tasks():
        print(f"  - {t['task_id']}: {t['worker_type']} [{t['status']}]")

    # 查看审计日志
    audit = orch.get_audit_log()
    print(f"\n审计日志: {len(audit)} 条记录")


def example_manual_approval() -> None:
    """示例 3: 人工审批 (Human-in-the-loop)"""
    print("\n" + "=" * 60)
    print("示例 3: 人工审批")
    print("=" * 60)

    orch = Orchestrator()

    # 运行 Architect（不自动审批）
    print("运行 Architect Worker (不自动审批)...")
    result = orch.run_worker("architect", auto_approve=False)
    print(f"✓ 发现 {result['discovered']} 个对象, "
          f"待审批 {len(orch.get_pending_proposals())} 个提案")

    # 手动审批第一个
    pending = orch.get_pending_proposals()
    if pending:
        proposal_id = pending[0]["proposal_id"]
        print(f"\n手动审批: {proposal_id}")
        orch.approve_proposal(proposal_id, approved=True, reason="Valid business object")
        print("✓ 已审批")


def example_export_import() -> None:
    """示例 4: 导出导入"""
    print("\n" + "=" * 60)
    print("示例 4: 导出导入")
    print("=" * 60)

    orch = Orchestrator()
    orch.run_worker("architect", auto_approve=True)

    ontology = orch.get_ontology()
    json_str = json.dumps(ontology.model_dump(mode="json"), indent=2, ensure_ascii=False)

    print(f"✓ 导出 ontology ({len(json_str)} 字符)")
    print(f"  - 节点数: {len(ontology.nodes)}")

    imported = BusinessOntology(**json.loads(json_str))
    print(f"✓ 导入 ontology: {imported.name}")
    print(f"  - 节点数: {len(imported.nodes)}")


def main() -> None:
    print("\n" + "=" * 60)
    print("Ontology Control Plane 使用示例 (新分层架构)")
    print("=" * 60 + "\n")

    try:
        example_basic_usage()
        example_full_cycle()
        example_manual_approval()
        example_export_import()
        print("\n" + "=" * 60)
        print("✓ 所有示例运行成功!")
        print("=" * 60 + "\n")
    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
