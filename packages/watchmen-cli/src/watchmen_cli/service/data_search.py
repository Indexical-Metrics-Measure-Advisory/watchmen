from typing import List

from watchmen_cli.admin import search_spaces, search_topics, search_user_groups, search_users


def search_user(site, name):
	users = search_users(site, name)
	for user in users:
		print(f'User[id={user.get("userId")}, name={user.get("name")}].')


def search_topic(site, name):
	results: List = search_topics(site, name)
	for result in results:
		print(f'Topic[id={result.get("topicId")}, name={result.get("name")}].')
	return results


def search_space(site, name):
	results: List = search_spaces(site, name)
	for result in results:
		print(f'Space[id={result.get("spaceId")}, name={result.get("name")}].')
	return results


def search_user_group(site, name):
	user_groups = search_user_groups(site, name)
	for group in user_groups:
		print(f'User group[id={group.get("userGroupId")}, name={group.get("name")}].')


# noinspection PyUnusedLocal
def search_report(site, name):
	pass


# noinspection PyUnusedLocal
def search_connect_space(site, name):
	pass


# noinspection PyUnusedLocal
def search_subject(site, name):
	pass
