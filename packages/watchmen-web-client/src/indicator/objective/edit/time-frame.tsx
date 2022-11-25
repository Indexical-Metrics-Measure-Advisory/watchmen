import {Lang} from '@/widgets/langs';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';

export const TimeFrame = (props: { data: EditObjective }) => {
	const {data} = props;

	console.log(data);

	return <EditStep index={ObjectiveDeclarationStep.TIME_FRAME} title={Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TITLE}>
	</EditStep>;
};