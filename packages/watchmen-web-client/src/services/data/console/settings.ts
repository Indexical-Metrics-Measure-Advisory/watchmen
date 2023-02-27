import {fetchLastSnapshot} from '../account/last-snapshot';
import {fetchConnectedSpaceGraphics, fetchConnectedSpaces} from '../tuples/connected-space';
import {fetchDashboards} from '../tuples/dashboard';
import {fetchDerivedObjectives} from '../tuples/derived-objective';
import {TopicId} from '../tuples/topic-types';
import {fetchAvailableObjectives} from './available-objectives';
import {fetchAvailableSpaces} from './available-space';
import {fetchAvailableTopics} from './available-topic';
import {fetchFavorite} from './favorite';
import {ConsoleSettings} from './settings-types';

export const fetchConsoleSettingsData = async (): Promise<ConsoleSettings> => {
	const [
		connectedSpaces, connectedSpaceGraphics, derivedObjectives, dashboards,
		availableSpaces, availableObjectives,
		favorite, lastSnapshot
	] = await Promise.all([
		fetchConnectedSpaces(),
		fetchConnectedSpaceGraphics(),
		fetchDerivedObjectives(),
		fetchDashboards(),
		fetchAvailableSpaces(), fetchAvailableObjectives(),
		fetchFavorite(), fetchLastSnapshot()
	]);

	// @ts-ignore
	const topicIds = availableSpaces.reduce<Array<TopicId>>((topicIds, space) => ([...topicIds, ...space.topicIds]), []);
	const availableTopics = await fetchAvailableTopics(topicIds);

	// @ts-ignore
	return {
		connectedSpaces, connectedSpaceGraphics, derivedObjectives, dashboards,
		availableSpaces, availableTopics, availableObjectives,
		favorite, lastSnapshot
	};
};