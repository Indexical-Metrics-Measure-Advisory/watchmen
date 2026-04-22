import styled from 'styled-components';
import {Lang} from '@/widgets/langs';
import React, {useState} from 'react';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {DialogBody, DialogFooter, DialogHeader, DialogTitle} from '@/widgets/dialog/widgets';

const ViewSqlContainer = styled.div.attrs({'data-widget': 'view-sql-container'})`
	display        : flex;
	flex-direction : column;
	max-height      : 60vh;
`;

const SqlCodeArea = styled.pre.attrs({'data-widget': 'sql-code-area'})`
	margin          : calc(var(--margin) / 2);
	padding         : var(--margin);
	border-radius   : var(--border-radius);
	border          : var(--light-border);
	background-color: #1e1e2e;
	color           : #cdd6f4;
	overflow        : auto;
	white-space     : pre-wrap;
	word-break      : break-all;
	font-family     : 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
	font-size       : 0.85em;
	line-height     : 1.5;
`;

const CloseButton = styled.button.attrs({'data-widget': 'view-sql-close-button'})`
	padding         : calc(var(--margin) / 3) calc(var(--margin) / 2);
	border-radius   : var(--border-radius);
	border          : var(--light-border);
	background-color: var(--bg-color);
	color           : var(--text-color);
	cursor          : pointer;

	&:hover {
		background-color: var(--active-bg-color);
	}
`;

const ActionButton = styled(CloseButton).attrs({'data-widget': 'view-sql-action-button'})``;

const CopiedLabel = styled.span.attrs<{ visible: boolean }>(({visible}) => ({
	style: {opacity: visible ? 1 : 0}
}))<{ visible: boolean }>`
	transition       : opacity .3s ease-in-out;
	color            : #a6e3a1; /* green */
	margin-right     : auto;
`;

export const ViewSqlDialog = (props: { sql: string }) => {
	const {sql} = props;
	const {fire: fireGlobal} = useEventBus();
	const [copied, setCopied] = useState(false);

	const onClose = () => {
		fireGlobal(EventTypes.HIDE_DIALOG);
	};

	const onCopyClicked = async () => {
		if (!sql) return;
		await navigator.clipboard.writeText(sql);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return <ViewSqlContainer>
		<DialogHeader>
			<DialogTitle>{Lang.CONSOLE.CONNECTED_SPACE.VIEW_SQL_TITLE}</DialogTitle>
		</DialogHeader>
		<DialogBody>
			<SqlCodeArea>{sql || Lang.CONSOLE.CONNECTED_SPACE.VIEW_SQL_NO_DATA}</SqlCodeArea>
		</DialogBody>
		<DialogFooter>
			<CopiedLabel visible={copied}>{Lang.CONSOLE.DASHBOARD.URL_COPIED}</CopiedLabel>
			<ActionButton onClick={onCopyClicked}>{Lang.ACTIONS.COPY}</ActionButton>
			<CloseButton onClick={onClose}>{Lang.ACTIONS.CLOSE}</CloseButton>
		</DialogFooter>
	</ViewSqlContainer>;
};
