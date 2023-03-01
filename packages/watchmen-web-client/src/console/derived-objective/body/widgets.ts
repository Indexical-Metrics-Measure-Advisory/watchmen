import styled from 'styled-components';

export const BodyContainer = styled.div.attrs({
	'data-widget': 'derived-objective-body',
	'data-v-scroll': '',
	'data-h-scroll': ''
})`
	display        : flex;
	position       : relative;
	flex-grow      : 1;
	flex-direction : column;
	padding        : var(--margin);
	overflow-y     : auto;
	overflow-x     : hidden;
`;
