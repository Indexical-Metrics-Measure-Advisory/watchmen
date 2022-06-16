import {Button} from '@/widgets/basic/button';
import styled from 'styled-components';

export const AchievementEdit = styled.div`
	display  : block;
	position : relative;
	&:hover {
		> button[data-widget=objective-analysis-perspective-achievement-indicator-adjust-button] {
			opacity : 1;
		}
	}
`;
export const AchievementIndicatorAdjustButton = styled(Button).attrs({
	'data-widget': 'objective-analysis-perspective-achievement-indicator-adjust-button'
})`
	position      : absolute;
	top           : calc(var(--margin) * -1);
	right         : 0;
	width         : var(--margin);
	height        : var(--margin);
	padding       : 0;
	border-radius : 100%;
	opacity       : 0;
`;