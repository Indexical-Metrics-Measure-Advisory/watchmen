// PII classification service — feature-flagged (VITE_PII_ENABLED).
// Source router: packages/watchmen-pii-classification/src/watchmen_pii/router/pii_router.py,
// mounted by watchmen-rest-dqc only when PII_CLASSIFICATION_ENABLED is on.
import { API_BASE_URL, checkResponse, getDefaultHeaders, omitNil } from '@/utils/apiConfig';
import type {
	ConfirmRequest,
	DiscoverRequest,
	DiscoverResult,
	PIIClassificationTerm,
	PiiGlobalDashboard,
	PiiLineageReport,
} from '@/models/pii';

class PiiService {
	/** Corresponds to: GET /dqc/pii-terms */
	async listTerms(): Promise<PIIClassificationTerm[]> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms`, { method: 'GET', headers: getDefaultHeaders() });
		return checkResponse(res);
	}

	/** Corresponds to: GET /dqc/pii-terms/{termId} */
	async loadTerm(termId: string): Promise<PIIClassificationTerm> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms/${encodeURIComponent(termId)}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/pii-terms (create or update, decided by termId). */
	async saveTerm(term: PIIClassificationTerm): Promise<PIIClassificationTerm> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(omitNil(term as Record<string, any>)),
		});
		return checkResponse(res);
	}

	/** Corresponds to: DELETE /dqc/pii-terms/{termId} */
	async deleteTerm(termId: string): Promise<PIIClassificationTerm> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms/${encodeURIComponent(termId)}`, {
			method: 'DELETE',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/pii-terms/{termId}/discover */
	async discover(termId: string, body?: DiscoverRequest): Promise<DiscoverResult> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms/${encodeURIComponent(termId)}/discover`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(body ? omitNil(body as Record<string, any>) : {}),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/pii-terms/{termId}/confirm */
	async confirm(termId: string, body: ConfirmRequest): Promise<PIIClassificationTerm> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms/${encodeURIComponent(termId)}/confirm`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(body),
		});
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/pii-terms/{termId}/lineage */
	async analyzeLineage(termId: string, body?: { maxDepth?: number; includeMetrics?: boolean }): Promise<PiiLineageReport> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-terms/${encodeURIComponent(termId)}/lineage`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(body ?? {}),
		});
		return checkResponse(res);
	}

	/** Corresponds to: GET /dqc/pii-report */
	async getReport(): Promise<PiiGlobalDashboard> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-report`, { method: 'GET', headers: getDefaultHeaders() });
		return checkResponse(res);
	}

	/** Corresponds to: POST /dqc/pii-report/export/{csv|xlsx} (file download). */
	async exportReport(fmt: 'csv' | 'xlsx'): Promise<Blob> {
		const res = await fetch(`${API_BASE_URL}/dqc/pii-report/export/${fmt}`, {
			method: 'POST',
			headers: getDefaultHeaders(),
		});
		if (!res.ok) {
			throw new Error(`Export failed: ${res.status}`);
		}
		return res.blob();
	}
}

export const piiService = new PiiService();
export default piiService;
