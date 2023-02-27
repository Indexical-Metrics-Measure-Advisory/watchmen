import {toConnectedSpace, toDashboard, toDerivedObjective, toSubject, toSubjectReport} from '@/routes/utils';
import {findConsoleHomeSearched, FoundItem, saveConsoleHomeSearched} from '@/services/data/account/last-snapshot';
import {ConnectedSpace, ConnectedSpaceId} from '@/services/data/tuples/connected-space-types';
import {Dashboard, DashboardId} from '@/services/data/tuples/dashboard-types';
import {DerivedObjective, DerivedObjectiveId} from '@/services/data/tuples/derived-objective-types';
import {Report, ReportId} from '@/services/data/tuples/report-types';
import {Subject, SubjectId} from '@/services/data/tuples/subject-types';
import {
	generateUuid,
	isConnectedSpace,
	isDashboard,
	isDerivedObjective,
	isReport,
	isSubject
} from '@/services/data/tuples/utils';
import {
	ICON_CONNECTED_SPACE,
	ICON_DASHBOARD,
	ICON_FAVORITE,
	ICON_OBJECTIVE,
	ICON_REPORT,
	ICON_SUBJECT
} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {
	CardContainer,
	CardLastVisit,
	CardName,
	HomeSection,
	HomeSectionBody,
	HomeSectionHeader,
	HomeSectionTitle,
	SearchInput,
	SearchList
} from './widgets';

const find = async (
	askConnectedSpaces: () => Promise<Array<ConnectedSpace>>,
	askDashboards: () => Promise<Array<Dashboard>>,
	askDerivedObjectives: () => Promise<Array<DerivedObjective>>
): Promise<Array<FoundItem>> => {
	const [connectedSpaces, dashboards, derivedObjectives] = await Promise.all([askConnectedSpaces(), askDashboards(), askDerivedObjectives()]);
	const subjects = connectedSpaces.map(cs => {
		return (cs.subjects || []).map(s => {
			return {
				...s,
				connectId: cs.connectId
			};
		});
	}).flat();
	const reports = subjects.map(s => {
		return (s.reports || []).map(r => {
			return {
				...r,
				subjectId: s.subjectId,
				connectId: s.connectId
			};
		});
	}).flat();
	return [...connectedSpaces, ...subjects, ...reports, ...dashboards, ...derivedObjectives];
};

export const FindSection = () => {
	const navigate = useNavigate();
	const {fire} = useConsoleEventBus();
	const [searchText, setSearchText] = useState('');
	const [searched, setSearched] = useState<Array<FoundItem>>([]);
	useEffect(() => {
		(async () => {
			const existing = await find(
				() => new Promise<Array<ConnectedSpace>>(resolve => fire(ConsoleEventTypes.ASK_CONNECTED_SPACES, resolve)),
				() => new Promise<Array<Dashboard>>(resolve => fire(ConsoleEventTypes.ASK_DASHBOARDS, resolve)),
				() => new Promise<Array<DerivedObjective>>(resolve => fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, resolve))
			);
			const map = existing.reduce((map, item) => {
				if (isDashboard(item)) {
					map.dashboards[item.dashboardId] = item;
				} else if (isReport(item)) {
					map.reports[item.reportId] = item;
				} else if (isSubject(item)) {
					map.subjects[item.subjectId] = item;
				} else if (isConnectedSpace(item)) {
					map.connectedSpaces[item.connectId] = item;
				} else if (isDerivedObjective(item)) {
					map.derivedObjectives[item.derivedObjectiveId] = item;
				}
				return map;
			}, {
				dashboards: {} as Record<DashboardId, Dashboard>,
				derivedObjectives: {} as Record<DerivedObjectiveId, DerivedObjective>,
				connectedSpaces: {} as Record<ConnectedSpaceId, ConnectedSpace>,
				subjects: {} as Record<SubjectId, Subject>,
				reports: {} as Record<ReportId, Report>
			});
			const {search: text, data: searched} = findConsoleHomeSearched();
			const data = (searched || []).filter(item => {
				if (isDashboard(item)) {
					return map.dashboards[item.dashboardId] != null;
				} else if (isReport(item)) {
					return map.reports[item.reportId] != null;
				} else if (isSubject(item)) {
					return map.subjects[item.subjectId] != null;
				} else if (isConnectedSpace(item)) {
					return map.connectedSpaces[item.connectId] != null;
				} else if (isDerivedObjective(item)) {
					return map.derivedObjectives[item.derivedObjectiveId] != null;
				} else {
					return true;
				}
			});
			setSearched(data);
			setSearchText(text);
		})();
	}, [fire]);

	const onSearchTextChanged = async (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		setSearchText(value);
		const existing = await find(
			() => new Promise<Array<ConnectedSpace>>(resolve => fire(ConsoleEventTypes.ASK_CONNECTED_SPACES, resolve)),
			() => new Promise<Array<Dashboard>>(resolve => fire(ConsoleEventTypes.ASK_DASHBOARDS, resolve)),
			() => new Promise<Array<DerivedObjective>>(resolve => fire(ConsoleEventTypes.ASK_DERIVED_OBJECTIVES, resolve))
		);
		const text = value.toLowerCase();
		const items = existing
			.filter(item => (item.name || '').toLowerCase().includes(text))
			.sort((a, b) => {
				const sa = isReport(a) ? 1 : (isSubject(a) ? 2 : isDashboard(a) ? 3 : 4);
				const sb = isReport(b) ? 1 : (isSubject(b) ? 2 : isDashboard(b) ? 3 : 4);
				return (sa - sb !== 0) ? (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()) : (sa - sb);
			});
		setSearched(items);
		saveConsoleHomeSearched(value, items);
	};
	const onItemClicked = (item: FoundItem) => () => {
		if (isDashboard(item)) {
			navigate(toDashboard(item.dashboardId));
		} else if (isReport(item)) {
			navigate(toSubjectReport(item.connectId, item.subjectId, item.reportId));
		} else if (isSubject(item)) {
			navigate(toSubject(item.connectId, item.subjectId));
		} else if (isConnectedSpace(item)) {
			navigate(toConnectedSpace(item.connectId));
		} else if (isDerivedObjective(item)) {
			navigate(toDerivedObjective(item.derivedObjectiveId));
		}
	};

	const asItemKey = (item: FoundItem): string => {
		if (isDashboard(item)) {
			return `dashboard-${item.dashboardId}`;
		} else if (isReport(item)) {
			return `report-${item.reportId}`;
		} else if (isSubject(item)) {
			return `subject-${item.subjectId}`;
		} else if (isConnectedSpace(item)) {
			return `connected-space-${item.connectId}`;
		} else if (isDerivedObjective(item)) {
			return `derived-objective-${item.derivedObjectiveId}`;
		} else {
			return generateUuid();
		}
	};
	const asItemIcon = (item: FoundItem): IconDefinition => {
		switch (true) {
			case isDashboard(item):
				return ICON_DASHBOARD;
			case isReport(item):
				return ICON_REPORT;
			case isSubject(item):
				return ICON_SUBJECT;
			case isConnectedSpace(item):
				return ICON_CONNECTED_SPACE;
			case isDerivedObjective(item):
				return ICON_OBJECTIVE;
			default:
				return ICON_FAVORITE;
		}
	};

	return <HomeSection>
		<HomeSectionHeader>
			<HomeSectionTitle>Quick Find</HomeSectionTitle>
		</HomeSectionHeader>
		<HomeSectionBody collapse={false}>
			<SearchInput value={searchText} onChange={onSearchTextChanged}
			             placeholder={Lang.PLAIN.CONSOLE_SEARCH_PLACEHOLDER}/>
			<SearchList>
				{searched.map(item => {
					return <CardContainer onClick={onItemClicked(item)} key={asItemKey(item)}>
						<FontAwesomeIcon icon={asItemIcon(item)}/>
						<CardLastVisit>{item.lastVisitTime}</CardLastVisit>
						<CardName>{item.name}</CardName>
					</CardContainer>;
				})}
			</SearchList>
		</HomeSectionBody>
	</HomeSection>;
};