from dbt.artifacts.resources import (
    Dimension,
    DimensionTypeParams,
    Entity,
    Measure,
    NonAdditiveDimension,
)
from dbt.clients.jinja import get_rendered
from dbt.context.context_config import (
    BaseContextConfigGenerator,
    ContextConfigGenerator,
    UnrenderedConfigGenerator,
)
from dbt.context.providers import (
    generate_parse_semantic_models,
)
from dbt.contracts.files import SchemaSourceFile
from dbt.contracts.graph.nodes import SemanticModel
from dbt.contracts.graph.unparsed import (
    UnparsedDimension,
    UnparsedDimensionTypeParams,
    UnparsedEntity,
    UnparsedMeasure,
    UnparsedMetric,
    UnparsedMetricTypeParams,
    UnparsedNonAdditiveDimension,
    UnparsedSemanticModel,
)
from dbt.exceptions import JSONValidationError, YamlParseDictError
from dbt.node_types import NodeType
from dbt.parser.common import YamlBlock
from dbt.parser.schemas import SchemaParser, YamlReader
from dbt_common.dataclass_schema import ValidationError
from dbt_semantic_interfaces.type_enums import (
    AggregationType,
    DimensionType,
    EntityType,
    TimeGranularity,
)
from typing import List, Optional
from watchmen_metricflow.config.parse.metric_parser import MetricParser


class SemanticModelParser(YamlReader):
    def __init__(self, schema_parser: SchemaParser, yaml: YamlBlock) -> None:
        super().__init__(schema_parser, yaml, "semantic_models")
        self.schema_parser = schema_parser
        self.yaml = yaml

    def _get_dimension_type_params(
        self, unparsed: Optional[UnparsedDimensionTypeParams]
    ) -> Optional[DimensionTypeParams]:
        if unparsed is not None:
            return DimensionTypeParams(
                time_granularity=TimeGranularity(unparsed.time_granularity),
                validity_params=unparsed.validity_params,
            )
        else:
            return None

    def _get_dimensions(self, unparsed_dimensions: List[UnparsedDimension]) -> List[Dimension]:
        dimensions: List[Dimension] = []
        for unparsed in unparsed_dimensions:
            dimensions.append(
                Dimension(
                    name=unparsed.name,
                    type=DimensionType(unparsed.type),
                    description=unparsed.description,
                    label=unparsed.label,
                    is_partition=unparsed.is_partition,
                    type_params=self._get_dimension_type_params(unparsed=unparsed.type_params),
                    expr=unparsed.expr,
                    metadata=None,  # TODO: requires a fair bit of parsing context
                )
            )
        return dimensions

    def _get_entities(self, unparsed_entities: List[UnparsedEntity]) -> List[Entity]:
        entities: List[Entity] = []
        for unparsed in unparsed_entities:
            entities.append(
                Entity(
                    name=unparsed.name,
                    type=EntityType(unparsed.type),
                    description=unparsed.description,
                    label=unparsed.label,
                    role=unparsed.role,
                    expr=unparsed.expr,
                )
            )

        return entities

    def _get_non_additive_dimension(
        self, unparsed: Optional[UnparsedNonAdditiveDimension]
    ) -> Optional[NonAdditiveDimension]:
        if unparsed is not None:
            return NonAdditiveDimension(
                name=unparsed.name,
                window_choice=AggregationType(unparsed.window_choice),
                window_groupings=unparsed.window_groupings,
            )
        else:
            return None

    def _get_measures(self, unparsed_measures: List[UnparsedMeasure]) -> List[Measure]:
        measures: List[Measure] = []
        for unparsed in unparsed_measures:
            measures.append(
                Measure(
                    name=unparsed.name,
                    agg=AggregationType(unparsed.agg),
                    description=unparsed.description,
                    label=unparsed.label,
                    expr=str(unparsed.expr) if unparsed.expr is not None else None,
                    agg_params=unparsed.agg_params,
                    non_additive_dimension=self._get_non_additive_dimension(
                        unparsed.non_additive_dimension
                    ),
                    agg_time_dimension=unparsed.agg_time_dimension,
                )
            )
        return measures

    def _create_metric(
        self,
        measure: UnparsedMeasure,
        enabled: bool,
        semantic_model_name: str,
    ) -> None:
        unparsed_metric = UnparsedMetric(
            name=measure.name,
            label=measure.label or measure.name,
            type="simple",
            type_params=UnparsedMetricTypeParams(measure=measure.name, expr=measure.name),
            description=measure.description or f"Metric created from measure {measure.name}",
            config={"enabled": enabled},
        )

        parser = MetricParser(self.schema_parser, yaml=self.yaml)
        parser.parse_metric(unparsed=unparsed_metric, generated_from=semantic_model_name)

    def _generate_semantic_model_config(
        self, target: UnparsedSemanticModel, fqn: List[str], package_name: str, rendered: bool
    ):
        generator: BaseContextConfigGenerator
        if rendered:
            generator = ContextConfigGenerator(self.root_project)
        else:
            generator = UnrenderedConfigGenerator(self.root_project)

        # configs with precendence set
        precedence_configs = dict()
        # first apply semantic model configs
        precedence_configs.update(target.config)

        config = generator.calculate_node_config(
            config_call_dict={},
            fqn=fqn,
            resource_type=NodeType.SemanticModel,
            project_name=package_name,
            base=False,
            patch_config_dict=precedence_configs,
        )

        return config

    def parse_semantic_model(self, unparsed: UnparsedSemanticModel) -> None:
        package_name = self.project.project_name
        unique_id = f"{NodeType.SemanticModel}.{package_name}.{unparsed.name}"
        path = self.yaml.path.relative_path

        fqn = self.schema_parser.get_fqn_prefix(path)
        fqn.append(unparsed.name)

        config = self._generate_semantic_model_config(
            target=unparsed,
            fqn=fqn,
            package_name=package_name,
            rendered=True,
        )

        config = config.finalize_and_validate()

        unrendered_config = self._generate_semantic_model_config(
            target=unparsed,
            fqn=fqn,
            package_name=package_name,
            rendered=False,
        )

        parsed = SemanticModel(
            description=unparsed.description,
            label=unparsed.label,
            fqn=fqn,
            model=unparsed.model,
            name=unparsed.name,
            node_relation=None,  # Resolved from the value of "model" after parsing
            original_file_path=self.yaml.path.original_file_path,
            package_name=package_name,
            path=path,
            resource_type=NodeType.SemanticModel,
            unique_id=unique_id,
            entities=self._get_entities(unparsed.entities),
            measures=self._get_measures(unparsed.measures),
            dimensions=self._get_dimensions(unparsed.dimensions),
            defaults=unparsed.defaults,
            primary_entity=unparsed.primary_entity,
            config=config,
            unrendered_config=unrendered_config,
            group=config.group,
        )

        ctx = generate_parse_semantic_models(
            parsed,
            self.root_project,
            self.schema_parser.manifest,
            package_name,
        )

        if parsed.model is not None:
            model_ref = "{{ " + parsed.model + " }}"
            # This sets the "refs" in the SemanticModel from the SemanticModelRefResolver in context/providers.py
            get_rendered(model_ref, ctx, parsed)

        # if the semantic model is disabled we do not want it included in the manifest,
        # only in the disabled dict
        assert isinstance(self.yaml.file, SchemaSourceFile)
        if parsed.config.enabled:
            self.manifest.add_semantic_model(self.yaml.file, parsed)
        else:
            self.manifest.add_disabled(self.yaml.file, parsed)

        # Create a metric for each measure with `create_metric = True`
        for measure in unparsed.measures:
            if measure.create_metric is True:
                self._create_metric(
                    measure=measure, enabled=parsed.config.enabled, semantic_model_name=parsed.name
                )

    def parse(self) -> None:
        for data in self.get_key_dicts():
            try:
                print("------tett------")
                UnparsedSemanticModel.validate(data)
                unparsed = UnparsedSemanticModel.from_dict(data)
            except (ValidationError, JSONValidationError) as exc:
                raise YamlParseDictError(self.yaml.path, self.key, data, exc)

            self.parse_semantic_model(unparsed)