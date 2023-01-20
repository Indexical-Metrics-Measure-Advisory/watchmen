import styled from 'styled-components';

export const NodeContainer = styled.div.attrs({'data-widget': 'consanguinity-node'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	min-height     : calc(var(--height) * 2);
	border-radius  : calc(var(--height) / 2);
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2);
	box-shadow     : var(--consanguinity-node-shadow);
	&[data-node-type=objective-target] {
	}
`;
export const NodeTitle = styled.div.attrs({'data-widget': 'consanguinity-node-title'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	font-variant    : petite-caps;
	font-weight     : var(--font-bold);
	min-height      : calc(var(--height) * 1.5);
`