export const isDataQualityCenterEnabled = () => process.env.REACT_APP_DQC_ENABLED === 'true';
export const isSynonymDQCEnabled = () => isDataQualityCenterEnabled() && process.env.REACT_APP_SYNONYM_DQC_ENABLED === 'true';
export const isPipelinesDownloadEnabled = () => process.env.REACT_APP_PIPELINES_DOWNLOAD === 'true';
export const isMultipleDataSourcesEnabled = () => process.env.REACT_APP_MULTIPLE_DATA_SOURCES === 'true';
export const isReportFilterEnabled = () => process.env.REACT_APP_REPORT_FILTER === 'true';
export const isReportFunnelEnabled = () => process.env.REACT_APP_REPORT_FUNNEL === 'true';
export const isSpaceFilterEnabled = () => process.env.REACT_APP_SPACE_FILTER === 'true';
export const isWriteExternalEnabled = () => process.env.REACT_APP_EXTERNAL_WRITER_ADAPTERS === 'true';
export const isChartScriptInConsoleEnabled = () => process.env.REACT_APP_CHART_SCRIPT_IN_CONSOLE === 'true';
export const isSaml2MockEnabled = () => process.env.REACT_APP_MOCK_SAML2 === 'true';
const asNumber = (value: string | undefined, defaultValue: number): number => {
	try {
		const v = parseInt(value ?? '');
		if (isNaN(v)) {
			return defaultValue;
		} else {
			return v;
		}
	} catch {
		return defaultValue;
	}
};
export const getMaxSubjectDataRows = () => asNumber(process.env.REACT_APP_MAX_SUBJECT_DATA_ROWS, 50000);
export const getSubjectDataPageSize = () => asNumber(process.env.REACT_APP_SUBJECT_DATA_PAGE_SIZE, 100);
export const getMaxMonitorLogDataRows = () => asNumber(process.env.REACT_APP_MAX_MONITOR_LOGS_DATASET_ROWS, 10000);
export const getHelpButtonVisibleDelay = () => asNumber(process.env.REACT_APP_HELP_BUTTON_VISIBLE_DELAY, 30000);
export const getHelpButtonTimeout = () => asNumber(process.env.REACT_APP_HELP_BUTTON_TIMEOUT, 10000);