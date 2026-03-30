import {actionsData, incidentData, mainNav, pendingChanges} from '../data';
import {ActionItem, Incident, NavItem, PendingChange} from '../types';

const delay = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms));

export const fetchMainNav = async (): Promise<Array<NavItem>> => {
	await delay(20);
	return mainNav;
};

export const fetchPendingChanges = async (): Promise<Array<PendingChange>> => {
	await delay(20);
	return pendingChanges;
};

export const fetchIncidents = async (): Promise<Array<Incident>> => {
	await delay(20);
	return incidentData;
};

export const fetchActions = async (): Promise<Array<ActionItem>> => {
	await delay(20);
	return actionsData;
};
