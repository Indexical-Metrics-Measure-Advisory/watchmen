import { DataSource } from "../models";

export const getDataSourceHealthCounts = (sources: DataSource[]) => {
	return {
		total: sources.length,
		healthy: sources.filter(s => s.healthStatus === 'healthy').length,
		warning: sources.filter(s => s.healthStatus === 'warning').length,
		error: sources.filter(s => s.healthStatus === 'error').length,
	};
};

export const getDataSourceDomains = (sources: DataSource[]) => {
	return [...new Set(sources.map(s => s.domain).filter(Boolean))] as string[];
};