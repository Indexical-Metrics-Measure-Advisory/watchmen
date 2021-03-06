import {ChartDataSet} from '../../tuples/chart-types';
import {ReportId} from '../../tuples/report-types';

export const fetchMockCountChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [[1234]]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockPieChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'hello'],
					[1324, 'world']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockDoughnutChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'hello'],
					[1324, 'world']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockNightingaleChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'hello'],
					[1324, 'world']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockBarChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 5678, 'hello'],
					[1324, 6587, 'world']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockLineChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 5678, 'hello'],
					[1324, 6587, 'world']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockScatterChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'hello', 'world'],
					[1324, 'goodbye', 'world'],
					[567, 'hello', 'hell'],
					[765, 'goodbye', 'hell']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockSunburstChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'h', 'hello'],
					[589, 'h', 'hell'],
					[198, 'w', 'why'],
					[1324, 'w', 'where'],
					[675, 'w', 'who']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockTreeChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[198, 'w', 'why'],
					[1324, 'w', 'where'],
					[675, 'w', 'who']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockTreemapChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[1234, 'h', 'hello'],
					[589, 'h', 'hell'],
					[198, 'w', 'why'],
					[1324, 'w', 'where'],
					[675, 'w', 'who']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockMapChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(() => resolve({
				meta: [],
				data: [
					[Math.random() * 1000, 'Aichi', '?????????'],
					[Math.random() * 1000, 'Akita', '?????????'],
					[Math.random() * 1000, 'Aomori', '?????????'],
					[Math.random() * 1000, 'Chiba', '?????????'],
					[Math.random() * 1000, 'Ehime', '?????????'],
					[Math.random() * 1000, 'Fukui', '?????????'],
					[Math.random() * 1000, 'Fukuoka', '?????????'],
					[Math.random() * 1000, 'Fukushima', '?????????'],
					[Math.random() * 1000, 'Gifu', '?????????'],
					[Math.random() * 1000, 'Gunma', '?????????'],
					[Math.random() * 1000, 'Hiroshima', '?????????'],
					[Math.random() * 1000, 'Hokkaido', '?????????'],
					[Math.random() * 1000, 'Hyogo', '?????????'],
					[Math.random() * 1000, 'Ibaraki', '?????????'],
					[Math.random() * 1000, 'Ishikawa', '?????????'],
					[Math.random() * 1000, 'Iwate', '?????????'],
					[Math.random() * 1000, 'Kagawa', '?????????'],
					[Math.random() * 1000, 'Kagoshima', '????????????'],
					[Math.random() * 1000, 'Kanagawa', '????????????'],
					[Math.random() * 1000, 'Kochi', '?????????'],
					[Math.random() * 1000, 'Kumamoto', '?????????'],
					[Math.random() * 1000, 'Kyoto', '?????????'],
					[Math.random() * 1000, 'Mie', '?????????'],
					[Math.random() * 1000, 'Miyagi', '?????????'],
					[Math.random() * 1000, 'Miyazaki', '?????????'],
					[Math.random() * 1000, 'Nagano', '?????????'],
					[Math.random() * 1000, 'Naoasaki', '?????????'],
					[Math.random() * 1000, 'Nara', '?????????'],
					[Math.random() * 1000, 'Niigata', '?????????'],
					[Math.random() * 1000, 'Oita', '?????????'],
					[Math.random() * 1000, 'Okayama', '?????????'],
					[Math.random() * 1000, 'Okinawa', '?????????'],
					[Math.random() * 1000, 'Osaka', '?????????'],
					[Math.random() * 1000, 'Saga', '?????????'],
					[Math.random() * 1000, 'Saitama', '?????????'],
					[Math.random() * 1000, 'Shiga', '?????????'],
					[Math.random() * 1000, 'Shimane', '?????????'],
					[Math.random() * 1000, 'Shizuoka', '?????????'],
					[Math.random() * 1000, 'Tochigi', '?????????'],
					[Math.random() * 1000, 'Tokushima', '?????????'],
					[Math.random() * 1000, 'Tokyo', '?????????'],
					[Math.random() * 1000, 'Tottori', '?????????'],
					[Math.random() * 1000, 'Toyama', '?????????'],
					[Math.random() * 1000, 'Wakayama', '????????????'],
					[Math.random() * 1000, 'Yamagata', '?????????'],
					[Math.random() * 1000, 'Yamaguchi', '?????????'],
					[Math.random() * 1000, 'Yamanashi', '?????????'],
					[Math.random() * 1000, 'HI', 'Hawaii'],
					[Math.random() * 1000, 'SW', 'South West Community Development Council'],
					[Math.random() * 1000, 'SE', 'South East Community Development Council'],
					[Math.random() * 1000, 'NW', 'North West Community Development Council'],
					[Math.random() * 1000, 'NE', 'North East Community Development Council'],
					[Math.random() * 1000, 'CS', 'Central Singapore Community Development Council'],
					[Math.random() * 1000, 'Paphos', 'Paphos']
				]
			} as ChartDataSet),
			500
		);
	});
};

export const fetchMockCustomizeChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(
			() =>
				resolve({
					meta: [],
					data: []
				} as ChartDataSet),
			500
		);
	});
};

export const fetchMockChartData = async (reportId: ReportId): Promise<ChartDataSet> => {
	return new Promise((resolve) => {
		setTimeout(
			() =>
				resolve({
					meta: [],
					data: []
				} as ChartDataSet),
			500
		);
	});
};