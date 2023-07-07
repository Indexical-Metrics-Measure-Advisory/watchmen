import {DialogBody} from '@/widgets/dialog/widgets';
import styled from 'styled-components';
import {ConsanguinityBlockBody, ConsanguinityDiagram} from '../widgets';

export const ConsanguinityDialogBody = styled(DialogBody)`
	display       : flex;
	position      : relative;
	margin-bottom : var(--margin);
	padding       : var(--margin);
	+ div[data-widget=dialog-footer] {
		> button {
			border-bottom-left-radius  : calc(var(--margin) / 2);
			border-bottom-right-radius : calc(var(--margin) / 2);
			flex-grow                  : 1;
			font-weight                : var(--font-bold);
			font-size                  : 1.1em;
		}
	}
`;
export const Loading = styled.div`
	display     : block;
	position    : relative;
	flex-grow   : 1;
	align-self  : center;
	font-size   : 3em;
	font-weight : var(--font-bold);
	text-align  : center;
	opacity     : 0.5;
	> svg {
		font-size : 0.8em;
	}
	> span {
		display      : inline-block;
		margin-left  : 0.6em;
		transform    : translateY(2px);
		font-variant : petite-caps;
	}
`;
export const ObjectiveConsanguinityDiagram = styled(ConsanguinityDiagram)`
	grid-template-columns : repeat(4, 1fr);
	grid-template-rows    : auto 1fr;
	padding-right         : var(--margin);
	overflow-y            : scroll;
	overflow-x            : hidden;
	> div[data-widget=consanguinity-block]:nth-child(5) {
		grid-column : 1 / span 4;
		> div[data-widget=consanguinity-block-body] {
			display               : grid;
			grid-template-columns : repeat(4, 1fr);
			grid-column-gap       : calc(var(--margin) * 3.5);
			grid-row-gap          : calc(var(--margin) * 2);
		}
	}
`;
export const ObjectiveConsanguinityBlockBody = styled(ConsanguinityBlockBody)`
	display               : grid;
	grid-row-gap          : var(--margin);
	align-content         : start;
`;