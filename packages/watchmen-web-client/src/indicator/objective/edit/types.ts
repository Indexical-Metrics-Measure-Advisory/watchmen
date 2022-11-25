import {ObjectiveData} from '../objectives-event-bus-types';

export type EditObjective = Omit<ObjectiveData, 'objective'> & Required<Pick<ObjectiveData, 'objective'>>