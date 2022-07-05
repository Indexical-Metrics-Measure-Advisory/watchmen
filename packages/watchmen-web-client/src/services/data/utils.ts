import dayjs, {Dayjs} from 'dayjs';

export const isMockService = (): boolean => process.env.REACT_APP_SERVICE_MOCK_FLAG === 'true';
export const getServiceHost = (): string => {
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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
