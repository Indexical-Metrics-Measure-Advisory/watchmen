import styled from 'styled-components';

export const ShareDerivedObjectiveContainer = styled.div.attrs({'data-widget': 'shared-derived-objective'})`
	> div[data-widget=derived-objective-body] {
		min-height : 100vh;
	}
`;
export const SharedHeader = styled.div.attrs({'data-widget': 'shared-derived-objective-header'})`
	display       : flex;
	position      : relative;
	padding       : calc(var(--margin) / 2) var(--margin) 0;
	font-family   : var(--title-font-family);
	font-size     : 3em;
	height        : calc(var(--margin) / 2 + 1.3em);
	line-height   : 1.3em;
	white-space   : nowrap;
	text-overflow : ellipsis;
	overflow      : hidden;
`;
export const NoData = styled.div.attrs<{ background: string }>(({background}) => {
	return {
		'data-widget': 'derived-objective-no-data',
		style: {
			backgroundImage: `url(${background})`
		}
	};
})<{ background: string }>`
	width               : 100%;
	height              : 50%;
	background-repeat   : no-repeat;
	background-size     : contain;
	background-position : center;
	filter              : drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.7)) grayscale(0.9);
	transition          : all 300ms ease-in-out;
`;
