import styled from 'styled-components';

export const ConvergenceContainer = styled.div.attrs({'data-widget': 'convergence'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-top     : var(--margin);
	padding-bottom : var(--margin);
	> div[data-widget=step][data-step=def] > div[data-widget=step-body] {
		width    : calc(100% - var(--margin) / 2);
		overflow : auto;
		&::-webkit-scrollbar {
			height           : 8px;
			width            : 4px;
			background-color : transparent;
		}
		&::-webkit-scrollbar-track {
			background-color : var(--scrollbar-bg-color);
			border-radius    : 2px;
		}
		&::-webkit-scrollbar-thumb {
			background-color : var(--scrollbar-thumb-bg-color);
			border-radius    : 2px;
		}
	}
`;
export const BackToListButtonContainer = styled.div.attrs({'data-widget': 'convergence-back-to-list-button'})`
	display     : flex;
	margin-left : calc(var(--margin) / 2);
`;
