from datetime import datetime
from typing import Optional, Tuple, Union, List

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest.util import raise_404, raise_500
from watchmen_metricflow.meta.alert_rule_meta_service import AlertRuleService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertStatus, AlertSeverity, AlertConditionLogic, \
    AlertOperator, AlertCondition, AlertConditionResult
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.metricflow.main_api import query
from metricflow.engine.metricflow_engine import MetricFlowQueryResult
from watchmen_metricflow.util import trans_readonly

class AlertTriggerService:
    def __init__(self, principal_service: PrincipalService):
        self.principal_service = principal_service
        self.alert_rule_service = AlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

    def _load_rule(self, rule_id: str) -> GlobalAlertRule:

        def load_rule() -> GlobalAlertRule:
            rule = self.alert_rule_service.find_by_id(rule_id)
            if rule is None:
                raise_500(f'Alert rule not found.{rule_id}')
            return rule
        return trans_readonly(self.alert_rule_service, load_rule)

    def _load_metric(self, metric_id: str) -> Metric:
        def load_metric() -> Metric:
            metric = self.metric_service.find_by_id(metric_id)
            if metric is None:
                raise_500(f'Metric with id {metric_id} not found.')
            return metric
        return trans_readonly(self.metric_service, load_metric)

    async def _get_metric_value(self, metric_name: str) -> float:
        config = await build_metric_config(self.principal_service)
        query_result: MetricFlowQueryResult = query(
            cfg=config,
            metrics=[metric_name],
            group_by=[]
        )
        if query_result.result_df.rows and len(query_result.result_df.rows) > 0:
            val = query_result.result_df.rows[0][0]
            try:
                return float(val)
            except (ValueError, TypeError):
                return 0.0
        return 0.0

    @staticmethod
    def _check_condition(cond: Union[AlertCondition, dict], val: float) -> bool:
        if isinstance(cond, dict):
            op = cond.get('operator')
            value = cond.get('value')
        else:
            op = cond.operator
            value = cond.value

        if op is None or value is None:
            return False

        try:
            target = float(value)
        except (ValueError, TypeError):
            return False

        if op == AlertOperator.GT: return val > target
        if op == AlertOperator.LT: return val < target
        if op == AlertOperator.GE: return val >= target
        if op == AlertOperator.LE: return val <= target
        if op == AlertOperator.EQ: return val == target
        if op == AlertOperator.NE: return val != target
        return False

    async def _evaluate_condition_async(self, cond: Union[AlertCondition, dict]) -> AlertConditionResult:
        if isinstance(cond, dict):
            metric_id = cond.get('metricId')
            value = cond.get('value')
            operator = cond.get('operator')
        else:
            metric_id = cond.metricId
            value = cond.value
            operator = cond.operator
            
        if not metric_id:
            return AlertConditionResult(triggered=False, currentValue=0.0)
        
        metric = self._load_metric(metric_id)
        val = await self._get_metric_value(metric.name)
        triggered = self._check_condition(cond, val)
        
        return AlertConditionResult(
            metricId=metric_id,
            metricName=metric.name,
            operator=operator,
            value=value,
            currentValue=val,
            triggered=triggered
        )

    async def _evaluate_rule(self, rule: GlobalAlertRule) -> Tuple[bool, str, List[AlertConditionResult]]:
        triggered = False
        condition_results: List[AlertConditionResult] = []

        if rule.conditions and len(rule.conditions) > 0:
            for c in rule.conditions:
                res = await self._evaluate_condition_async(c)
                condition_results.append(res)
            
            if rule.conditionLogic == AlertConditionLogic.OR:
                triggered = any(r.triggered for r in condition_results)
            else:  # AND
                triggered = all(r.triggered for r in condition_results)
        
        message = f"Rule {rule.name} triggered." if triggered else "Normal"
        return triggered, message, condition_results

    def _get_severity(self, priority: str) -> AlertSeverity:
        if priority == 'critical':
            return AlertSeverity.CRITICAL
        elif priority == 'high':
            return AlertSeverity.WARNING
        return AlertSeverity.INFO

    async def run_alert_rule(self, rule_id: str) -> AlertStatus:
        rule = self._load_rule(rule_id)
        
        triggered, message, condition_results = await self._evaluate_rule(rule)
        severity = self._get_severity(rule.priority)

        return AlertStatus(
            id=str(self.alert_rule_service.snowflakeGenerator.next_id()),
            ruleId=rule.id,
            ruleName=rule.name,
            triggered=triggered,
            triggeredAt=datetime.now() if triggered else None,
            severity=severity,
            message=message,
            acknowledged=False,
            conditionResults=condition_results
        )
