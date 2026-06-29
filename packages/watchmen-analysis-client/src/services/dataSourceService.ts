import { WATCHMEN_API_BASE_URL, getDefaultHeaders, checkResponse } from "@/utils/apiConfig";

/** 简化后的 DataSource 类型，仅暴露前端需要的字段。 */
export interface DataSource {
	dataSourceId: string;
	name: string;
	dataSourceCode?: string;
	type?: string;
	tenantId?: string;
}

/** 获取全部数据源（watchmen ingest 服务 /datasource/all）。 */
export const getAllDataSources = async (): Promise<DataSource[]> => {
	const response = await fetch(`${WATCHMEN_API_BASE_URL}/datasource/all`, {
		method: "GET",
		headers: getDefaultHeaders(),
	});
	const list = (await checkResponse(response)) as DataSource[];
	return (list ?? []).filter((d): d is DataSource => Boolean(d?.dataSourceId));
};
