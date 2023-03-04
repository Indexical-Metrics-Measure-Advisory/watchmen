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
	&[data-on-share=true] {
		div[data-hide-on-share=true],
		button[data-hide-on-share=true] {
			display : none;
		}
		div[data-widget=derived-objective-target][data-on-share=true] {
			grid-template-columns : 1fr auto auto auto;
		}
		div[data-widget=derived-objective-breakdown-target][data-on-share=true] {
			grid-template-columns : 1fr;
			> div[data-widget=derived-objective-breakdown-target-title] {
				grid-column : 1;
			}
			> div[data-widget=derived-objective-breakdown-target-data] {
				border-left  : 0;
				padding-left : 0;
			}
		}
	}
`;
