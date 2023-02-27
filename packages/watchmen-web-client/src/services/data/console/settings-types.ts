import {LastSnapshot} from '../account/last-snapshot-types';
import {ConnectedSpace, ConnectedSpaceGraphics} from '../tuples/connected-space-types';
import {Dashboard} from '../tuples/dashboard-types';
import {DerivedObjective} from '../tuples/derived-objective-types';
import {Enum} from '../tuples/enum-types';
import {Objective} from '../tuples/objective-types';
import {Space} from '../tuples/space-types';
import {Topic} from '../tuples/topic-types';
import {Favorite} from './favorite-types';

export type AvailableSpaceInConsole = Pick<Space, 'spaceId' | 'name' | 'description' | 'topicIds'>;

export interface ConsoleSettings {
	connectedSpaces: Array<ConnectedSpace>;
	connectedSpaceGraphics: Array<ConnectedSpaceGraphics>;
	derivedObjectives: Array<DerivedObjective>;
	availableSpaces: Array<AvailableSpaceInConsole>;
	availableTopics: Array<Topic>;
	availableObjectives: Array<Objective>;
	dashboards: Array<Dashboard>;
	enums: Array<Enum>;
	favorite: Favorite;

	lastSnapshot: LastSnapshot;
}