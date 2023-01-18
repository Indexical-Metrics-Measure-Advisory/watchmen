import {Router} from '@/routes/types';
import {Location} from 'history';
import {matchPath} from 'react-router-dom';

export const isSubjectDefNow = (location: Location) => {
	return !!matchPath(location.pathname, Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DEF);
};
export const isSubjectDataNow = (location: Location) => {
	return !!matchPath(location.pathname, Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DATA);
};
export const isSubjectReportNow = (location: Location) => {
	return !!matchPath(location.pathname, Router.CONSOLE_CONNECTED_SPACE_SUBJECT_REPORTS);
};
