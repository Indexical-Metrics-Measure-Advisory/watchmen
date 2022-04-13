import styled from 'styled-components';
import {StepTitle} from '../../../step-widgets';

export const Title = styled(StepTitle)`
	> button:first-child {
		margin-right : calc(var(--margin) / 2);
	}
`;

export const BackToListButtonActiveContainer = styled.div`
	display     : flex;
	margin-left : calc(var(--margin) / 2);
`;
export const BackToListButtonDoneContainer = styled.div`
	display         : flex;
	flex-grow       : 1;
	justify-content : flex-end;
`;
