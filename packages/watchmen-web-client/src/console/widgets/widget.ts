import {Dropdown} from '@/widgets/basic/dropdown';
import {DialogBody} from '@/widgets/dialog/widgets';
import styled from 'styled-components';

export const ShareDialogBody = styled(DialogBody)`
	flex-direction : column;
	margin-bottom  : var(--margin);
`;
export const AvailableTemplateTable = styled.div.attrs({'data-v-scroll': ''})`
	display        : flex;
	flex-direction : column;
	margin-top     : calc(var(--margin) / 4);
	max-height     : calc(var(--height) * 9);
	overflow-y     : auto;
`;
export const AvailableTemplateTableRow = styled.div`
	display               : grid;
	grid-template-columns : 40px 60px 1fr;
	&:nth-child(2n) {
		background-color : var(--grid-rib-bg-color);
	}
	&:first-child {
		position         : sticky;
		top              : 0;
		background-color : var(--bg-color);
		z-index          : 1;
	}
	&:not(:first-child):hover {
		background-color : var(--hover-color);
	}
`;
export const AvailableTemplateTableHeaderCell = styled.div`
	display       : flex;
	align-items   : center;
	padding       : 0 calc(var(--margin) / 4);
	font-size     : 1.1em;
	font-weight   : var(--font-bold);
	border-bottom : var(--border);
	height        : var(--height);
`;
export const AvailableTemplateTableCell = styled.div`
	display     : flex;
	align-items : center;
	padding     : 0 calc(var(--margin) / 4);
	height      : var(--height);
`;
export const AvailableSpaceDropdown = styled(Dropdown)`
	margin-top : calc(var(--margin) / 4);
`;
export const ErrorMessage = styled.div`
	display     : flex;
	position    : relative;
	align-items : center;
	color       : var(--danger-color);
`;