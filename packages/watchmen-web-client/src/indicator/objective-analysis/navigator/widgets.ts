import {Button} from '@/widgets/basic/button';
import styled from 'styled-components';

export const NavigatorContainer = styled.div.attrs<{ visible: boolean }>(({visible}) => {
	return {
		style: {
			borderRightWidth: visible ? (void 0) : 0,
			marginLeft: visible ? 0 : (void 0)
		}
	};
})<{ visible: boolean }>`
	display        : flex;
	flex-direction : column;
	border-right   : var(--border);
	width          : 300px;
	margin-left    : -300px;
	transition     : margin-left 300ms ease-in-out;
`;

export const ControlButton = styled(Button).attrs<{ visible: boolean }>(({visible}) => {
	return {
		style: {
			left: visible ? 'calc(300px - var(--margin) * 6 / 4)' : 0,
			opacity: visible ? 0 : 1,
			pointerEvents: visible ? 'none' : (void 0)
		}
	};
})<{ visible: boolean }>`
	position      : absolute;
	height        : calc(var(--margin) * 5 / 4);
	width         : calc(var(--margin) * 5 / 4);
	top           : 0;
	margin-top    : calc(var(--margin) / 4);
	margin-left   : calc(var(--margin) / 4);
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.5em;
	z-index       : 2;
	transition    : left 300ms ease-in-out, opacity 300ms ease-in-out;
`;