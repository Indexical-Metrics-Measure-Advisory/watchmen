import {base64Decode, base64Encode} from '../../utils';
import {Apis, get, post} from '../apis';
import {fetchMockLastSnapshot} from '../mock/account/mock-last-snapshot';
import {CONSOLE_HOME_SEARCHED, LAST_SNAPSHOT_TOKEN} from '../session-constants';
import {ConnectedSpace} from '../tuples/connected-space-types';
import {Dashboard} from '../tuples/dashboard-types';
import {Report} from '../tuples/report-types';
import {Subject} from '../tuples/subject-types';
import {isMockService} from '../utils';
import {findAccount} from './index';
import {LastSnapshot} from './last-snapshot-types';

const fetchLastSnapshotFromSession = (): LastSnapshot | undefined => {
	const account = findAccount();
	if (!account) {
		return;
	}

	const value = localStorage.getItem(LAST_SNAPSHOT_TOKEN);
	if (value) {
		try {
			return JSON.parse(base64Decode(value));
		} catch {
			return;
		}
	}
};
// eslint-disable-next-line
export const fetchLanguageFromSession = (): string | null => {
	const value = localStorage.getItem(LAST_SNAPSHOT_TOKEN);
	if (value) {
		try {
			return JSON.parse(base64Decode(value)).language;
		} catch {
		}
	}
	return null;
};
export const fetchThemeFromSession = (): string | null => {
	const value = localStorage.getItem(LAST_SNAPSHOT_TOKEN);
	if (value) {
		try {
			return JSON.parse(base64Decode(value)).theme;
		} catch {
		}
	}
	return null;
};
const saveLastSnapshotToSession = (snapshot: LastSnapshot) => {
	localStorage.setItem(LAST_SNAPSHOT_TOKEN, base64Encode(JSON.stringify(snapshot)));
};

export const fetchLastSnapshot = async (): Promise<LastSnapshot> => {
	if (isMockService()) {
		const fromSession = fetchLastSnapshotFromSession();
		if (fromSession) {
			return fromSession;
		} else {
			const fromMock = await fetchMockLastSnapshot();
			saveLastSnapshotToSession(fromMock);
			return fromMock;
		}
	} else {
		return await get({api: Apis.LAST_SNAPSHOT_MINE});
	}
};

export const saveLastSnapshot = async (snapshot: Partial<LastSnapshot>): Promise<void> => {
	const old = fetchLastSnapshotFromSession();
	let qualifiedSnapshot;
	if (old) {
		qualifiedSnapshot = {...old, ...snapshot};
	} else {
		qualifiedSnapshot = {...snapshot};
	}
	saveLastSnapshotToSession(qualifiedSnapshot);

	if (isMockService()) {
		console.log('mock saveLastSnapshot');
	} else {
		await post({api: Apis.LAST_SNAPSHOT_SAVE, data: qualifiedSnapshot});
	}
};

export type FoundReport = Report & Pick<Subject, 'subjectId'> & Pick<ConnectedSpace, 'connectId'>;
export type FoundSubject = Subject & Pick<ConnectedSpace, 'connectId'>
export type FoundItem = FoundSubject | ConnectedSpace | Dashboard | FoundReport;

export const saveConsoleHomeSearched = (text: string, data: Array<FoundItem>) => {
	sessionStorage.setItem(CONSOLE_HOME_SEARCHED, base64Encode(JSON.stringify({
		account: findAccount()?.name,
		search: text,
		data
	})));
};

export const findConsoleHomeSearched = (): { search: string, data: Array<FoundItem> } => {
	const inStorage = sessionStorage.getItem(CONSOLE_HOME_SEARCHED);
	if (inStorage != null) {
		try {
			const {account, search, data} = JSON.parse(base64Decode(inStorage));
			if (account === findAccount()?.name) {
				return {search: search || '', data: data as Array<FoundItem>};
			} else {
				return {search: '', data: []};
			}
		} catch (e) {
			console.error(e);
			return {search: '', data: []};
		}
	} else {
		return {search: '', data: []};
	}
};
