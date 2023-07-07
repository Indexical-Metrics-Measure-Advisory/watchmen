import {Router} from '@/routes/types';
import {Location, matchPath} from 'react-router-dom';

export const isSubjectDefNow = (location: Location) => {
	return !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DEF}, location.pathname);
};
export const isSubjectDataNow = (location: Location) => {
	return !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DATA}, location.pathname);
};
export const isSubjectReportNow = (location: Location) => {
	return !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_REPORT}, location.pathname);
};
