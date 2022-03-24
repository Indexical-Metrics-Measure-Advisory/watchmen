from watchmen_cli.admin import import_pipelines, import_spaces, import_topics, import_user_groups, import_users, \
	list_all_pipeline, load_pipeline_by_id, load_space_list, load_topic_list, load_user_groups, load_users
from watchmen_cli.constants import FILE
from watchmen_cli.utils import load_from_file, save_to_file


def list_pipeline(site):
	pipeline_list = list_all_pipeline(site)
	for pipeline in pipeline_list:
		print(f'Pipeline[id={pipeline.get("pipelineId")}, name={pipeline.get("name")}].')


def sync_pipeline(source_site, target_site, ids):
	if source_site != FILE:
		pipeline_list = []
		for pipeline_id in ids:
			pipeline_list.append(load_pipeline_by_id(source_site, pipeline_id))
	else:
		pipeline_list: list = load_from_file(source_site, 'pipeline')

	print("find {} pipeline".format(len(pipeline_list)))

	if target_site != FILE:
		import_pipelines(target_site, pipeline_list)
	else:
		save_to_file(target_site, pipeline_list, 'pipeline')


def sync_user(source_site, target_site, names):
	if source_site != FILE:
		users: list = load_users(source_site, names)
	else:
		users: list = load_from_file(source_site, 'users')
	print(f'Found {len(users)} users.')
	if target_site != FILE:
		import_users(target_site, users)
	else:
		save_to_file(target_site, users, 'users')


def sync_user_group(source_site, target_site, names):
	if source_site != FILE:
		groups: list = load_user_groups(source_site, names)
	else:
		groups: list = load_from_file(source_site, 'user_groups')

	print(f'Found {len(groups)} user groups.')
	if target_site != FILE:
		import_user_groups(target_site, groups)
	else:
		save_to_file(target_site, groups, 'user_groups')


def sync_space(source_site, target_site, names):
	if source_site != FILE:
		space_list: list = load_space_list(source_site, names)
	else:
		space_list: list = load_from_file(source_site, 'space')

	print(f'Found {len(space_list)} spaces.')
	if target_site != FILE:
		import_spaces(target_site, space_list)
	else:
		save_to_file(target_site, space_list, 'space')


def sync_topic(source_site, target_site, names):
	if source_site != FILE:
		topic_list: list = load_topic_list(source_site, names)
	else:
		topic_list: list = load_from_file(source_site, 'topic')
	print(f'Found {len(topic_list)} topics.')
	if target_site != FILE:
		import_topics(target_site, topic_list)
	else:
		save_to_file(target_site, topic_list, 'topic')


# noinspection PyUnusedLocal
def __sync_connect_spaces(source_site, target_site, ids):
	pass


# noinspection PyUnusedLocal
def __sync_dashboards(source_site, target_site, ids):
	pass


# noinspection PyUnusedLocal
def __sync_subjects(source_site, target_site, ids):
	pass


# noinspection PyUnusedLocal
def __sync_reports(source_site, target_site, ids):
	pass
