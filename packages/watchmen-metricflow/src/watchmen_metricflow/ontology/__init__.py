"""Ontology Data Access Service - 配置驱动的数据访问网关。

消费 VirtualOntology 元数据，在运行时编译 SQL 并执行查询，屏蔽底层物理表细节。
与 router/ontology_router.py（元数据 CRUD）解耦，本包只做运行时数据访问。

注意：本包 __init__ 不导入 service/router，避免 import 包时提前初始化 meta storage。
"""
