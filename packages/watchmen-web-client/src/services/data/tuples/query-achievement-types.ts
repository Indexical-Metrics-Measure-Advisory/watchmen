import {Achievement} from './achievement-types';

export type QueryAchievement = Pick<Achievement, 'achievementId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>