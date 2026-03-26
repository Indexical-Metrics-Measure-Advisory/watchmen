from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Literal, Set

import yaml

from agent_cli.exceptions import AgentCliException
from agent_cli.http_client import RestClient
from agent_cli.vault import PIPELINE_DIR, TOPIC_DIR, read_entities, write_entities, write_yaml_entity, read_yaml_entities

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
            pipelines = self.client.get_json("/pipeline/all")
            result["pipelines"] = write_entities(self.vault_path, PIPELINE_DIR, pipelines, "pipelineId", name_key="name")
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
            pipelines = read_entities(self.vault_path, PIPELINE_DIR)
            if pipelines:
                self.client.post_json("/pipeline/import", pipelines)
            result["pipelines"] = len(pipelines)
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
        pipeline = self.client.get_json("/pipeline", {"pipeline_id": pipeline_id})
        write_entities(self.vault_path, PIPELINE_DIR, [pipeline], "pipelineId", name_key="name")
        return pipeline

    def pull_pipelines_by_name(self, pipeline_name: str) -> Dict[str, Any]:
        pipelines = self.client.get_json("/pipeline/all")
        matched = [p for p in pipelines if p.get("name") == pipeline_name]
        if matched:
            write_entities(self.vault_path, PIPELINE_DIR, matched, "pipelineId", name_key="name")
        return {"pipelineName": pipeline_name, "count": len(matched), "pipelineIds": [p.get("pipelineId") for p in matched]}

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
