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
export const isPluginEnabled = () => process.env.REACT_APP_PLUGIN === 'true'