import styled from 'styled-components';

export const BreakdownTargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-targets'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	grid-column    : span 5;
	margin-top     : calc(var(--margin) / 2);
	margin-bottom  : calc(var(--margin) / 2);
`;
export const BreakdownTargetsBottomBar = styled.div.attrs({'data-widget': 'derived-objective-breakdown-targets-bottom-bar'})`
	display         : flex;
	position        : relative;
	justify-content : flex-end;
	margin-top      : calc(var(--margin) / 2);
`;