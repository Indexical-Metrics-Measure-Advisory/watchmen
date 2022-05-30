from datetime import date

from watchmen_model.admin import TopicSnapshotSchedulerId


def run_job(scheduler_id: TopicSnapshotSchedulerId, process_date: date) -> None:
	# tenants = find_all_tenants()
	# for tenant in tenants:
	# 	topics = find_all_topics(tenant.tenantId)
	# 	for topic in topics:
	# 		principal_service = fake_tenant_admin(tenant.tenantId)
	# 		if try_to_lock_topic_for_monitor(topic, frequency, process_date, principal_service):
	# 			MonitorRulesRunner(principal_service).run(process_date, frequency, topic.topicId)
	# TODO run topic snapshot job
	pass
