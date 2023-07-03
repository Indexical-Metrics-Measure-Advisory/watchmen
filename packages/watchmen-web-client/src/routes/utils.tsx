import {ConnectedSpaceId} from '@/services/data/tuples/connected-space-types';
import {DashboardId} from '@/services/data/tuples/dashboard-types';
import {DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {PipelineId} from '@/services/data/tuples/pipeline-types';
import {ReportId} from '@/services/data/tuples/report-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {ReactNode} from 'react';
import {Location, matchPath, Navigate, Route} from 'react-router-dom';
import {Router} from './types';

export const isConnectedSpaceOpened = (connectedSpaceId: ConnectedSpaceId, location: Location): boolean => {
	const match = matchPath<'connectId', string>({path: Router.CONSOLE_CONNECTED_SPACE}, location.pathname);
	// eslint-disable-next-line
	return !!match && match.params.connectId == connectedSpaceId;
};
export const toConnectedSpace = (connectedSpaceId: ConnectedSpaceId) => {
	return Router.CONSOLE_CONNECTED_SPACE.replace(':connectId', connectedSpaceId);
};
export const toConnectedSpaceCatalog = (connectedSpaceId: ConnectedSpaceId) => {
	return Router.CONSOLE_CONNECTED_SPACE_CATALOG.replace(':connectId', connectedSpaceId);
};
export const toSubject = (connectedSpaceId: ConnectedSpaceId, subjectId: SubjectId) => {
	return Router.CONSOLE_CONNECTED_SPACE_SUBJECT
		.replace(':connectId', connectedSpaceId)
		.replace(':subjectId', subjectId);
};
export const toSubjectDef = (connectedSpaceId: ConnectedSpaceId, subjectId: SubjectId) => {
	return Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DEF
		.replace(':connectId', connectedSpaceId)
		.replace(':subjectId', subjectId);
};
export const toSubjectData = (connectedSpaceId: ConnectedSpaceId, subjectId: SubjectId) => {
	return Router.CONSOLE_CONNECTED_SPACE_SUBJECT_DATA
		.replace(':connectId', connectedSpaceId)
		.replace(':subjectId', subjectId);
};
export const toSubjectReports = (connectedSpaceId: ConnectedSpaceId, subjectId: SubjectId) => {
	return Router.CONSOLE_CONNECTED_SPACE_SUBJECT_REPORT
		.replace(':connectId', connectedSpaceId)
		.replace(':subjectId', subjectId);
};
export const toSubjectReport = (connectedSpaceId: ConnectedSpaceId, subjectId: SubjectId, reportId: ReportId) => {
	return Router.CONSOLE_CONNECTED_SPACE_SUBJECT_REPORT_EDIT
		.replace(':connectId', connectedSpaceId)
		.replace(':subjectId', subjectId)
		.replace(':reportId', reportId);
};
export const isDashboardOpened = (dashboardId: DashboardId, location: Location): boolean => {
	const match = matchPath<'dashboardId', string>({path: Router.CONSOLE_DASHBOARD_EDIT}, location.pathname);
	// eslint-disable-next-line
	return !!match && match.params.dashboardId == dashboardId;
};
export const toDashboard = (dashboardId: DashboardId) => Router.CONSOLE_DASHBOARD_EDIT.replace(':dashboardId', dashboardId);
export const isDerivedObjectiveOpened = (derivedObjectiveId: DerivedObjectiveId, location: Location): boolean => {
	const match = matchPath<'objectiveId', string>({path: Router.CONSOLE_DERIVED_OBJECTIVE}, location.pathname);
	// eslint-disable-next-line
	return !!match && match.params.objectiveId == derivedObjectiveId;
};
export const toDerivedObjective = (derivedObjectiveId: DerivedObjectiveId) => {
	return Router.CONSOLE_DERIVED_OBJECTIVE.replace(':derivedObjectiveId', derivedObjectiveId);
};

export const toPipeline = (pipelineId: PipelineId) => Router.ADMIN_PIPELINE.replace(':pipelineId', pipelineId);

export const relativeTo = (path: Router, parent: Router): string => {
	return path.substring(parent.length);
};
export const relativeToAdmin = (path: Router): string => relativeTo(path, Router.ADMIN);
export const relativeToAdminPipeline = (path: Router): string => relativeTo(path, Router.ADMIN_PIPELINES);
export const relativeToAdminToolbox = (path: Router): string => relativeTo(path, Router.ADMIN_TOOLBOX);
export const relativeToConsole = (path: Router): string => relativeTo(path, Router.CONSOLE);
export const relativeToConsoleDashboard = (path: Router): string => relativeTo(path, Router.CONSOLE_DASHBOARD);
export const relativeToConnectedSpace = (path: Router): string => relativeTo(path, Router.CONSOLE_CONNECTED_SPACE);
export const relativeToSubject = (path: Router): string => relativeTo(path, Router.CONSOLE_CONNECTED_SPACE_SUBJECT);
export const relativeToDQC = (path: Router): string => relativeTo(path, Router.DQC);
export const relativeToIDW = (path: Router): string => relativeTo(path, Router.IDW);
export const relativeToIDWIndicator = (path: Router): string => relativeTo(path, Router.IDW_INDICATOR);
export const relativeToIDWObjective = (path: Router): string => relativeTo(path, Router.IDW_OBJECTIVE);
export const relativeToIDWConvergence = (path: Router): string => relativeTo(path, Router.IDW_CONVERGENCE);
export const relativeToShare = (path: Router): string => relativeTo(path, Router.SHARE);

export const asTopRoute = (path: Router, children: ReactNode) => <Route path={path} element={children}/>;
const asRoute = (relative: (path: Router) => string) => {
	return (path: Router, children: ReactNode) => {
		return <Route path={relative(path)} element={children}/>;
	};
};
export const asAdminRoute = (path: Router, children: ReactNode) => asRoute(relativeToAdmin)(path, children);
export const asAdminPipelineRoute = (path: Router, children: ReactNode) => asRoute(relativeToAdminPipeline)(path, children);
export const asAdminToolboxRoute = (path: Router, children: ReactNode) => asRoute(relativeToAdminToolbox)(path, children);
export const asConsoleRoute = (path: Router, children: ReactNode) => asRoute(relativeToConsole)(path, children);
export const asConsoleDashboardRoute = (path: Router, children: ReactNode) => asRoute(relativeToConsoleDashboard)(path, children);
export const asConnectedSpaceRoute = (path: Router, children: ReactNode) => asRoute(relativeToConnectedSpace)(path, children);
export const asSubjectRoute = (path: Router, children: ReactNode) => asRoute(relativeToSubject)(path, children);
export const asDQCRoute = (path: Router, children: ReactNode) => asRoute(relativeToDQC)(path, children);
export const asIDWRoute = (path: Router, children: ReactNode) => asRoute(relativeToIDW)(path, children);
export const asIDWIndicatorRoute = (path: Router, children: ReactNode) => asRoute(relativeToIDWIndicator)(path, children);
export const asIDWObjectiveRoute = (path: Router, children: ReactNode) => asRoute(relativeToIDWObjective)(path, children);
export const asIDWConvergenceRoute = (path: Router, children: ReactNode) => asRoute(relativeToIDWConvergence)(path, children);
export const asShareRoute = (path: Router, children: ReactNode) => asRoute(relativeToShare)(path, children);
export const asFallbackNavigate = (path: Router) => <Route path="*" element={<Navigate to={path} replace={true}/>}/>;
export const asFallbackRoute = (children: ReactNode) => <Route path="*" element={children}/>;
export const getWebContext = (): string => {
	const context = process.env.REACT_APP_WEB_CONTEXT;
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
export const toAbsoluteUrl = (path: Router): string => {
	return `${getWebContext()}${path}`;
};