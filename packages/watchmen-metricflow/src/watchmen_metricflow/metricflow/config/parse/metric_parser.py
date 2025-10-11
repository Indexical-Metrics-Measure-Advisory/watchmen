from dbt.artifacts.resources import (
    ConversionTypeParams,
    CumulativeTypeParams,
    MetricInput,
    MetricInputMeasure,
    MetricTimeWindow,
    MetricTypeParams,
)
from dbt.context.context_config import (
    BaseContextConfigGenerator,
    ContextConfigGenerator,
    UnrenderedConfigGenerator,
)
from dbt.contracts.files import SchemaSourceFile
from dbt.contracts.graph.nodes import Metric
from dbt.contracts.graph.unparsed import (
    UnparsedConversionTypeParams,
    UnparsedCumulativeTypeParams,
    UnparsedMetric,
    UnparsedMetricInput,
    UnparsedMetricInputMeasure,
)
from dbt.exceptions import JSONValidationError, YamlParseDictError
from dbt.node_types import NodeType
from dbt.parser.common import YamlBlock
from dbt.parser.schema_yaml_readers import parse_where_filter
from dbt.parser.schemas import SchemaParser, YamlReader
from dbt_common.dataclass_schema import ValidationError
from dbt_semantic_interfaces.type_enums import (
    ConversionCalculationType,
    MetricType,
    PeriodAggregation,
    TimeGranularity,
)
from typing import List, Optional, Union


class MetricParser(YamlReader):
    def __init__(self, schema_parser: SchemaParser, yaml: YamlBlock) -> None:
        # super().__init__(schema_parser, yaml, NodeType.Metric.pluralize())
        self.schema_parser = schema_parser
        self.yaml = yaml

    @staticmethod
    def _get_input_measure(

        unparsed_input_measure: Union[UnparsedMetricInputMeasure, str],
    ) -> MetricInputMeasure:
        if isinstance(unparsed_input_measure, str):
            return MetricInputMeasure(name=unparsed_input_measure)
        else:
            return MetricInputMeasure(
                name=unparsed_input_measure.name,
                filter=parse_where_filter(unparsed_input_measure.filter),
                alias=unparsed_input_measure.alias,
                join_to_timespine=unparsed_input_measure.join_to_timespine,
                fill_nulls_with=unparsed_input_measure.fill_nulls_with,
            )

    @staticmethod
    def _get_optional_input_measure(
        unparsed_input_measure: Optional[Union[UnparsedMetricInputMeasure, str]],
    ) -> Optional[MetricInputMeasure]:
        if unparsed_input_measure is not None:
            return MetricParser._get_input_measure(unparsed_input_measure)
        else:
            return None

    @staticmethod
    def _get_input_measures(

        unparsed_input_measures: Optional[List[Union[UnparsedMetricInputMeasure, str]]],
    ) -> List[MetricInputMeasure]:
        input_measures: List[MetricInputMeasure] = []
        if unparsed_input_measures is not None:
            for unparsed_input_measure in unparsed_input_measures:
                input_measures.append(MetricParser._get_input_measure(unparsed_input_measure))

        return input_measures

    @staticmethod
    def _get_period_agg(unparsed_period_agg: str) -> PeriodAggregation:
        return PeriodAggregation(unparsed_period_agg)

    @staticmethod
    def _get_optional_grain_to_date(
         unparsed_grain_to_date: Optional[str]
    ) -> Optional[TimeGranularity]:
        if not unparsed_grain_to_date:
            return None

        return TimeGranularity(unparsed_grain_to_date)

    @staticmethod
    def _get_optional_time_window(
         unparsed_window: Optional[str]
    ) -> Optional[MetricTimeWindow]:
        if unparsed_window is not None:
            parts = unparsed_window.split(" ")
            if len(parts) != 2:
                pass
                # add common  exception
                # raise YamlParseDictError(
                #     self.yaml.path,
                #     "window",
                #     {"window": unparsed_window},
                #     f"Invalid window ({unparsed_window}) in cumulative/conversion metric. Should be of the form `<count> <granularity>`, "
                #     "e.g., `28 days`",
                # )

            granularity = parts[1]
            # once we drop python 3.8 this could just be `granularity = parts[0].removesuffix('s')
            if granularity.endswith("s"):
                # months -> month
                granularity = granularity[:-1]
            if granularity not in [item.value for item in TimeGranularity]:
                pass
                # add common  exception
                # raise YamlParseDictError(
                #     self.yaml.path,
                #     "window",
                #     {"window": unparsed_window},
                #     f"Invalid time granularity {granularity} in cumulative/conversion metric window string: ({unparsed_window})",
                # )

            count = parts[0]
            if not count.isdigit():
                pass
                # raise YamlParseDictError(
                #     self.yaml.path,
                #     "window",
                #     {"window": unparsed_window},
                #     f"Invalid count ({count}) in cumulative/conversion metric window string: ({unparsed_window})",
                # )

            return MetricTimeWindow(
                count=int(count),
                granularity=TimeGranularity(granularity),
            )
        else:
            return None

    @staticmethod
    def _get_metric_input( unparsed: Union[UnparsedMetricInput, str]) -> MetricInput:
        if isinstance(unparsed, str):
            return MetricInput(name=unparsed)
        else:
            offset_to_grain: Optional[TimeGranularity] = None
            if unparsed.offset_to_grain is not None:
                offset_to_grain = TimeGranularity(unparsed.offset_to_grain)

            return MetricInput(
                name=unparsed.name,
                filter=parse_where_filter(unparsed.filter),
                alias=unparsed.alias,
                offset_window=MetricParser._get_optional_time_window(unparsed.offset_window),
                offset_to_grain=offset_to_grain,
            )

    @staticmethod
    def _get_optional_metric_input(

        unparsed: Optional[Union[UnparsedMetricInput, str]],
    ) -> Optional[MetricInput]:
        if unparsed is not None:
            return MetricParser._get_metric_input(unparsed)
        else:
            return None

    @staticmethod
    def _get_metric_inputs(
        unparsed_metric_inputs: Optional[List[Union[UnparsedMetricInput, str]]],
    ) -> List[MetricInput]:
        metric_inputs: List[MetricInput] = []
        if unparsed_metric_inputs is not None:
            for unparsed_metric_input in unparsed_metric_inputs:
                metric_inputs.append(MetricParser._get_metric_input(unparsed=unparsed_metric_input))

        return metric_inputs

    @staticmethod
    def _get_optional_conversion_type_params(
        unparsed: Optional[UnparsedConversionTypeParams]
    ) -> Optional[ConversionTypeParams]:
        if unparsed is None:
            return None
        return ConversionTypeParams(
            base_measure=MetricParser._get_input_measure(unparsed.base_measure),
            conversion_measure=MetricParser._get_input_measure(unparsed.conversion_measure),
            entity=unparsed.entity,
            calculation=ConversionCalculationType(unparsed.calculation),
            window=MetricParser._get_optional_time_window(unparsed.window),
            constant_properties=unparsed.constant_properties,
        )

    @staticmethod
    def _get_optional_cumulative_type_params(
         unparsed_metric: UnparsedMetric
    ) -> Optional[CumulativeTypeParams]:
        unparsed_type_params = unparsed_metric.type_params
        if unparsed_metric.type.lower() == MetricType.CUMULATIVE.value:
            if not unparsed_type_params.cumulative_type_params:
                unparsed_type_params.cumulative_type_params = UnparsedCumulativeTypeParams()

            if (
                unparsed_type_params.window
                and not unparsed_type_params.cumulative_type_params.window
            ):
                unparsed_type_params.cumulative_type_params.window = unparsed_type_params.window
            if (
                unparsed_type_params.grain_to_date
                and not unparsed_type_params.cumulative_type_params.grain_to_date
            ):
                unparsed_type_params.cumulative_type_params.grain_to_date = (
                    unparsed_type_params.grain_to_date
                )

            return CumulativeTypeParams(
                window=MetricParser._get_optional_time_window(
                    unparsed_type_params.cumulative_type_params.window
                ),
                grain_to_date=MetricParser._get_optional_grain_to_date(
                    unparsed_type_params.cumulative_type_params.grain_to_date
                ),
                period_agg=MetricParser._get_period_agg(
                    unparsed_type_params.cumulative_type_params.period_agg
                ),
            )

        return None

    @staticmethod
    def _get_metric_type_params(unparsed_metric: UnparsedMetric) -> MetricTypeParams:
        type_params = unparsed_metric.type_params

        grain_to_date: Optional[TimeGranularity] = None
        if type_params.grain_to_date is not None:
            grain_to_date = TimeGranularity(type_params.grain_to_date)

        return MetricTypeParams(
            measure=MetricParser._get_optional_input_measure(type_params.measure),
            numerator=MetricParser._get_optional_metric_input(type_params.numerator),
            denominator=MetricParser._get_optional_metric_input(type_params.denominator),
            expr=str(type_params.expr) if type_params.expr is not None else None,
            window=MetricParser._get_optional_time_window(type_params.window),
            grain_to_date=grain_to_date,
            metrics=MetricParser._get_metric_inputs(type_params.metrics),
            conversion_type_params=MetricParser._get_optional_conversion_type_params(
                type_params.conversion_type_params
            ),
            cumulative_type_params=MetricParser._get_optional_cumulative_type_params(
                unparsed_metric=unparsed_metric,
            ),
            # input measures are calculated via metric processing post parsing
            # input_measures=?,
        )

    @staticmethod
    def parse_metric(unparsed: UnparsedMetric, schema_parser: SchemaParser, yaml: YamlBlock, generated_from: Optional[str] = None) -> Metric:
        """
        Static method: parse an UnparsedMetric into a Metric node without mutating parser state.
        This focuses purely on the transformation from UnparsedMetric -> Metric.
        """
        # Create a lightweight parser instance to reuse helper methods and config calculation
        # temp_parser = MetricParser(schema_parser=schema_parser, yaml=yaml)

        package_name = "claim"
        unique_id = f"{NodeType.Metric}.{package_name}.{unparsed.name}"


        parsed = Metric(
            resource_type=NodeType.Metric,
            package_name=package_name,
            path="",
            original_file_path="",
            unique_id=unique_id,
            fqn=None,
            name=unparsed.name,
            description=unparsed.description,
            label=unparsed.label,
            type=MetricType(unparsed.type),
            type_params=MetricParser._get_metric_type_params(unparsed),
            time_granularity=(
                TimeGranularity(unparsed.time_granularity) if unparsed.time_granularity else None
            ),
            filter=parse_where_filter(unparsed.filter),
            meta=unparsed.meta,
            tags=unparsed.tags,
            # config=config,
            # unrendered_config=unrendered_config,
            # group=config.group,
        )


        return parsed

    def _generate_metric_config(
        self, target: UnparsedMetric, fqn: List[str], package_name: str, rendered: bool
    ):
        generator: BaseContextConfigGenerator
        if rendered:
            generator = ContextConfigGenerator(self.root_project)
        else:
            generator = UnrenderedConfigGenerator(self.root_project)

        # configs with precendence set
        precedence_configs = dict()
        # first apply metric configs
        precedence_configs.update(target.config)

        config = generator.calculate_node_config(
            config_call_dict={},
            fqn=fqn,
            resource_type=NodeType.Metric,
            project_name=package_name,
            base=False,
            patch_config_dict=precedence_configs,
        )

        return config

    def parse(self) -> None:
        for data in self.get_key_dicts():
            try:
                UnparsedMetric.validate(data)
                unparsed = UnparsedMetric.from_dict(data)

            except (ValidationError, JSONValidationError) as exc:
                raise YamlParseDictError(self.yaml.path, self.key, data, exc)

            parsed_node = MetricParser.parse_metric(
                unparsed=unparsed,
                schema_parser=self.schema_parser,
                yaml=self.yaml,
                generated_from=None,
            )

            # if the metric is disabled we do not want it included in the manifest, only in the disabled dict
            assert isinstance(self.yaml.file, SchemaSourceFile)
            if parsed_node.config.enabled:
                self.manifest.add_metric(self.yaml.file, parsed_node, None)
            else:
                self.manifest.add_disabled(self.yaml.file, parsed_node)