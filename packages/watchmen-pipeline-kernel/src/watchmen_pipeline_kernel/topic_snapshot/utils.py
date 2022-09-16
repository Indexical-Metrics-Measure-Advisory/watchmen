from typing import List

from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import AggregateArithmetic, Factor, FactorIndexGroup, FactorType, InsertRowAction, \
	MappingFactor, Pipeline, PipelineStage, PipelineTriggerType, PipelineUnit, Topic, TopicKind, \
	TopicSnapshotScheduler, TopicType, WriteTopicActionType
from watchmen_model.common import ConstantParameter, ParameterExpression, ParameterExpressionOperator, ParameterJoint, \
	ParameterJointType, ParameterKind
from watchmen_utilities import ArrayHelper
from .scheduler_launcher import create_job
from .scheduler_registrar import topic_snapshot_jobs


def register_topic_snapshot_job(scheduler: TopicSnapshotScheduler) -> None:
	scheduler_id = scheduler.schedulerId
	topic_snapshot_jobs.remove_job(scheduler_id)
	if not scheduler.enabled:
		return

	job = create_job(topic_snapshot_jobs.get_scheduler(), scheduler, ask_snowflake_generator())
	if job is not None:
		topic_snapshot_jobs.put_job(scheduler_id, scheduler.version, job[1])


def redress_factor_id(factor: Factor, index: int) -> Factor:
	# remove index
	factor.indexGroup = None
	factor.factorId = f'ss-{index + 1}'
	return factor


def build_target_topic_factors(source_topic: Topic) -> List[Factor]:
	return [
		*ArrayHelper(source_topic.factors).map_with_index(redress_factor_id).to_list(),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 1}',
			type=FactorType.TEXT,
			name='snapshottag',
			label='Snapshot Tag',
			indexGroup=FactorIndexGroup.INDEX_1,
			precision='10'
		)
	]


def create_snapshot_target_topic(scheduler: TopicSnapshotScheduler, source_topic: Topic) -> Topic:
	return Topic(
		topicId='f-1',
		name=scheduler.targetTopicName,
		type=source_topic.type,
		kind=source_topic.kind,
		dataSourceId=source_topic.dataSourceId if source_topic.kind != TopicKind.SYNONYM else None,
		factors=build_target_topic_factors(source_topic),
		description=f'Snapshot of [{source_topic.name}], never change me manually.',
		tenantId=source_topic.tenantId,
		version=1
	)


def rebuild_snapshot_target_topic(target_topic: Topic, source_topic: Topic) -> Topic:
	target_topic.factors = build_target_topic_factors(source_topic)
	return target_topic


def as_snapshot_task_topic_name(source_topic: Topic) -> str:
	return f'ss_{source_topic.name}'


def build_task_topic_factors(source_topic: Topic) -> List[Factor]:
	return [
		Factor(
			factorId=f'ss-0',
			type=FactorType.TEXT,
			name='originaldataid',
			flatten=True,
			label='Original Data Id',
			precision='50'
		),
		*ArrayHelper(source_topic.factors).map_with_index(redress_factor_id).to_list(),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 1}',
			type=FactorType.TEXT,
			name='status',
			label='Status of task',
			flatten=True,
			indexGroup=FactorIndexGroup.INDEX_1,
			precision='20'
		),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 2}',
			type=FactorType.TEXT,
			name='snapshottag',
			label='Snapshot Tag',
			flatten=True,
			indexGroup=FactorIndexGroup.INDEX_2,
			precision='10'
		),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 3}',
			type=FactorType.TEXT,
			name='targettopicname',
			label='Target topic name',
			flatten=True,
			indexGroup=FactorIndexGroup.INDEX_3,
			precision='50'
		),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 4}',
			type=FactorType.TEXT,
			name='jobid',
			label='Job Id',
			flatten=True,
			indexGroup=FactorIndexGroup.INDEX_4,
			precision='50'
		),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 5}',
			type=FactorType.TEXT,
			name='schedulerid',
			label='Job Scheduler Id',
			flatten=True,
			indexGroup=FactorIndexGroup.INDEX_5,
			precision='50'
		)
	]


def create_snapshot_task_topic(source_topic: Topic) -> Topic:
	return Topic(
		topicId='f-1',
		name=as_snapshot_task_topic_name(source_topic),
		type=TopicType.RAW,
		kind=source_topic.kind,
		dataSourceId=source_topic.dataSourceId if source_topic.kind != TopicKind.SYNONYM else None,
		factors=build_task_topic_factors(source_topic),
		description=f'Snapshot task of [{source_topic.name}], never change me manually.',
		tenantId=source_topic.tenantId,
		version=1
	)


def rebuild_snapshot_task_topic(task_topic: Topic, source_topic: Topic) -> Topic:
	task_topic.factors = build_task_topic_factors(source_topic)
	return task_topic


def to_mapping_factor(target_factor: Factor) -> MappingFactor:
	return MappingFactor(
		source=ConstantParameter(kind=ParameterKind.CONSTANT, value=f'{{{target_factor.name}}}'),
		arithmetic=AggregateArithmetic.NONE,
		factorId=target_factor.factorId
	)


def create_snapshot_pipeline(task_topic: Topic, target_topic: Topic) -> Pipeline:
	return Pipeline(
		pipelineId='f-1',
		topicId=task_topic.topicId,
		name='Snapshot catcher, never change me manually',
		type=PipelineTriggerType.INSERT_OR_MERGE,
		conditional=True,
		on=build_pipeline_prerequisite(target_topic),
		stages=build_pipeline_stages(target_topic),
		enabled=True,
		validated=True,
		tenantId=task_topic.tenantId,
		version=1
	)


def rebuild_snapshot_pipeline(pipeline: Pipeline, task_topic: Topic, target_topic: Topic) -> Pipeline:
	pipeline.topicId = task_topic.topicId
	pipeline.name = 'Snapshot catcher, never change me manually'
	pipeline.type = PipelineTriggerType.INSERT_OR_MERGE
	pipeline.conditional = True
	pipeline.on = build_pipeline_prerequisite(target_topic)
	pipeline.stages = build_pipeline_stages(target_topic)
	pipeline.enabled = True
	pipeline.validated = True
	return pipeline


def build_pipeline_stages(target_topic: Topic) -> List[PipelineStage]:
	return [PipelineStage(
		stageId='ss-s-1',
		name='Copy data to target topic',
		units=[PipelineUnit(
			unitId='ss-u-1',
			name='Copy data to target topic',
			do=[InsertRowAction(
				actionId='ss-a-1',
				type=WriteTopicActionType.INSERT_ROW,
				topicId=target_topic.topicId,
				mapping=ArrayHelper(target_topic.factors).map(lambda f: to_mapping_factor(f)).to_list()
			)]
		)]
	)]


def build_pipeline_prerequisite(target_topic: Topic) -> ParameterJoint:
	return ParameterJoint(
		jointType=ParameterJointType.AND,
		filters=[ParameterExpression(
			left=ConstantParameter(kind=ParameterKind.CONSTANT, value=f'{{targettopicname}}'),
			operator=ParameterExpressionOperator.EQUALS,
			right=ConstantParameter(kind=ParameterKind.CONSTANT, value=f'{target_topic.name}'),
		)]
	)
