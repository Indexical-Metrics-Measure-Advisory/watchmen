def build_headers(token):
	headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
	return headers


def build_pat_headers(site):
	headers = {'Content-Type': 'application/json', 'Authorization': f'pat {site.get("pat")}'}
	return headers
