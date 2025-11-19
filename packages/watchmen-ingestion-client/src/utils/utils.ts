
export const getServiceHost = (): string => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return import.meta.env.VITE_API_BASE_URL!;
  } else if (import.meta.env.VITE_FORCE_SERVICE_URL === 'true') {
      return import.meta.env.VITE_API_BASE_URL!;
  } else {
      return `${window.location.protocol}//${window.location.host}/watchmen/`;
  }
};

export const getClientHost = (): string => {
  const webContext = import.meta.env.VITE_WEB_CONTEXT || '';
  if (webContext.endsWith('/')) {
      return `${window.location.protocol}//${window.location.host}${webContext.substring(0, webContext.length - 1)}`;
  } else if (webContext) {
      return `${window.location.protocol}//${window.location.host}${webContext}`;
  } else {
      return `${window.location.protocol}//${window.location.host}`;
  }
};

export const getWebContext = (): string => {
	const context = import.meta.env.VITE_WEB_CONTEXT || '';
	if (context == null || context.trim().length === 0) {
		return '';
	} else if (context.trim() === '/') {
		return '';
	} else if (context.trim().endsWith('/')) {
		return context.trim().substr(0, context.trim().length - 1);
	} else {
		return context.trim();
	}
};