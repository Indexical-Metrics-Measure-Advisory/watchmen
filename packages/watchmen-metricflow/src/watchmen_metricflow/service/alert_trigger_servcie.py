from datetime import datetime
from typing import Optional, Tuple, Union, List, Dict, Any

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest.util import raise_404, raise_500
from watchmen_metricflow.meta.alert_rule_meta_service import AlertRuleService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.suggest_action_meta_service import SuggestedActionService, ActionTypeService
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertStatus, AlertSeverity, AlertConditionLogic, \
    AlertOperator, AlertCondition, AlertConditionResult, AlertAction
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.suggest_action import SuggestedAction, ActionType
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.service.hooks import build_alert_hook_dispatcher
from metricflow.engine.metricflow_engine import MetricFlowQueryResult
from watchmen_metricflow.util import trans_readonly

class AlertTriggerService:
    def __init__(self, principal_service: PrincipalService):
        self.principal_service = principal_service
        self.alert_rule_service = AlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.suggested_action_service = SuggestedActionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.action_type_service = ActionTypeService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.hook_dispatcher = build_alert_hook_dispatcher()

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

    def _load_suggested_action(self, action_id: str) -> Optional[SuggestedAction]:
        def load_action() -> Optional[SuggestedAction]:
            return self.suggested_action_service.find_by_id(action_id)
        return trans_readonly(self.suggested_action_service, load_action)

    def _load_action_type(self, action_type_id: str) -> Optional[ActionType]:
        def load_action_type() -> Optional[ActionType]:
            return self.action_type_service.find_by_id(action_type_id)
        return trans_readonly(self.action_type_service, load_action_type)

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

    @staticmethod
    def _to_dict(value: Optional[Union[dict, Any]]) -> Dict[str, Any]:
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if hasattr(value, 'model_dump'):
            return value.model_dump()
        return {}

    def _resolve_action(self, action_ref: Union[AlertAction, dict]) -> AlertAction:
        ref_data = self._to_dict(action_ref)
        action_id = ref_data.get('suggestedActionId')
        if action_id is None:
            return AlertAction(**ref_data)
        suggested = self._load_suggested_action(action_id)

        if suggested is None:
            ref_type_id = ref_data.get('typeId')
            ref_action_type = self._load_action_type(ref_type_id) if ref_type_id is not None else None
            ref_action_type_data = self._to_dict(ref_action_type) if ref_action_type is not None else {}
            return AlertAction(
                id=action_id,
                type=ref_data.get('type'),
                riskLevel=ref_data.get('riskLevel'),
                name=ref_data.get('name'),
                content=ref_data.get('content'),
                expectedEffect=ref_data.get('expectedEffect'),
                target=ref_data.get('target'),
                template=ref_data.get('template'),
                parameters=ref_data.get('parameters'),
                suggestedAction=None,
                actionType=ref_action_type_data
            )
        suggested_data = self._to_dict(suggested)
        merged_parameters = {}
        suggested_params = suggested_data.get('parameters')
        if isinstance(suggested_params, dict):
            merged_parameters.update(suggested_params)
        ref_params = ref_data.get('parameters')
        if isinstance(ref_params, dict):
            merged_parameters.update(ref_params)
        action_type = None
        type_id = suggested.typeId
        if type_id is not None:
            action_type = self._load_action_type(type_id)
        action_type_data = self._to_dict(action_type) if action_type is not None else {}

        return AlertAction(
            id=action_id,
            type=ref_data.get('type'),
            typeId=type_id or ref_data.get('typeId'),
            riskLevel=ref_data.get('riskLevel') or suggested_data.get('riskLevel'),
            name=ref_data.get('name') or suggested_data.get('name'),
            content=ref_data.get('content') or suggested_data.get('description'),
            expectedEffect=ref_data.get('expectedEffect') or suggested_data.get('expectedOutcome'),
            target=ref_data.get('target') or merged_parameters.get('to'),
            template=ref_data.get('template'),
            parameters=merged_parameters if len(merged_parameters) > 0 else None,
            suggestedAction=suggested_data,
            actionType=action_type_data
        )

    async def _notify_callbacks(self, rule: GlobalAlertRule, message: str, actions: List[AlertAction]) -> None:
        await self.hook_dispatcher.execute_actions(rule, message, actions)

    def _resolve_actions(self, rule: GlobalAlertRule) -> List[AlertAction]:
        if rule.actions is None or len(rule.actions) == 0:
            return []
        return [self._resolve_action(x) for x in rule.actions]

    async def run_alert_rule(self, rule_or_id: Union[str, GlobalAlertRule]) -> AlertStatus:
        rule = rule_or_id if isinstance(rule_or_id, GlobalAlertRule) else self._load_rule(rule_or_id)
        triggered, message, condition_results = await self._evaluate_rule(rule)
        severity = self._get_severity(rule.priority)
        actions = self._resolve_actions(rule)
        if triggered and len(actions) > 0:
            await self._notify_callbacks(rule, message, actions)

        return AlertStatus(
            id=str(self.alert_rule_service.snowflakeGenerator.next_id()),
            ruleId=rule.id,
            ruleName=rule.name,
            triggered=triggered,
            triggeredAt=datetime.now() if triggered else None,
            severity=severity,
            message=message,
            acknowledged=False,
            conditionResults=condition_results,
            actions=actions
        )
