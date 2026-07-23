// Catalog service.
// Source router: packages/watchmen-rest-dqc/.../admin/catalog_router.py
// (GET/POST/DELETE /dqc/catalog, POST /dqc/catalog/criteria).
import { API_BASE_URL, checkResponse, getDefaultHeaders, omitNil } from '@/utils/apiConfig';
import type { Catalog, CatalogCriteria } from '@/models/catalog';

class CatalogService {
	/** Corresponds to: GET /dqc/catalog?catalog_id= */
	async loadCatalog(catalogId: string): Promise<Catalog> {
		const res = await fetch(`${API_BASE_URL}/dqc/catalog?catalog_id=${encodeURIComponent(catalogId)}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/catalog (create or update, decided by catalogId). */
	async saveCatalog(catalog: Catalog): Promise<Catalog> {
		const res = await fetch(`${API_BASE_URL}/dqc/catalog`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(omitNil(catalog as Record<string, any>)),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/catalog/criteria */
	async findByCriteria(criteria: CatalogCriteria): Promise<Catalog[]> {
		const res = await fetch(`${API_BASE_URL}/dqc/catalog/criteria`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(omitNil(criteria as Record<string, any>)),
		});
		return checkResponse(res);
	}

	/** Corresponds to: DELETE /dqc/catalog?catalog_id= */
	async deleteCatalog(catalogId: string): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/dqc/catalog?catalog_id=${encodeURIComponent(catalogId)}`, {
			method: 'DELETE',
			headers: getDefaultHeaders(),
		});
		await checkResponse(res);
	}
}

export const catalogService = new CatalogService();
export default catalogService;
