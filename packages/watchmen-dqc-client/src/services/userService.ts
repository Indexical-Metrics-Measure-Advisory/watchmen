// User service — owner pickers for the catalog editor.
//
// NOTE: like topics, users are served by the doll admin user router
// (packages/watchmen-rest-doll/.../admin/user_router.py) on the auth service
// host; watchmen-rest-dqc has no user endpoint.
import { checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import { getAuthServiceHost } from '@/utils/utils';
import type { User } from '@/models/user';

const baseUrl = () => getAuthServiceHost();

class UserService {
	/** GET /user/list/name?query_name= — typeahead user list (doll admin user_router). */
	async listUsersByName(queryName?: string): Promise<User[]> {
		const qs = new URLSearchParams();
		if (queryName) qs.set('query_name', queryName);
		const res = await fetch(`${baseUrl()}/user/list/name?${qs.toString()}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}
}

export const userService = new UserService();
export default userService;
