import styled from 'styled-components';

export const ConvergenceContainer = styled.div.attrs({'data-widget': 'convergence'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-top     : var(--margin);
	padding-bottom : var(--margin);
	> div[data-widget=step][data-step=def] > div[data-widget=step-body] {
		display               : grid;
		grid-template-columns : 1fr;
	}
`;
export const BackToListButtonContainer = styled.div.attrs({'data-widget': 'convergence-back-to-list-button'})`
	display     : flex;
	margin-left : calc(var(--margin) / 2);
`;
