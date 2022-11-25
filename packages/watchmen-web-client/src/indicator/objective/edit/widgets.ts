import {InputLines} from '@/widgets/basic/input-lines';
import styled from 'styled-components';

export const ObjectiveContainer = styled.div.attrs({'data-widget': 'objective'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-top     : var(--margin);
	padding-bottom : var(--margin);
`;

export const BackToListButtonContainer = styled.div.attrs({'data-widget': 'objective-back-to-list-button'})`
	display     : flex;
	margin-left : calc(var(--margin) / 2);
`;

export const DescriptionText = styled(InputLines)`
	width     : calc(100% - var(--margin) / 2);
	height    : calc(var(--height) * 5);
	font-size : 1.1em;
`;