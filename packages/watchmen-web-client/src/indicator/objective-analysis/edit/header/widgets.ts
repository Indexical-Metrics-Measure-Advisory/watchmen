import {PageHeaderHolderContainer} from '@/widgets/basic/page-header';
import {DialogBody} from '@/widgets/dialog/widgets';
import styled from 'styled-components';

export const PageHeaderHolder = styled(PageHeaderHolderContainer)`
	grid-template-columns : auto auto 1fr;
`;

export const SubscribeDialogBody = styled(DialogBody)`
	display               : grid;
	grid-template-columns : auto 1fr;
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	margin-top            : calc(var(--margin) / 2);
	margin-bottom         : var(--margin);
`;
export const SubscribeLeadLabel = styled.div`
	display      : flex;
	align-items  : center;
	height       : var(--height);
	font-variant : petite-caps;
	//font-weight  : var(--font-bold);
`;
