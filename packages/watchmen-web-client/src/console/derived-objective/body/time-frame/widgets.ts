import styled from 'styled-components';

export const TimeFrameContainer = styled.div.attrs({'data-widget': 'derived-objective-time-frame'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-bottom  : calc(var(--margin) / 2);
	padding-bottom : calc(var(--margin) / 2);
	border-bottom  : var(--border);
	transition     : height 300ms ease-in-out;
	&[data-visible=false] {
		height         : 0;
		margin-bottom  : 0;
		padding-bottom : 0;
		border-bottom  : 0;
		overflow       : hidden;
	}
`;
export const TimeFrameTitle = styled.div.attrs({'data-widget': 'derived-objective-time-frame-title'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-size    : 1.4em;
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	min-height   : var(--tall-height);
	opacity      : 0.8;
`;
export const TimeFrameLabel = styled.div.attrs({'data-widget': 'derived-objective-time-frame-label'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-variant : petite-caps;
	font-weight  : var(--font-bold);
	opacity      : 0.8;
`;
export const TimeFrameValue = styled.div.attrs({'data-widget': 'derived-objective-time-frame-value'})`
	display     : flex;
	position    : relative;
	align-items : center;
`;
export const TimeFrameVariablesRow = styled.div.attrs({'data-widget': 'derived-objective-time-frame-variables'})`
	display        : flex;
	position       : relative;
	align-items    : center;
	margin-top     : calc(var(--margin) / 2);
	> div[data-widget=dropdown],
	> div[data-widget=calendar],
	> input {
		justify-self : start;
		width        : auto;
		min-width    : 200px;
	}
	> div, > input {
		margin-left : var(--margin);
		&:first-child {
			margin-left : 0;
		}
	}
`;
export const CalculatedTimeFrameRow = styled.div.attrs({'data-widget': 'derived-objective-calculated-time-frames'})`
	display     : flex;
	position    : relative;
	align-items : center;
	margin-top  : calc(var(--margin) / 2);
	> div {
		margin-left : var(--margin);
		&:first-child {
			margin-left : 0;
		}
	}
`;
