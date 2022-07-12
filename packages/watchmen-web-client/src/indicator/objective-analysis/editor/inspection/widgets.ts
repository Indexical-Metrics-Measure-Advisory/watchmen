import styled from 'styled-components';

export const NoInspection = styled.div.attrs({'data-widget': 'no-inspection'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-size    : calc(var(--font-size) * 1.2);
	font-weight  : var(--font-demi-bold);
	font-variant : petite-caps;
	min-height   : var(--tall-height);
	white-space  : nowrap;
	opacity      : 0.5;
`;