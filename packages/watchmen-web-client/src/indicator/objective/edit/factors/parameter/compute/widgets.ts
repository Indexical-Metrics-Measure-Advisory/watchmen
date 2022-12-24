import styled from 'styled-components';

export const ComputationContainer = styled.div.attrs({'data-widget': 'objective-computation'})`
	display               : grid;
	position              : relative;
	grid-column           : span 3;
	grid-template-columns : auto 1fr;
	grid-auto-rows        : minmax(var(--height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
	align-self            : stretch;
	align-items           : center;
	min-height            : var(--param-height);
`;
export const ParametersContainer = styled.div.attrs({'data-widget': 'computation-parameters'})`
	display                    : grid;
	position                   : relative;
	grid-template-columns      : 1fr;
	grid-row-gap               : calc(var(--margin) / 4);
	align-self                 : stretch;
	justify-self               : stretch;
	min-height                 : var(--param-height);
	border-top-right-radius    : calc(var(--param-height) / 2);
	border-bottom-right-radius : calc(var(--param-height) / 2);
	padding-left               : 1px;
`;
