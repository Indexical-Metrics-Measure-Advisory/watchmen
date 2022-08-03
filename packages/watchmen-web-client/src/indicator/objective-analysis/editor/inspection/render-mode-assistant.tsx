import {useViewModeSwitch} from '../use-view-mode-switch';
import {Assistant} from './widgets';

export const RenderModeAssistant = (props: { startOnView: boolean }) => {
	const {startOnView} = props;

	const viewMode = useViewModeSwitch(startOnView);

	return <Assistant viewMode={viewMode}/>;
};