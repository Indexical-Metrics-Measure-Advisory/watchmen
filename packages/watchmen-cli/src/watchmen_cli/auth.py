from requests import post


def login(site):
	login_data = {'username': site.get('username'), 'password': site.get('password')}
	headers = {'Content-Type': 'application/x-www-form-urlencoded'}
	response = post(f'{site.get("host")}login/access-token', data=login_data, headers=headers)
	auth_token = response.json().get('access_token')
	return auth_token
