import {Achievement} from '@/services/data/tuples/achievement-types';
import {AchievementEditEventBusProvider} from './achievement-edit-event-bus';
import {Editor} from './editor';
import {BodyContainer} from './widgets';

export const AchievementEditPageBody = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	return <AchievementEditEventBusProvider>
		<BodyContainer>
			<Editor achievement={achievement}/>
		</BodyContainer>
	</AchievementEditEventBusProvider>;
};