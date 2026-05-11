import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))

from watchmen_metricflow.model.alert_instance import AlertAckRequest, AlertActionExecuteRequest, AlertInstance
from watchmen_metricflow.model.alert_rule import GlobalAlertRule
from watchmen_metricflow.router import alert_rule_router
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService


class _FakePrincipal:
    userId = "u-test"

    @staticmethod
    def get_tenant_id():
        return "t-test"


class _FakeInstanceService:
    def __init__(self, instance: AlertInstance):
        self.instance = instance

    def ack_alert(self, ack_request, user_id, tenant_id):
        if ack_request.instanceId != self.instance.instanceId:
            return None
        self.instance.acknowledged = True
        self.instance.acknowledgedBy = user_id
        return self.instance

    def find_by_id_and_tenant(self, instance_id, tenant_id):
        if instance_id != self.instance.instanceId:
            return None
        return self.instance


class _FakeTriggerService:
    def __init__(self, instance: AlertInstance):
        self.instance = instance

    async def execute_pending_actions_for_instance(self, instance_id: str, tenant_id: str):
        if instance_id == self.instance.instanceId:
            self.instance.actionExecuted = True


class AlertActionFlowTest(unittest.IsolatedAsyncioTestCase):
    async def test_ack_only_does_not_execute_actions(self):
        instance = AlertInstance(
            instanceId="ins-1",
            ruleId="rule-1",
            acknowledged=False,
            actionExecuted=False
        )
        service = _FakeInstanceService(instance)
        principal = _FakePrincipal()

        with patch.object(alert_rule_router, "get_alert_instance_service", return_value=service), \
             patch.object(alert_rule_router, "trans", side_effect=lambda s, a: a()), \
             patch.object(alert_rule_router, "AlertTriggerService", side_effect=AssertionError("ack should not execute actions")):
            result = await alert_rule_router.ack_alert_rule(
                AlertAckRequest(instanceId="ins-1", reason="processed"),
                principal
            )

        self.assertTrue(result.acknowledged)
        self.assertFalse(result.actionExecuted)

    async def test_execute_only_updates_action_executed_without_ack(self):
        instance = AlertInstance(
            instanceId="ins-2",
            ruleId="rule-2",
            acknowledged=False,
            actionExecuted=False
        )
        service = _FakeInstanceService(instance)
        principal = _FakePrincipal()

        with patch.object(alert_rule_router, "get_alert_instance_service", return_value=service), \
             patch.object(alert_rule_router, "trans_readonly", side_effect=lambda s, a: a()), \
             patch.object(alert_rule_router, "AlertTriggerService", side_effect=lambda p: _FakeTriggerService(instance)):
            result = await alert_rule_router.execute_alert_actions(
                AlertActionExecuteRequest(instanceId="ins-2"),
                principal
            )

        self.assertFalse(result.acknowledged)
        self.assertTrue(result.actionExecuted)

    async def test_run_rule_reuses_existing_unacknowledged_instance(self):
        service = AlertTriggerService.__new__(AlertTriggerService)
        service.principal_service = _FakePrincipal()
        create_calls = []

        service.alert_instance_service = SimpleNamespace(
            create=lambda inst: create_calls.append(inst)
        )
        service.alert_rule_service = SimpleNamespace(
            snowflakeGenerator=SimpleNamespace(next_id=lambda: 10001)
        )
        service._find_suppressed_instance = lambda rule_id: None
        service._resolve_actions = lambda rule: []
        service._get_severity = lambda priority: None

        existing = AlertInstance(
            instanceId="ins-existing",
            ruleId="rule-3",
            acknowledged=False,
            actionExecuted=False
        )
        service._find_active_unacknowledged_instance = lambda rule_id, tenant_id: existing

        async def _evaluate_rule(rule):
            return True, "triggered", []

        async def _notify_callbacks(rule, message, actions):
            raise AssertionError("should not execute callbacks when reusing existing instance")

        service._evaluate_rule = _evaluate_rule
        service._notify_callbacks = _notify_callbacks

        rule = GlobalAlertRule(id="rule-3", enabled=True, name="Rule-3")
        result = await service.run_alert_rule(rule)

        self.assertEqual("ins-existing", result.id)
        self.assertEqual(0, len(create_calls))


if __name__ == "__main__":
    unittest.main()
