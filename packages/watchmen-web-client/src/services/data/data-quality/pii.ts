import {Apis, del, get, post} from '../apis';
import {findToken} from '../account';
import {
	confirmMockPiiTerm,
	deleteMockPiiTerm,
	discoverMockPiiTerm,
	fetchMockPiiLineage,
	fetchMockPiiReport,
	fetchMockPiiTerms,
	saveMockPiiTerm
} from '../mock/data-quality/mock-pii';
import {buildMockPiiReportCsv} from '../mock/data-quality/mock-pii';
import {doFetch, getServiceHost, isMockService} from '../utils';
import {
	PiiClassificationTerm,
	PiiDiscoverResult,
	PiiGlobalDashboard,
	PiiLineageReport,
	PiiMatchStrategy,
	PiiTermId
} from './pii-types';

export const fetchPiiTerms = async (): Promise<Array<PiiClassificationTerm>> => {
	if (isMockService()) {
		return await fetchMockPiiTerms();
	} else {
		return get({api: Apis.PII_TERM_LIST});
	}
};

export const savePiiTerm = async (term: PiiClassificationTerm): Promise<PiiClassificationTerm> => {
	if (isMockService()) {
		return await saveMockPiiTerm(term);
	} else {
		return post({api: Apis.PII_TERM_SAVE, data: term});
	}
};

export const deletePiiTerm = async (termId: PiiTermId): Promise<void> => {
	if (isMockService()) {
		return await deleteMockPiiTerm(termId);
	} else {
		return del({api: Apis.PII_TERM_DELETE, search: {termId}});
	}
};

export const discoverPiiTerm = async (options: {
	termId: PiiTermId;
	strategy?: PiiMatchStrategy | string;
}): Promise<PiiDiscoverResult> => {
	const {termId, strategy} = options;
	if (isMockService()) {
		return await discoverMockPiiTerm({termId, strategy});
	} else {
		return post({
			api: Apis.PII_TERM_DISCOVER,
			search: {termId},
			data: {strategy, score_threshold: 0.75}
		});
	}
};

export const confirmPiiTerm = async (options: {
	termId: PiiTermId;
	factorIds: Array<string>;
	removeFactorIds: Array<string>;
}): Promise<PiiClassificationTerm> => {
	const {termId, factorIds, removeFactorIds} = options;
	if (isMockService()) {
		return await confirmMockPiiTerm({termId, factorIds, removeFactorIds});
	} else {
		return post({
			api: Apis.PII_TERM_CONFIRM,
			search: {termId},
			data: {factorIds, removeFactorIds}
		});
	}
};

export const fetchPiiLineage = async (options: {
	termId: PiiTermId;
	maxDepth?: number;
}): Promise<PiiLineageReport> => {
	const {termId, maxDepth = 3} = options;
	if (isMockService()) {
		return await fetchMockPiiLineage({termId});
	} else {
		return post({
			api: Apis.PII_TERM_LINEAGE,
			search: {termId},
			data: {maxDepth, includeMetrics: true}
		});
	}
};

export const fetchPiiReport = async (): Promise<PiiGlobalDashboard> => {
	if (isMockService()) {
		return await fetchMockPiiReport();
	} else {
		return get({api: Apis.PII_REPORT});
	}
};

const downloadBlob = (blob: Blob, filename: string) => {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
};

export const exportPiiReport = async (format: 'csv' | 'xlsx'): Promise<void> => {
	if (isMockService()) {
		// mock mode exports csv content regardless of requested format
		const dashboard = await fetchMockPiiReport();
		const csv = buildMockPiiReportCsv(dashboard);
		downloadBlob(new Blob([csv], {type: 'text/csv;charset=utf-8'}), 'pii-report.csv');
	} else {
		const url = `${getServiceHost()}dqc/pii-report/export/${format}`;
		const response = await doFetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${findToken()}`
			}
		});
		const blob = await response.blob();
		downloadBlob(blob, `pii-report.${format}`);
	}
};
