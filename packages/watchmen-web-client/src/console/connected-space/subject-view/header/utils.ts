import {Router} from '@/routes/types';
import {matchPath} from 'react-router-dom';

export const isSubjectDefNow = () => !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DEF}, window.location.pathname);
export const isSubjectDataNow = () => !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DATA}, window.location.pathname);
export const isSubjectReportNow = () => !!matchPath({path: Router.CONSOLE_CONNECTED_SPACE_SUBJECT_REPORT}, window.location.pathname);
