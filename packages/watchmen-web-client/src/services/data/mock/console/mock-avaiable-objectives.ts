import {Objective} from '../../tuples/objective-types';
import {DemoObjectives} from '../tuples/mock-data-objectives';

export const fetchMockAvailableObjectives = async (): Promise<Array<Objective>> => {
	return new Promise(resolve => {
		setTimeout(() => resolve(DemoObjectives), 500);
	});
};
