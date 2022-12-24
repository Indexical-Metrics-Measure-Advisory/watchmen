import {Objective} from './objective-types';

export type QueryObjective = Pick<Objective, 'objectiveId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>;
