from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Literal, Set

import yaml

from agent_cli.exceptions import AgentCliException
from agent_cli.http_client import RestClient
from agent_cli.vault import ENUM_DIR, INGEST_MODEL_CONFIG_DIR, INGEST_MODULE_CONFIG_DIR, INGEST_TABLE_CONFIG_DIR, METRICFLOW_METRIC_DIR, METRICFLOW_SEMANTIC_DIR, PIPELINE_DIR, TOPIC_DIR, read_entities, write_entities, write_yaml_entity, read_yaml_entities

SyncTarget = Literal["topic", "pipeline", "all"]


class SyncService:
    def __init__(self, client: RestClient, vault_path: Path) -> None:
        self.client = client
        self.vault_path = vault_path

    def pull(self, target: SyncTarget) -> Dict[str, int]:
        result = {"topics": 0, "pipelines": 0}
        if target in ("topic", "all"):
            import yaml
            topics = self.client.get_json("/topic/all")
            for topic in topics:
                yaml_str = yaml.dump(topic, sort_keys=False)
                write_yaml_entity(self.vault_path, TOPIC_DIR, yaml_str, "topicId", name_key="name")
            result["topics"] = len(topics)
        if target in ("pipeline", "all"):
            import yaml
            pipelines = self.client.get_json("/pipeline/all")
            for pipeline in pipelines:
                yaml_str = yaml.dump(pipeline, sort_keys=False)
                write_yaml_entity(self.vault_path, PIPELINE_DIR, yaml_str, "pipelineId", name_key="name")
            result["pipelines"] = len(pipelines)
        return result

    def push_topic_yaml(self, topic_yaml: str, skip_name_check: bool = False) -> str:
        if not skip_name_check:
            self._validate_local_topic_name_uniqueness(topic_yaml)
        self._validate_topic_yaml_labels(topic_yaml)
        return self.client.post_text("/topic/yaml", topic_yaml)

    def push_topic_yaml_file(self, file_path: Path, skip_name_check: bool = False) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        source_topic = yaml.safe_load(source_yaml) if source_yaml.strip() else {}
        source_topic_id = str((source_topic or {}).get("topicId") or "").strip()
        pushed_yaml = self.push_topic_yaml(source_yaml, skip_name_check=skip_name_check)
        pushed_topic = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        pushed_topic_id = str((pushed_topic or {}).get("topicId") or "").strip()

        if file_path.resolve().is_relative_to((self.vault_path / TOPIC_DIR).resolve()):
            write_yaml_entity(self.vault_path, TOPIC_DIR, pushed_yaml, "topicId", name_key="name")
            if source_topic_id and pushed_topic_id and source_topic_id != pushed_topic_id and file_path.exists():
                file_path.unlink()
        else:
            file_path.write_text(pushed_yaml, encoding="utf-8")

        return {
            "status": "pushed",
            "file": str(file_path),
            "sourceTopicId": source_topic_id or None,
            "topicId": pushed_topic_id or None,
            "replaced": bool(source_topic_id and pushed_topic_id and source_topic_id != pushed_topic_id)
        }

    def push(self, target: SyncTarget) -> Dict[str, int]:
        result = {"topics": 0, "pipelines": 0}
        if target in ("topic", "all"):
            self._validate_local_topic_name_uniqueness()
            topic_dir = self.vault_path / TOPIC_DIR
            topic_yaml_files = sorted(topic_dir.glob("*.yml")) + sorted(topic_dir.glob("*.yaml"))
            for topic_file in topic_yaml_files:
                self.push_topic_yaml_file(topic_file, skip_name_check=True)
                result["topics"] += 1
            
            # Legacy json topics push
            topics = read_entities(self.vault_path, TOPIC_DIR)
            if topics:
                self.client.post_json("/topic/import", topics)
                result["topics"] += len(topics)
        if target in ("pipeline", "all"):
            pipeline_dir = self.vault_path / PIPELINE_DIR
            pipeline_yaml_files = sorted(pipeline_dir.glob("*.yml")) + sorted(pipeline_dir.glob("*.yaml"))
            for pipeline_file in pipeline_yaml_files:
                self.push_pipeline_yaml_file(pipeline_file)
                result["pipelines"] += 1

            pipelines = read_entities(self.vault_path, PIPELINE_DIR)
            if pipelines:
                self.client.post_json("/pipeline/import", pipelines)
                result["pipelines"] += len(pipelines)
        return result

    def pull_one_topic(self, topic_id: str) -> Dict[str, Any]:
        topic_yaml = self.client.get_text("/topic/yaml", {"topic_id": topic_id})
        write_yaml_entity(self.vault_path, TOPIC_DIR, topic_yaml, "topicId", name_key="name")
        return {"topicId": topic_id, "status": "pulled"}

    def pull_topics_by_name(self, topic_name: str) -> Dict[str, Any]:
        topic_yaml = self.client.get_text("/topic/name/yaml", {"query_name": topic_name})
        write_yaml_entity(self.vault_path, TOPIC_DIR, topic_yaml, "topicId", name_key="name")
        return {"topicName": topic_name, "status": "pulled"}

    def pull_one_pipeline(self, pipeline_id: str) -> Dict[str, Any]:
        pipeline_yaml = self.client.get_text("/pipeline/yaml", {"pipeline_id": pipeline_id})
        write_yaml_entity(self.vault_path, PIPELINE_DIR, pipeline_yaml, "pipelineId", name_key="name")
        return {"pipelineId": pipeline_id, "status": "pulled"}

    def pull_pipelines_by_name(self, pipeline_name: str) -> Dict[str, Any]:
        pipeline_yaml = self.client.get_text("/pipeline/name/yaml", {"query_name": pipeline_name})
        write_yaml_entity(self.vault_path, PIPELINE_DIR, pipeline_yaml, "pipelineId", name_key="name")
        return {"pipelineName": pipeline_name, "status": "pulled"}

    def push_pipeline_yaml(self, pipeline_yaml: str) -> str:
        return self.client.post_text("/pipeline/yaml", pipeline_yaml)

    def push_pipeline_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        source_pipeline = yaml.safe_load(source_yaml) if source_yaml.strip() else {}
        source_pipeline_id = str((source_pipeline or {}).get("pipelineId") or "").strip()
        pushed_yaml = self.push_pipeline_yaml(source_yaml)
        pushed_pipeline = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        pushed_pipeline_id = str((pushed_pipeline or {}).get("pipelineId") or "").strip()

        if file_path.resolve().is_relative_to((self.vault_path / PIPELINE_DIR).resolve()):
            write_yaml_entity(self.vault_path, PIPELINE_DIR, pushed_yaml, "pipelineId", name_key="name")
            if source_pipeline_id and pushed_pipeline_id and source_pipeline_id != pushed_pipeline_id and file_path.exists():
                file_path.unlink()
        else:
            file_path.write_text(pushed_yaml, encoding="utf-8")

        return {
            "status": "pushed",
            "file": str(file_path),
            "sourcePipelineId": source_pipeline_id or None,
            "pipelineId": pushed_pipeline_id or None,
            "replaced": bool(source_pipeline_id and pushed_pipeline_id and source_pipeline_id != pushed_pipeline_id)
        }

    def list_topics_from_server(self) -> Dict[str, Any]:
        topics = self.client.get_json("/topic/all")
        # Just return basic metadata to the user
        topic_summaries = []
        for t in topics:
            topic_summaries.append({
                "topicId": t.get("topicId"),
                "name": t.get("name"),
                "type": t.get("type"),
                "kind": t.get("kind")
            })
        return {"count": len(topic_summaries), "topics": topic_summaries}

    def list_pipelines_from_server(self) -> Dict[str, Any]:
        pipelines = self.client.get_json("/pipeline/all")
        # Just return basic metadata to the user
        pipeline_summaries = []
        for p in pipelines:
            pipeline_summaries.append({
                "pipelineId": p.get("pipelineId"),
                "name": p.get("name"),
                "topicId": p.get("topicId"),
                "type": p.get("type"),
                "enabled": p.get("enabled")
            })
        return {"count": len(pipeline_summaries), "pipelines": pipeline_summaries}

    def pull_one_semantic_model_by_name(self, model_name: str) -> Dict[str, Any]:
        model_yaml = self.client.get_text("/metricflow/semantic-model/name/yaml", {"model_name": model_name})
        write_yaml_entity(self.vault_path, METRICFLOW_SEMANTIC_DIR, model_yaml, "id", name_key="name")
        return {"semanticModelName": model_name, "status": "pulled"}

    def push_semantic_model_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        source_model = yaml.safe_load(source_yaml) if source_yaml.strip() else {}
        source_id = str((source_model or {}).get("id") or "").strip()
        pushed_yaml = self.client.post_text("/metricflow/semantic-model/yaml", source_yaml)
        pushed_model = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        pushed_id = str((pushed_model or {}).get("id") or "").strip()

        if file_path.resolve().is_relative_to((self.vault_path / METRICFLOW_SEMANTIC_DIR).resolve()):
            write_yaml_entity(self.vault_path, METRICFLOW_SEMANTIC_DIR, pushed_yaml, "id", name_key="name")
            if source_id and pushed_id and source_id != pushed_id and file_path.exists():
                file_path.unlink()
        else:
            file_path.write_text(pushed_yaml, encoding="utf-8")

        return {
            "status": "pushed",
            "file": str(file_path),
            "sourceId": source_id or None,
            "id": pushed_id or None,
            "replaced": bool(source_id and pushed_id and source_id != pushed_id)
        }

    def list_semantic_models_from_server(self) -> Dict[str, Any]:
        models = self.client.get_json("/metricflow/semantic-models/all")
        summaries = []
        for model in models:
            summaries.append({
                "id": model.get("id"),
                "name": model.get("name"),
                "sourceType": model.get("sourceType"),
                "topicId": model.get("topicId")
            })
        return {"count": len(summaries), "semanticModels": summaries}

    def pull_one_metric_by_name(self, metric_name: str) -> Dict[str, Any]:
        metric_yaml = self.client.get_text("/metricflow/metric/name/yaml", {"metric_name": metric_name})
        write_yaml_entity(self.vault_path, METRICFLOW_METRIC_DIR, metric_yaml, "id", name_key="name")
        return {"metricName": metric_name, "status": "pulled"}

    def push_metric_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        source_metric = yaml.safe_load(source_yaml) if source_yaml.strip() else {}
        source_id = str((source_metric or {}).get("id") or "").strip()
        pushed_yaml = self.client.post_text("/metricflow/metric/yaml", source_yaml)
        pushed_metric = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        pushed_id = str((pushed_metric or {}).get("id") or "").strip()

        if file_path.resolve().is_relative_to((self.vault_path / METRICFLOW_METRIC_DIR).resolve()):
            write_yaml_entity(self.vault_path, METRICFLOW_METRIC_DIR, pushed_yaml, "id", name_key="name")
            if source_id and pushed_id and source_id != pushed_id and file_path.exists():
                file_path.unlink()
        else:
            file_path.write_text(pushed_yaml, encoding="utf-8")

        return {
            "status": "pushed",
            "file": str(file_path),
            "sourceId": source_id or None,
            "id": pushed_id or None,
            "replaced": bool(source_id and pushed_id and source_id != pushed_id)
        }

    def list_metrics_from_server(self) -> Dict[str, Any]:
        metrics = self.client.get_json("/metricflow/metrics/all")
        summaries = []
        for metric in metrics:
            summaries.append({
                "id": metric.get("id"),
                "name": metric.get("name"),
                "type": metric.get("type"),
                "topicId": metric.get("topicId")
            })
        return {"count": len(summaries), "metrics": summaries}

    def pull_one_enum(self, enum_id: str) -> Dict[str, Any]:
        enum_yaml = self.client.get_enum_yaml(enum_id)
        write_yaml_entity(self.vault_path, ENUM_DIR, enum_yaml, "enumId", name_key="name")
        return {"enumId": enum_id, "status": "pulled"}

    def pull_enums_by_name(self, enum_name: str) -> Dict[str, Any]:
        enums = self.client.get_json("/enum/all")
        matched = [e for e in enums if e.get("name") == enum_name]
        if matched:
            for enum in matched:
                enum_yaml = yaml.dump(enum, sort_keys=False)
                write_yaml_entity(self.vault_path, ENUM_DIR, enum_yaml, "enumId", name_key="name")
            return {"enumName": enum_name, "count": len(matched), "enumIds": [e.get("enumId") for e in matched]}
        return {"enumName": enum_name, "count": 0, "enumIds": []}

    def pull_all_enums(self) -> Dict[str, int]:
        enums = self.client.get_json("/enum/all")
        count = 0
        for enum in enums:
            enum_yaml = yaml.dump(enum, sort_keys=False)
            write_yaml_entity(self.vault_path, ENUM_DIR, enum_yaml, "enumId", name_key="name")
            count += 1
        return {"enums": count}

    def list_enums_from_server(self) -> Dict[str, Any]:
        enums = self.client.get_json("/enum/all")
        enum_summaries = []
        for e in enums:
            enum_summaries.append({
                "enumId": e.get("enumId"),
                "name": e.get("name"),
                "description": e.get("description"),
                "itemCount": len(e.get("items") or [])
            })
        return {"count": len(enum_summaries), "enums": enum_summaries}

    def push_enum_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        source_enum = yaml.safe_load(source_yaml) if source_yaml.strip() else {}
        source_enum_id = str((source_enum or {}).get("enumId") or "").strip()
        pushed_yaml = self.client.save_enum_yaml(source_yaml)
        pushed_enum = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        pushed_enum_id = str((pushed_enum or {}).get("enumId") or "").strip()

        if file_path.resolve().is_relative_to((self.vault_path / ENUM_DIR).resolve()):
            write_yaml_entity(self.vault_path, ENUM_DIR, pushed_yaml, "enumId", name_key="name")
            if source_enum_id and pushed_enum_id and source_enum_id != pushed_enum_id and file_path.exists():
                file_path.unlink()
        else:
            file_path.write_text(pushed_yaml, encoding="utf-8")

        return {
            "status": "pushed",
            "file": str(file_path),
            "sourceEnumId": source_enum_id or None,
            "enumId": pushed_enum_id or None,
            "replaced": bool(source_enum_id and pushed_enum_id and source_enum_id != pushed_enum_id)
        }

    def pull_one_ingest_table_config(self, table_config_id: str) -> Dict[str, Any]:
        table_yaml = self.client.get_text("/ingest/table/config/yaml", {"table_config_id": table_config_id})
        write_yaml_entity(self.vault_path, INGEST_TABLE_CONFIG_DIR, table_yaml, "configId", name_key="name")
        return {"tableConfigId": table_config_id, "status": "pulled"}

    def pull_one_ingest_model_config(self, model_id: str) -> Dict[str, Any]:
        model_yaml = self.client.get_text("/ingest/model/config/yaml", {"model_id": model_id})
        write_yaml_entity(self.vault_path, INGEST_MODEL_CONFIG_DIR, model_yaml, "modelId", name_key="modelName")
        return {"modelId": model_id, "status": "pulled"}

    def pull_one_ingest_module_config(self, module_id: str) -> Dict[str, Any]:
        module_yaml = self.client.get_text("/ingest/module/config/yaml", {"module_id": module_id})
        write_yaml_entity(self.vault_path, INGEST_MODULE_CONFIG_DIR, module_yaml, "moduleId", name_key="moduleName")
        return {"moduleId": module_id, "status": "pulled"}

    def pull_one_ingest_table_config_by_name(self, table_name: str) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/table/all")
        matched = [config for config in configs if str(config.get("name") or "") == table_name]
        if len(matched) == 0:
            raise AgentCliException(f"Ingest table config not found by name: {table_name}")
        if len(matched) > 1:
            raise AgentCliException(f"Multiple ingest table configs found by name: {table_name}")
        return self.pull_one_ingest_table_config(str(matched[0].get("configId")))

    def pull_one_ingest_model_config_by_name(self, model_name: str) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/model/all")
        matched = [config for config in configs if str(config.get("modelName") or "") == model_name]
        if len(matched) == 0:
            raise AgentCliException(f"Ingest model config not found by name: {model_name}")
        if len(matched) > 1:
            raise AgentCliException(f"Multiple ingest model configs found by name: {model_name}")
        return self.pull_one_ingest_model_config(str(matched[0].get("modelId")))

    def pull_one_ingest_module_config_by_name(self, module_name: str) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/module/all")
        matched = [config for config in configs if str(config.get("moduleName") or "") == module_name]
        if len(matched) == 0:
            raise AgentCliException(f"Ingest module config not found by name: {module_name}")
        if len(matched) > 1:
            raise AgentCliException(f"Multiple ingest module configs found by name: {module_name}")
        return self.pull_one_ingest_module_config(str(matched[0].get("moduleId")))

    def pull_ingest_model_with_children(self, model_id: str) -> Dict[str, Any]:
        model_yaml = self.client.get_text("/ingest/model/config/yaml", {"model_id": model_id})
        model = yaml.safe_load(model_yaml) if model_yaml.strip() else {}
        write_yaml_entity(self.vault_path, INGEST_MODEL_CONFIG_DIR, model_yaml, "modelId", name_key="modelName")

        model_name = str((model or {}).get("modelName") or "")
        module_id = str((model or {}).get("moduleId") or "")
        pulled_module = None
        if module_id:
            module_yaml = self.client.get_text("/ingest/module/config/yaml", {"module_id": module_id})
            write_yaml_entity(self.vault_path, INGEST_MODULE_CONFIG_DIR, module_yaml, "moduleId", name_key="moduleName")
            module = yaml.safe_load(module_yaml) if module_yaml.strip() else {}
            pulled_module = {"moduleId": module_id, "moduleName": (module or {}).get("moduleName")}

        table_configs = self.client.get_json("/ingest/config/table/all")
        matched_tables = [table for table in table_configs if str(table.get("modelName") or "") == model_name]
        for table in matched_tables:
            table_yaml = yaml.dump(table, sort_keys=False)
            write_yaml_entity(self.vault_path, INGEST_TABLE_CONFIG_DIR, table_yaml, "configId", name_key="name")

        return {
            "modelId": model_id,
            "modelName": model_name or None,
            "module": pulled_module,
            "tableCount": len(matched_tables),
            "status": "pulled-with-children"
        }

    def pull_ingest_model_with_children_by_name(self, model_name: str) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/model/all")
        matched = [config for config in configs if str(config.get("modelName") or "") == model_name]
        if len(matched) == 0:
            raise AgentCliException(f"Ingest model config not found by name: {model_name}")
        if len(matched) > 1:
            raise AgentCliException(f"Multiple ingest model configs found by name: {model_name}")
        return self.pull_ingest_model_with_children(str(matched[0].get("modelId")))

    def pull_ingest_module_with_children(self, module_id: str) -> Dict[str, Any]:
        module_yaml = self.client.get_text("/ingest/module/config/yaml", {"module_id": module_id})
        module = yaml.safe_load(module_yaml) if module_yaml.strip() else {}
        write_yaml_entity(self.vault_path, INGEST_MODULE_CONFIG_DIR, module_yaml, "moduleId", name_key="moduleName")

        model_configs = self.client.get_json("/ingest/config/model/all")
        module_models = [model for model in model_configs if str(model.get("moduleId") or "") == module_id]
        model_names: Set[str] = set()
        for model in module_models:
            model_yaml = yaml.dump(model, sort_keys=False)
            write_yaml_entity(self.vault_path, INGEST_MODEL_CONFIG_DIR, model_yaml, "modelId", name_key="modelName")
            model_name = str(model.get("modelName") or "")
            if model_name:
                model_names.add(model_name)

        table_configs = self.client.get_json("/ingest/config/table/all")
        matched_tables = [table for table in table_configs if str(table.get("modelName") or "") in model_names]
        for table in matched_tables:
            table_yaml = yaml.dump(table, sort_keys=False)
            write_yaml_entity(self.vault_path, INGEST_TABLE_CONFIG_DIR, table_yaml, "configId", name_key="name")

        return {
            "moduleId": module_id,
            "moduleName": (module or {}).get("moduleName"),
            "modelCount": len(module_models),
            "tableCount": len(matched_tables),
            "status": "pulled-with-children"
        }

    def pull_ingest_module_with_children_by_name(self, module_name: str) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/module/all")
        matched = [config for config in configs if str(config.get("moduleName") or "") == module_name]
        if len(matched) == 0:
            raise AgentCliException(f"Ingest module config not found by name: {module_name}")
        if len(matched) > 1:
            raise AgentCliException(f"Multiple ingest module configs found by name: {module_name}")
        return self.pull_ingest_module_with_children(str(matched[0].get("moduleId")))

    def push_ingest_table_config_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        pushed_yaml = self.client.post_text("/ingest/table/config/yaml", source_yaml)
        write_yaml_entity(self.vault_path, INGEST_TABLE_CONFIG_DIR, pushed_yaml, "configId", name_key="name")
        file_path.write_text(pushed_yaml, encoding="utf-8")
        pushed = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        return {"status": "pushed", "file": str(file_path), "configId": (pushed or {}).get("configId")}

    def push_ingest_model_config_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        pushed_yaml = self.client.post_text("/ingest/model/config/yaml", source_yaml)
        write_yaml_entity(self.vault_path, INGEST_MODEL_CONFIG_DIR, pushed_yaml, "modelId", name_key="modelName")
        file_path.write_text(pushed_yaml, encoding="utf-8")
        pushed = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        return {"status": "pushed", "file": str(file_path), "modelId": (pushed or {}).get("modelId")}

    def push_ingest_module_config_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise AgentCliException(f"File not found: {file_path}")
        source_yaml = file_path.read_text(encoding="utf-8")
        pushed_yaml = self.client.post_text("/ingest/module/config/yaml", source_yaml)
        write_yaml_entity(self.vault_path, INGEST_MODULE_CONFIG_DIR, pushed_yaml, "moduleId", name_key="moduleName")
        file_path.write_text(pushed_yaml, encoding="utf-8")
        pushed = yaml.safe_load(pushed_yaml) if pushed_yaml.strip() else {}
        return {"status": "pushed", "file": str(file_path), "moduleId": (pushed or {}).get("moduleId")}

    def list_ingest_table_configs_from_server(self) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/table/all")
        summaries = [{"configId": c.get("configId"), "name": c.get("name"), "modelName": c.get("modelName")} for c in configs]
        return {"count": len(summaries), "tableConfigs": summaries}

    def list_ingest_model_configs_from_server(self) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/model/all")
        summaries = [{"modelId": c.get("modelId"), "modelName": c.get("modelName"), "moduleId": c.get("moduleId")} for c in configs]
        return {"count": len(summaries), "modelConfigs": summaries}

    def list_ingest_module_configs_from_server(self) -> Dict[str, Any]:
        configs = self.client.get_json("/ingest/config/module/all")
        summaries = [{"moduleId": c.get("moduleId"), "moduleName": c.get("moduleName")} for c in configs]
        return {"count": len(summaries), "moduleConfigs": summaries}

    def resolve_tenant_info(self) -> Dict[str, Any]:
        topic_tenant_ids = self._tenant_ids_from_topics()
        pipeline_tenant_ids = self._tenant_ids_from_pipelines()
        tenant_ids: Set[str] = set(topic_tenant_ids) | set(pipeline_tenant_ids)
        sorted_tenant_ids: List[str] = sorted(tenant_ids)
        return {
            "tenantIds": sorted_tenant_ids,
            "currentTenantId": sorted_tenant_ids[0] if len(sorted_tenant_ids) == 1 else None,
            "sources": {
                "topic": topic_tenant_ids,
                "pipeline": pipeline_tenant_ids
            }
        }

    def _tenant_ids_from_topics(self) -> List[str]:
        topics = self.client.get_json("/topic/all")
        tenant_ids = {topic.get("tenantId") for topic in topics if topic.get("tenantId")}
        return sorted(tenant_ids)

    def _tenant_ids_from_pipelines(self) -> List[str]:
        try:
            pipelines = self.client.get_json("/pipeline/all")
        except Exception:
            return []
        tenant_ids = {pipeline.get("tenantId") for pipeline in pipelines if pipeline.get("tenantId")}
        return sorted(tenant_ids)

    def _validate_topic_yaml_labels(self, topic_yaml: str) -> None:
        try:
            topic = yaml.safe_load(topic_yaml)
        except Exception as e:
            raise AgentCliException(f"Invalid topic YAML: {e}")
        factors = topic.get("factors") if isinstance(topic, dict) else None
        if not isinstance(factors, list):
            return
        missing_labels = []
        label_suggestions = []
        for factor in factors:
            if not isinstance(factor, dict):
                continue
            factor_name = (factor.get("name") or "").strip()
            label = (factor.get("label") or "").strip()
            if not label:
                missing_labels.append(factor_name or "<unknown>")
                if factor_name:
                    words = [word for word in factor_name.replace("-", "_").split("_") if word]
                    suggested = " ".join(word.capitalize() for word in words) or factor_name
                    label_suggestions.append(f"{factor_name} -> {suggested}")
        if missing_labels:
            suggestions = ", ".join(label_suggestions[:8])
            raise AgentCliException(
                f"Topic factor label validation failed. Missing label on factors: {', '.join(missing_labels[:20])}. "
                f"Suggested business labels: {suggestions}"
            )

    def _validate_local_topic_name_uniqueness(self, incoming_topic_yaml: str | None = None) -> None:
        incoming_topic = None
        if incoming_topic_yaml is not None:
            try:
                incoming_topic = yaml.safe_load(incoming_topic_yaml)
            except Exception as e:
                raise AgentCliException(f"Invalid topic YAML: {e}")
            if not isinstance(incoming_topic, dict):
                return
            incoming_name = str(incoming_topic.get("name") or "").strip()
            incoming_id = str(incoming_topic.get("topicId") or "").strip()
            if incoming_name == "":
                return
            local_topics = [incoming_topic]
        else:
            local_topics = []
            incoming_name = ""
            incoming_id = ""

        for local_yaml in read_yaml_entities(self.vault_path, TOPIC_DIR):
            try:
                local_topic = yaml.safe_load(local_yaml)
            except Exception as e:
                raise AgentCliException(f"Invalid local topic YAML in vault: {e}")
            if not isinstance(local_topic, dict):
                continue
            local_topics.append(local_topic)

        if incoming_topic_yaml is not None:
            conflicts = []
            for local_topic in local_topics:
                local_name = str(local_topic.get("name") or "").strip()
                local_id = str(local_topic.get("topicId") or "").strip()
                if local_name == incoming_name and local_id != incoming_id:
                    conflicts.append(local_id or "<empty-topic-id>")
            if conflicts:
                raise AgentCliException(
                    f"Topic name must be unique in local vault. "
                    f"Found duplicated name '{incoming_name}' with topicId(s): {', '.join(sorted(set(conflicts)))}"
                )
            return

        name_to_ids: Dict[str, Set[str]] = {}
        for local_topic in local_topics:
            local_name = str(local_topic.get("name") or "").strip()
            local_id = str(local_topic.get("topicId") or "").strip()
            if local_name == "":
                continue
            if local_name not in name_to_ids:
                name_to_ids[local_name] = set()
            name_to_ids[local_name].add(local_id or "<empty-topic-id>")
        duplicated = {name: ids for name, ids in name_to_ids.items() if len(ids) > 1}
        if duplicated:
            details = "; ".join([f"{name}: {', '.join(sorted(ids))}" for name, ids in duplicated.items()])
            raise AgentCliException(f"Topic name must be unique in local vault before push. Duplicates: {details}")
