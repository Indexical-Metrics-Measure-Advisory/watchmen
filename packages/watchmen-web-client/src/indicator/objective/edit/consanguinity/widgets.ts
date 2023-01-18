import {DialogBody} from '@/widgets/dialog/widgets';
import styled from 'styled-components';

export const ConsanguinityDialogBody = styled(DialogBody)`
	display               : grid;
	grid-template-columns : 1fr;
`;

export const Loading = styled.div`
	display      : flex;
	position     : relative;
	align-items  : center;
	justify-self : center;
	font-size    : 2em;
	opacity      : 0.7;
	> svg {
		margin-right : calc(var(--margin) / 2);
	}
`;