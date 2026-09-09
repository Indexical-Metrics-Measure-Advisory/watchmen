"""Response model for metric value queries.

Lives in the model layer (not the router) so both the router and the direct
(non-dbt) query service can use it without a circular import.
"""

from typing import List, Tuple

from metricflow.data_table.column_types import CellValue

from watchmen_utilities import ExtendedBaseModel


class MetricFlowResponse(ExtendedBaseModel):
    """Pydantic model for MetricFlow query results."""
    data: Tuple[Tuple[CellValue, ...], ...]
    column_names: List[str]
