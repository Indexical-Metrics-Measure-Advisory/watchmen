// Data health (pipeline error monitor) service.
// Source router: packages/watchmen-rest-dqc/.../data_health/data_health_router.py
// (GET /dqc/error/monitor?start_date=&end_date=).
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import type { MonitorResult } from '@/models/monitorResult';

class DataHealthService {
	/** Corresponds to: GET /dqc/error/monitor?start_date=&end_date= */
	async runMonitor(startDate?: string, endDate?: string): Promise<MonitorResult> {
		const qs = new URLSearchParams();
		if (startDate) qs.set('start_date', startDate);
		if (endDate) qs.set('end_date', endDate);
		const res = await fetch(`${API_BASE_URL}/dqc/error/monitor?${qs.toString()}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}
}

export const dataHealthService = new DataHealthService();
export default dataHealthService;
