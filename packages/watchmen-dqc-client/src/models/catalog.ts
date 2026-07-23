// Catalog models — mirror watchmen-model dqc/catalog.py.
// Source: packages/watchmen-model/src/watchmen_model/dqc/catalog.py
// Endpoints: GET/POST/DELETE /dqc/catalog, POST /dqc/catalog/criteria
// (packages/watchmen-rest-dqc/.../admin/catalog_router.py)

/** `Catalog` model (tenant-scoped tuple with optimistic lock). */
export interface Catalog {
	catalogId?: string;
	name?: string;
	topicIds?: string[];
	techOwnerId?: string;
	bizOwnerId?: string;
	tags?: string[];
	description?: string;
	tenantId?: string;
	version?: number;
}

/** `CatalogCriteria` model — search criteria for POST /dqc/catalog/criteria. */
export interface CatalogCriteria {
	name?: string;
	topicId?: string;
	techOwnerId?: string;
	bizOwnerId?: string;
}
