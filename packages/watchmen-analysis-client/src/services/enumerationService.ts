import type { Enumeration, EnumerationPage } from '@/model/enumeration';
import { WATCHMEN_API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

const BASE_URL = `${WATCHMEN_API_BASE_URL}/enum`;

export const listEnumerations = async (): Promise<Enumeration[]> => {
	const response = await fetch(`${BASE_URL}/name`, {
		method: 'POST',
		headers: getDefaultHeaders(),
		body: JSON.stringify({ pageNumber: 1, pageSize: 9999 })
	});
	const result = await checkResponse(response) as EnumerationPage;
	return result.data ?? [];
};

export const getEnumeration = async (enumId: string): Promise<Enumeration> => {
	const response = await fetch(`${BASE_URL}?enum_id=${encodeURIComponent(enumId)}`, {
		headers: getDefaultHeaders()
	});
	return checkResponse(response);
};
