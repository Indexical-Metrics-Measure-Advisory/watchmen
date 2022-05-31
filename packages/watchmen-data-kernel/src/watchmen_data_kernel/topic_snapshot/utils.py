from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicSnapshotScheduler
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
		topic_snapshot_jobs.put_job(scheduler_id, scheduler.version, job)


def create_target_topic(scheduler: TopicSnapshotScheduler, source_topic: Topic) -> Topic:
	return Topic(
		topicId='f-1',
		name=scheduler.targetTopicName,
		type=source_topic.type,
		kind=source_topic.kind,
		dataSourceId=source_topic.dataSourceId,
		factors=[
			*ArrayHelper(source_topic.factors).map_with_index(lambda f, index: redress_factor_id).to_list(),
			Factor(
				factorId=f'ss-{len(source_topic.factors) + 1}',
				type=FactorType.TEXT,
				name='snapshotTag',
				label='Snapshot Tag',
				description='Snapshot Tag',
				indexGroup=FactorIndexGroup.INDEX_1,
				precision="10"
			)
		],
		description=f'Snapshot of [${source_topic.name}]',
		tenanId=source_topic.tenantId,
		version=1
	)


def redress_factor_id(factor: Factor, index: int) -> Factor:
	# remove index
	factor.indexGroup = None
	factor.factorId = f'ss-{index + 1}'
	return factor


def rebuild_target_topic(target_topic: Topic, source_topic: Topic) -> Topic:
	target_topic.factors = [
		*ArrayHelper(source_topic.factors).map_with_index(lambda f, index: redress_factor_id).to_list(),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 1}',
			type=FactorType.TEXT,
			name='snapshotTag',
			label='Snapshot Tag',
			description='Snapshot Tag',
			indexGroup=FactorIndexGroup.INDEX_1,
			precision="10"
		)
	]
	return target_topic
