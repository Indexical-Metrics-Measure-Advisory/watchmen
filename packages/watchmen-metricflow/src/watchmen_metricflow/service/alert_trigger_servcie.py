from datetime import datetime, timedelta
from logging import getLogger
from typing import Optional, Tuple, Union, List, Dict, Any

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest.util import raise_404, raise_500
from watchmen_metricflow.meta.alert_rule_meta_service import AlertRuleService
from watchmen_metricflow.meta.alert_instance_meta_service import AlertInstanceService
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.meta.suggest_action_meta_service import SuggestedActionService, ActionTypeService
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertStatus, AlertSeverity, AlertConditionLogic, \
    AlertOperator, AlertCondition, AlertConditionResult, AlertAction
from watchmen_metricflow.model.alert_instance import AlertInstance
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.suggest_action import SuggestedAction, ActionType
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.service.hooks import build_alert_hook_dispatcher
from watchmen_metricflow.settings import ask_analysis_web_base_url, mf_settings
from metricflow.engine.metricflow_engine import MetricFlowQueryResult
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_rest import create_jwt_token

logger = getLogger(__name__)

class AlertTriggerService:
    def __init__(self, principal_service: PrincipalService):
        self.principal_service = principal_service
        self.alert_rule_service = AlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.alert_instance_service = AlertInstanceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.analysis_service = BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
        self.subscription_service = SubscriptionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
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
            execution_mode = str(ref_data.get('executionMode') or '').lower()
            manual_execution = execution_mode in {'manual', 'approval'}
            ref_data = {**ref_data, 'manualExecution': manual_execution or bool(ref_data.get('manualExecution', False))}
            return AlertAction(**ref_data)
        suggested = self._load_suggested_action(action_id)

        if suggested is None:
            ref_type_id = ref_data.get('typeId')
            ref_action_type = self._load_action_type(ref_type_id) if ref_type_id is not None else None
            ref_action_type_data = self._to_dict(ref_action_type) if ref_action_type is not None else {}
            execution_mode = str(ref_data.get('executionMode') or '').lower()
            requires_approval = bool(ref_action_type_data.get('requiresApproval')) if ref_action_type_data else False
            manual_execution = execution_mode in {'manual', 'approval'} or requires_approval
            return AlertAction(
                id=action_id,
                type=ref_data.get('type'),
                typeId=ref_data.get('typeId'),
                riskLevel=ref_data.get('riskLevel'),
                name=ref_data.get('name'),
                content=ref_data.get('content'),
                expectedEffect=ref_data.get('expectedEffect'),
                target=ref_data.get('target'),
                template=ref_data.get('template'),
                parameters=ref_data.get('parameters'),
                suggestedAction=None,
                actionType=ref_action_type_data,
                manualExecution=manual_execution
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
        suggested_execution_mode = str(suggested_data.get('executionMode') or '').lower()
        requires_approval = bool(action_type_data.get('requiresApproval')) if action_type_data else False
        manual_execution = suggested_execution_mode in {'manual', 'approval'} or requires_approval

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
            actionType=action_type_data,
            manualExecution=manual_execution
        )

    async def _notify_callbacks(self, rule: GlobalAlertRule, message: str, actions: List[AlertAction],
                                condition_results: list = None,
                                report_data: list = None,
                                share_link: str = None) -> bool:
        return await self.hook_dispatcher.execute_actions(rule, message, actions, condition_results, report_data, share_link)

    def _build_share_link(self, analysis_id: str) -> str:
        base_url = ask_analysis_web_base_url().rstrip('/')
        subject = self.principal_service.get_user_name()
        token = create_jwt_token(
            subject=subject,
            expires_delta=timedelta(minutes=mf_settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            secret_key=mf_settings.JWT_SECRET_KEY,
            algorithm=mf_settings.JWT_ALGORITHM
        )
        return f'{base_url}/share/analysis/{analysis_id}?token={token}'

    def _resolve_share_link(self, rule_id: Optional[str], share_link: Optional[str]) -> Optional[str]:
        if share_link is not None and len(str(share_link).strip()) > 0:
            return share_link
        if rule_id is None:
            return None
        value = str(rule_id)
        if '_' not in value:
            return None
        analysis_id = value.split('_', 1)[0]
        if len(analysis_id.strip()) == 0:
            return None
        try:
            return self._build_share_link(analysis_id)
        except Exception:
            logger.exception('[AlertTriggerService] failed to build share link from rule_id=%s', rule_id)
            return None

    @staticmethod
    def _is_manual_execution_action(action: AlertAction) -> bool:
        if bool(getattr(action, 'manualExecution', False)):
            return True
        suggested = getattr(action, 'suggestedAction', None) or {}
        mode = str(suggested.get('executionMode') or '').lower()
        if mode in {'manual', 'approval'}:
            return True
        action_type = getattr(action, 'actionType', None) or {}
        if bool(action_type.get('requiresApproval')):
            return True
        return False

    def _resolve_subscription_recipients(self, rule_id: Optional[str], tenant_id: str) -> List[str]:
        if rule_id is None or len(str(rule_id).strip()) == 0:
            return []
        try:
            analyses = trans_readonly(self.analysis_service, lambda: self.analysis_service.find_all(tenant_id)) or []
        except Exception:
            logger.exception('[AlertTriggerService] failed to load analyses when resolving subscription recipients, rule_id=%s',
                             rule_id)
            return []

        matched_analysis_id = None
        for analysis in analyses:
            for card in analysis.cards or []:
                alert = getattr(card, 'alert', None)
                if alert is None:
                    continue
                alert_id = None
                if isinstance(alert, dict):
                    alert_id = alert.get('id')
                else:
                    alert_id = getattr(alert, 'id', None)
                if str(alert_id or '').strip() == str(rule_id).strip():
                    matched_analysis_id = analysis.id
                    break
            if matched_analysis_id is not None:
                break

        if matched_analysis_id is None:
            logger.info('[AlertTriggerService] no analysis matched rule_id when resolving recipients, rule_id=%s', rule_id)
            return []

        try:
            subscriptions = trans_readonly(
                self.subscription_service,
                lambda: self.subscription_service.find_by_analysis_id(matched_analysis_id, tenant_id)
            ) or []
        except Exception:
            logger.exception('[AlertTriggerService] failed to load subscriptions, analysis_id=%s, rule_id=%s',
                             matched_analysis_id, rule_id)
            return []

        recipients: List[str] = []
        for subscription in subscriptions:
            if not getattr(subscription, 'enabled', False):
                continue
            for recipient in (getattr(subscription, 'recipients', None) or []):
                if isinstance(recipient, str) and len(recipient.strip()) > 0:
                    recipients.append(recipient.strip())
        deduped = sorted(list(set(recipients)))
        logger.info('[AlertTriggerService] resolved subscription recipients, rule_id=%s, analysis_id=%s, recipients_count=%s',
                    rule_id, matched_analysis_id, len(deduped))
        return deduped

    def _resolve_analysis_context(self, rule_id: Optional[str], tenant_id: str) -> Tuple[Optional[Any], Optional[GlobalAlertRule], List[Any]]:
        if rule_id is None or len(str(rule_id).strip()) == 0:
            return None, None, []
        try:
            analyses = trans_readonly(self.analysis_service, lambda: self.analysis_service.find_all(tenant_id)) or []
        except Exception:
            logger.exception('[AlertTriggerService] failed to load analyses when resolving analysis context, rule_id=%s',
                             rule_id)
            return None, None, []

        matched_analysis = None
        matched_rule = None
        for analysis in analyses:
            for card in analysis.cards or []:
                alert = getattr(card, 'alert', None)
                if alert is None:
                    continue
                alert_id = alert.get('id') if isinstance(alert, dict) else getattr(alert, 'id', None)
                runtime_rule_id = f'{analysis.id}_{card.id}'
                if str(alert_id or '').strip() == str(rule_id).strip() or runtime_rule_id == str(rule_id).strip():
                    matched_analysis = analysis
                    matched_rule = GlobalAlertRule.model_validate(alert)
                    matched_rule.id = runtime_rule_id
                    matched_rule.name = f'{analysis.name} / {card.title}'
                    break
            if matched_analysis is not None:
                break

        if matched_analysis is None:
            return None, None, []

        try:
            subscriptions = trans_readonly(
                self.subscription_service,
                lambda: self.subscription_service.find_by_analysis_id(matched_analysis.id, tenant_id)
            ) or []
        except Exception:
            logger.exception('[AlertTriggerService] failed to load subscriptions when resolving analysis context, '
                             'analysis_id=%s, rule_id=%s', matched_analysis.id, rule_id)
            return matched_analysis, matched_rule, []

        return matched_analysis, matched_rule, subscriptions

    @staticmethod
    def _is_notification_action(action: AlertAction) -> bool:
        action_type = None
        if action.actionType is not None:
            action_type = action.actionType.get('category') or action.actionType.get('code')
        if action_type is None:
            action_type = action.type
        return str(action_type or '').lower() in {'notification', 'notifycation'}

    def _resolve_actions(self, rule: GlobalAlertRule) -> List[AlertAction]:
        if rule.actions is None or len(rule.actions) == 0:
            return []
        return [self._resolve_action(x) for x in rule.actions]

    def _find_suppressed_instance(self, rule_id: str) -> Optional[AlertInstance]:
        def find_suppressed() -> Optional[AlertInstance]:
            instances = self.alert_instance_service.find_by_rule_id(rule_id)
            now = datetime.now()
            for instance in instances:
                if instance.acknowledged and instance.nextTriggerTime is not None:
                    if instance.nextTriggerTime > now:
                        return instance
            return None
        return trans_readonly(self.alert_instance_service, find_suppressed)

    def _find_active_unacknowledged_instance(self, rule_id: str, tenant_id: str) -> Optional[AlertInstance]:
        def find_active() -> Optional[AlertInstance]:
            instances = self.alert_instance_service.find_by_rule_id(rule_id, tenant_id)
            active = [instance for instance in instances if not getattr(instance, 'acknowledged', False)]
            if len(active) == 0:
                return None

            def _sort_key(instance: AlertInstance):
                return instance.triggerTime or datetime.min

            active.sort(key=_sort_key, reverse=True)
            return active[0]

        return trans_readonly(self.alert_instance_service, find_active)

    async def execute_pending_actions_for_instance(self, instance_id: str, tenant_id: str) -> None:
        logger.info('[AlertTriggerService] execute_pending_actions_for_instance started, instance_id=%s, tenant_id=%s',
                    instance_id, tenant_id)

        def get_instance() -> Optional[AlertInstance]:
            return self.alert_instance_service.find_by_id_and_tenant(instance_id, tenant_id)
        instance = trans_readonly(self.alert_instance_service, get_instance)
        if instance is None:
            logger.warning('[AlertTriggerService] instance not found, skip execute, instance_id=%s, tenant_id=%s',
                           instance_id, tenant_id)
            return
        if instance.actionExecuted:
            logger.info('[AlertTriggerService] action already executed, skip execute, instance_id=%s', instance_id)
            return
        if instance.actions is None or len(instance.actions) == 0:
            logger.info('[AlertTriggerService] no actions on instance, skip execute, instance_id=%s', instance_id)
            return

        logger.info('[AlertTriggerService] instance loaded, instance_id=%s, rule_id=%s, actions_count=%s',
                    instance.instanceId, instance.ruleId, len(instance.actions))
        subscription_recipients = self._resolve_subscription_recipients(instance.ruleId, tenant_id)
        analysis, runtime_rule, subscriptions = self._resolve_analysis_context(instance.ruleId, tenant_id)
        report_runner = None
        if analysis is not None:
            from watchmen_metricflow.service.subscription_runner import SubscriptionRunner
            report_runner = SubscriptionRunner(self.principal_service)
        report_data = []
        share_link = None
        if analysis is not None and report_runner is not None:
            share_link = report_runner._build_share_link(analysis.id)
            for card in analysis.cards or []:
                result = await report_runner._process_card(card)
                if result:
                    report_data.append(result)

        def get_rule() -> Optional[GlobalAlertRule]:
            return self.alert_rule_service.find_by_id(instance.ruleId)
        rule = trans_readonly(self.alert_rule_service, get_rule)
        if rule is None and runtime_rule is not None:
            rule = runtime_rule
        if rule is None:
            logger.warning('[AlertTriggerService] rule not found, skip execute, instance_id=%s, rule_id=%s',
                           instance_id, instance.ruleId)
            return

        manual_count = 0
        success_count = 0
        for idx, raw_action in enumerate(instance.actions):
            try:
                action = self._resolve_action(raw_action)
            except Exception:
                logger.exception('[AlertTriggerService] action normalize failed, instance_id=%s, index=%s, raw_action=%s',
                                 instance_id, idx, raw_action)
                continue

            is_manual = self._is_manual_execution_action(action)
            logger.info('[AlertTriggerService] action inspect, instance_id=%s, index=%s, action_id=%s, type=%s, '
                        'name=%s, manual=%s, raw_type=%s',
                        instance_id, idx, getattr(action, 'id', None), getattr(action, 'type', None),
                        getattr(action, 'name', None), is_manual, type(raw_action).__name__)
            if is_manual:
                action.parameters = dict(action.parameters or {})
                if self._is_notification_action(action) and analysis is not None and report_runner is not None:
                    target_subscriptions = [x for x in subscriptions if getattr(x, 'enabled', False)]
                    if len(target_subscriptions) == 0:
                        logger.warning('[AlertTriggerService] no enabled subscriptions found for report dispatch, '
                                       'instance_id=%s, rule_id=%s', instance_id, instance.ruleId)
                        continue
                    manual_count += 1
                    report_sent = False
                    for subscription in target_subscriptions:
                        try:
                            await report_runner._produce_report(
                                subscription=subscription,
                                analysis=analysis,
                                report_data=report_data,
                                alert_statuses=[
                                    AlertStatus(
                                        id=instance.instanceId,
                                        ruleId=rule.id,
                                        ruleName=rule.name,
                                        triggered=True,
                                        triggeredAt=instance.triggerTime,
                                        severity=instance.severity,
                                        message=instance.message,
                                        acknowledged=instance.acknowledged,
                                        conditionResults=instance.conditionResults,
                                        actions=[action]
                                    )
                                ]
                            )
                            report_sent = True
                        except Exception:
                            logger.exception('[AlertTriggerService] report dispatch failed, instance_id=%s, subscription_id=%s',
                                             instance_id, getattr(subscription, 'id', None))
                    if report_sent:
                        success_count += 1
                    continue
                if len(subscription_recipients) > 0:
                    action.parameters['to'] = subscription_recipients
                    logger.info('[AlertTriggerService] action recipients overridden by subscriptions, instance_id=%s, index=%s, recipients=%s',
                                instance_id, idx, subscription_recipients)
                elif not action.parameters.get('to') and not action.target:
                    logger.warning('[AlertTriggerService] skip action dispatch due to missing recipients and no subscription recipients, '
                                   'instance_id=%s, index=%s, action_id=%s',
                                   instance_id, idx, getattr(action, 'id', None))
                    continue
                manual_count += 1
                logger.info('[AlertTriggerService] action dispatching, instance_id=%s, index=%s, action_id=%s',
                            instance_id, idx, getattr(action, 'id', None))
                ok = await self._notify_callbacks(rule, instance.message or '', [action], instance.conditionResults,
                                                  report_data, share_link)
                if ok:
                    success_count += 1
                    logger.info('[AlertTriggerService] action dispatched successfully, instance_id=%s, index=%s, action_id=%s',
                                instance_id, idx, getattr(action, 'id', None))
                else:
                    logger.warning('[AlertTriggerService] action dispatch failed, instance_id=%s, index=%s, action_id=%s',
                                   instance_id, idx, getattr(action, 'id', None))
            else:
                logger.info('[AlertTriggerService] action skipped (not manual), instance_id=%s, index=%s, action_id=%s',
                            instance_id, idx, getattr(action, 'id', None))

        all_manual_succeeded = manual_count > 0 and success_count == manual_count
        if all_manual_succeeded:
            def update_instance():
                instance.actionExecuted = True
                self.alert_instance_service.update(instance)
            trans(self.alert_instance_service, update_instance)
        else:
            logger.warning('[AlertTriggerService] not all manual actions succeeded, keep actionExecuted=false, '
                           'instance_id=%s, manual_count=%s, success_count=%s',
                           instance_id, manual_count, success_count)
        logger.info('[AlertTriggerService] execute_pending_actions_for_instance completed, instance_id=%s, '
                    'manual_count=%s, success_count=%s, action_executed=%s',
                    instance_id, manual_count, success_count, instance.actionExecuted)

    async def run_alert_rule(self, rule_or_id: Union[str, GlobalAlertRule],
                              report_data: list = None,
                              share_link: str = None) -> AlertStatus:
        rule = rule_or_id if isinstance(rule_or_id, GlobalAlertRule) else self._load_rule(rule_or_id)
        share_link = self._resolve_share_link(rule.id, share_link)

        suppressed_instance = self._find_suppressed_instance(rule.id)
        if suppressed_instance is not None:
            return AlertStatus(
                id=suppressed_instance.instanceId,
                ruleId=rule.id,
                ruleName=rule.name,
                triggered=False,
                triggeredAt=None,
                severity=None,
                message="Alert suppressed until " + suppressed_instance.nextTriggerTime.strftime("%Y-%m-%d %H:%M:%S"),
                acknowledged=True,
                conditionResults=None,
                actions=[]
            )

        triggered, message, condition_results = await self._evaluate_rule(rule)
        severity = self._get_severity(rule.priority)
        actions = self._resolve_actions(rule)
        instance_id = str(self.alert_rule_service.snowflakeGenerator.next_id())
        tenant_id = self.principal_service.get_tenant_id()

        if triggered:
            existing_instance = self._find_active_unacknowledged_instance(rule.id, tenant_id)
            if existing_instance is not None:
                instance_id = existing_instance.instanceId
            else:
                def create_instance():
                    instance = AlertInstance(
                        instanceId=instance_id,
                        ruleId=rule.id,
                        ruleName=rule.name,
                        triggerTime=datetime.now(),
                        severity=severity,
                        message=message,
                        conditionResults=condition_results,
                        actions=actions,
                        acknowledged=False,
                        actionExecuted=all(
                            not self._is_manual_execution_action(action) for action in (actions or [])
                        ),
                        tenantId=tenant_id,
                        userId=self.principal_service.userId
                    )
                    self.alert_instance_service.create(instance)

                trans(self.alert_instance_service, create_instance)

                if actions:
                    for action in actions:
                        if self._is_manual_execution_action(action):
                            continue
                        await self._notify_callbacks(rule, message, [action], condition_results, report_data, share_link)

        return AlertStatus(
            id=instance_id,
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
