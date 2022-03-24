from requests import get


# def import_instances(instances):
# 	headers = build_headers(login())
# 	for instance in instances:
# 		response = post('http://localhost:8000/topic/data', data=dumps(instance), headers=headers)
# 		print(response.status_code)
#
#
# def remove_topic_collection(collections):
# 	headers = build_headers(login())
# 	response = post('http://localhost:8000/topic/data/remove', data=dumps(collections), headers=headers)
# 	print(response.status_code)


def test_url(url):
	response = get(url)
	return response
