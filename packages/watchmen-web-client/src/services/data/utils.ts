import dayjs, {Dayjs} from 'dayjs';

export const isMockService = (): boolean => process.env.REACT_APP_SERVICE_MOCK_FLAG === 'true';
const DECLARED_REQUEST_HEADERS: Record<string, string> = (() => {
	try {
		return JSON.parse(process.env.REACT_APP_REQUEST_HEADER || '{}');
	} catch {
		return {};
	}
})();
// console.log(DECLARED_REQUEST_HEADERS);
export const getServiceHost = (): string => {
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		return process.env.REACT_APP_SERVICE_URL!;
	} else if (process.env.REACT_APP_FORCE_SERVICE_URL === 'true') {
		return process.env.REACT_APP_SERVICE_URL!;
	} else {
		return window.location.protocol + '//' + window.location.host + '/watchmen/';
	}
};
export const getClientHost = (): string => {
	if ((process.env.REACT_APP_WEB_CONTEXT || '').endsWith('/')) {
		return window.location.protocol + '//' + window.location.host + process.env.REACT_APP_WEB_CONTEXT!.substr(0, process.env.REACT_APP_WEB_CONTEXT!.length - 1);
	} else if (process.env.REACT_APP_WEB_CONTEXT) {
		return window.location.protocol + '//' + window.location.host + process.env.REACT_APP_WEB_CONTEXT;
	} else {
		return window.location.protocol + '//' + window.location.host;
	}
};

export const isNotNull = <T>(x: T | null | undefined): x is T => !!x;
export const formatTime = (time: Dayjs) => time.format('YYYY-MM-DD HH:mm:ss');
export const getCurrentTime = () => dayjs().format('YYYY-MM-DD HH:mm:ss');

export const doFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
	if (Object.keys(DECLARED_REQUEST_HEADERS).length !== 0) {
		if (init == null) {
			init = {};
		}
		if (init.headers == null) {
			init.headers = {};
		}
		Object.keys(DECLARED_REQUEST_HEADERS).forEach(key => {
			// @ts-ignore
			init!.headers![key] = DECLARED_REQUEST_HEADERS[key];
		});
	}

	const response = await fetch(input, init);

	const {ok, status, statusText} = response;

	if (ok) {
		return response;
	} else {
		// eslint-disable-next-line
		throw {
			status,
			statusText,
			response
		};
	}
};
