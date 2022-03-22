from sdk.admin.admin_sdk import list_all_pipeline, load_pipeline_by_id, import_pipelines, load_users, import_users, \
    load_user_groups, import_user_groups, load_space_list, import_spaces, load_topic_list, import_topics
from sdk.constants import FILE
from sdk.utils.file_service import load_from_file, save_to_file


def list_pipeline(site):
    pipeline_list = list_all_pipeline(site)
    for pipeline in pipeline_list:
        print("pipeline name {} , pipeline {}".format(pipeline["name"], pipeline["pipelineId"]))


def sync_pipeline(source_site, target_site, ids):
    if source_site != FILE:
        pipeline_list = []
        for id in ids:
            pipeline_list.append(load_pipeline_by_id(source_site, id))
    else:
        pipeline_list: list = load_from_file(source_site, "pipeline")

    print("find {} pipeline".format(len(pipeline_list)))

    if target_site != FILE:
        import_pipelines(target_site, pipeline_list)
    else:
        save_to_file(target_site, pipeline_list, "pipeline")


def sync_user(source_site, target_site, names):
    if source_site != FILE:
        users: list = load_users(source_site, names)
    else:
        users: list = load_from_file(source_site, "users")
    print("find {} users".format(len(users)))
    if target_site != FILE:
        import_users(target_site, users)
    else:
        save_to_file(target_site, users, "users")


def sync_user_group(source_site, target_site, names):
    if source_site != FILE:
        groups: list = load_user_groups(source_site, names)
    else:
        groups: list = load_from_file(source_site, "user_groups")

    print("find {} groups".format(len(groups)))
    if target_site != FILE:
        import_user_groups(target_site, groups)
    else:
        save_to_file(target_site, groups, "user_groups")


def sync_space(source_site, target_site, names):
    if source_site != FILE:
        space_list: list = load_space_list(source_site, names)
    else:
        space_list: list = load_from_file(source_site, "space")

    print("find {} space".format(len(space_list)))
    if target_site != FILE:
        import_spaces(target_site, space_list)
    else:
        save_to_file(target_site, space_list, "space")


def sync_topic(source_site, target_site, names):
    if source_site != FILE:
        topic_list: list = load_topic_list(source_site, names)
    else:
        topic_list: list = load_from_file(source_site, "topic")
    print("find {} topic".format(len(topic_list)))
    if target_site != FILE:
        import_topics(target_site, topic_list)
    else:
        save_to_file(target_site, topic_list, "topic")


def __sync_connect_spaces(self, source_site, target_site, ids):
    pass


def __sync_dashboards(self, source_site, target_site, ids):
    pass


def __sync_subjects(self, source_site, target_site, ids):
    pass


def __sync_reports(self, source_site, target_site, ids):
    pass
