import unittest

from watchmen_auth import fake_tenant_admin
from watchmen_task_hub.model import DependencyAdoptionStatus, DependencyKind, EngineRef, ExecutionMode, RefRole, RefType, \
	TaskDefinition, TaskDependency, TaskResourceRef, TaskType
from watchmen_task_hub.service import TaskConflictException, TaskDependencyOrchestrationService

from .memory import DependencyRepository, RefRepository, TaskRepository


class TaskDependencyServiceTest(unittest.TestCase):
	def setUp(self):
		self.principal = fake_tenant_admin('tenant-1')
		self.tasks = TaskRepository()
		self.refs = RefRepository()
		self.dependencies = DependencyRepository()
		for task_id, task_type in (('collect', TaskType.COLLECTOR_ONLINE), ('metric', TaskType.MATERIALIZATION),
			('dqc', TaskType.DQC_JOB)):
			self.tasks.create(TaskDefinition(
				taskId=task_id, name=task_id, taskType=task_type, executionMode=ExecutionMode.SCHEDULED,
				engineRef=EngineRef(kind='engine', id=task_id), tenantId='tenant-1'))
		self.service = TaskDependencyOrchestrationService(self.dependencies, self.tasks, self.refs, self.principal)

	def test_rejects_cycles(self):
		self.service.create(TaskDependency(upstreamTaskId='collect', downstreamTaskId='metric'))
		self.service.create(TaskDependency(upstreamTaskId='metric', downstreamTaskId='dqc'))
		with self.assertRaises(TaskConflictException):
			self.service.create(TaskDependency(upstreamTaskId='dqc', downstreamTaskId='collect'))

	def test_infers_only_matching_source_and_target_assets(self):
		self.refs.create(TaskResourceRef(
			taskId='collect', refType=RefType.TOPIC, targetId='topic-1', role=RefRole.TARGET, tenantId='tenant-1'))
		self.refs.create(TaskResourceRef(
			taskId='metric', refType=RefType.TOPIC, targetId='topic-1', role=RefRole.SOURCE, tenantId='tenant-1'))
		self.refs.create(TaskResourceRef(
			taskId='dqc', refType=RefType.TOPIC, targetId='topic-2', role=RefRole.SOURCE, tenantId='tenant-1'))
		preview = self.service.preview_inferred()
		self.assertEqual(1, len(preview))
		self.assertEqual(DependencyAdoptionStatus.PROPOSED, preview[0].adoptionStatus)
		self.assertFalse(preview[0].enabled)

	def test_rejected_edge_is_remembered_and_lost_edge_does_not_revive(self):
		self.refs.create(TaskResourceRef(
			taskId='collect', refType=RefType.TOPIC, targetId='topic-1', role=RefRole.TARGET, tenantId='tenant-1'))
		metric_ref = self.refs.create(TaskResourceRef(
			taskId='metric', refType=RefType.TOPIC, targetId='topic-1', role=RefRole.SOURCE, tenantId='tenant-1'))
		self.service.synchronize_inferred()
		dependency = self.dependencies.items[0]
		self.service.reject(dependency.dependencyId)
		self.service.synchronize_inferred()
		self.assertEqual(1, len(self.dependencies.items))
		self.assertEqual(DependencyAdoptionStatus.REJECTED, dependency.adoptionStatus)
		self.service.adopt(dependency.dependencyId)
		self.refs.delete(metric_ref.refId)
		self.service.synchronize_inferred()
		self.assertFalse(dependency.enabled)
		self.refs.create(metric_ref)
		self.service.synchronize_inferred()
		self.assertFalse(dependency.enabled)

	def test_explicit_edge_upgrades_inferred_edge(self):
		dependency = TaskDependency(
			dependencyId='dep-1', upstreamTaskId='collect', downstreamTaskId='metric',
			kind=DependencyKind.INFERRED_DATA, adoptionStatus=DependencyAdoptionStatus.PROPOSED,
			enabled=False, tenantId='tenant-1')
		self.dependencies.create(dependency)
		updated = self.service.create(TaskDependency(upstreamTaskId='collect', downstreamTaskId='metric'))
		self.assertEqual(DependencyKind.EXPLICIT, updated.kind)
		self.assertEqual(DependencyAdoptionStatus.ACCEPTED, updated.adoptionStatus)
		self.assertEqual(1, len(self.dependencies.items))


if __name__ == '__main__':
	unittest.main()
