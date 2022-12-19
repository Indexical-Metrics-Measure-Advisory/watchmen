import styled from 'styled-components';

export const TimeFrameContainer = styled.div.attrs<{
	timeRelated: boolean; lastN: boolean; specifiedTill: boolean
}>(() => {
	return {
		'data-widget': 'objective-time-frame',
		style: {}
	};
})<{ timeRelated: boolean; lastN: boolean; specifiedTill: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	> div[data-widget=dropdown],
	> div[data-widget=calendar],
	> input {
		justify-self : start;
		width        : auto;
		min-width    : 200px;
	}
	> span:nth-child(3),
	> span:nth-child(5) {
		transition : opacity 300ms ease-in-out;
	}
	> span:nth-child(3),
	> div[data-widget=dropdown]:nth-child(4) {
		opacity        : ${({timeRelated, lastN}) => timeRelated && lastN ? (void 0) : 0};
		pointer-events : ${({timeRelated, lastN}) => timeRelated && lastN ? (void 0) : 'none'};
	}
	> span:nth-child(5) {
		grid-column : 1;
	}
	> span:nth-child(5),
	> div[data-widget=dropdown]:nth-child(6) {
		opacity        : ${({timeRelated}) => timeRelated ? (void 0) : 0};
		pointer-events : ${({timeRelated}) => timeRelated ? (void 0) : 'none'};
	}
	> span:nth-child(7),
	> div[data-widget=calendar]:nth-child(8) {
		opacity        : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 0};
		pointer-events : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 'none'};
	}
	> span:nth-child(9) {
		opacity        : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? 0.7 : 0};
		pointer-events : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 'none'};
		grid-column    : span 2;
	}
	> span:nth-child(10) {
		grid-column : 1;
	}
`;
