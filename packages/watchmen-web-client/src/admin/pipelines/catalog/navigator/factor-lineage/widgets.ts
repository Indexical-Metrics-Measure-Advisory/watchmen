import {DIALOG_Z_INDEX} from '@/widgets/basic/constants';
import styled, {keyframes} from 'styled-components';

const ShowDialog = keyframes`
	from {
		opacity          : 0;
		transform        : scale3d(1, 0, 1);
		transform-origin : 50% 20%;
		pointer-events   : none;
	}
	to {
		opacity          : 1;
		transform        : scale3d(1, 1, 1);
		transform-origin : 50% 20%;
		pointer-events   : auto;
	}
`;
const HideDialog = keyframes`
	from {
		opacity          : 1;
		transform        : scale3d(1, 1, 1);
		transform-origin : 50% 20%;
		pointer-events   : auto;
	}
	to {
		opacity          : 0;
		transform        : scale3d(1, 0, 1);
		transform-origin : 50% 20%;
		pointer-events   : none;
	}
`;

export const FactorLineageDialog = styled.div.attrs<{ visible: boolean }>(() => {
	return {
		'data-widget': 'factor-lineage-dialog'
	};
})<{ visible: boolean }>`
	position         : fixed;
	top              : 0;
	left             : 0;
	width            : 100vw;
	height           : 100vh;
	background-color : transparent;
	animation        : ${({visible}) => visible ? ShowDialog : HideDialog} 300ms ease-in-out;
	z-index          : ${DIALOG_Z_INDEX - 1};
`;

export const FactorLineageDialogWrapper = styled.div.attrs({'data-widget': 'factor-lineage-dialog-wrapper'})`
	margin-top       : 8vh;
	margin-left      : 15vw;
	width            : 70vw;
	padding          : calc(var(--margin) / 4) var(--margin) calc(var(--margin) / 2) var(--margin);
	display          : flex;
	flex-direction   : column;
	max-height       : 80vh;
	background-color : var(--bg-color);
	border-radius    : var(--border-radius);
	border           : var(--border);
	box-shadow       : var(--dialog-box-shadow);
`;

export const FactorLineageDialogHeader = styled.div.attrs({'data-widget': 'factor-lineage-dialog-header'})`
	display       : flex;
	align-items   : center;
	font-family   : var(--title-font-family);
	font-size     : 1.8em;
	height        : 2.2em;
	min-height    : 2.2em;
	border-bottom : var(--border);
	> span[data-widget=factor-lineage-dialog-header-topic] {
		font-size   : 0.7em;
		opacity     : 0.7;
		margin-left : calc(var(--margin) / 2);
	}
`;

export const FactorLineageDialogBar = styled.div.attrs({'data-widget': 'factor-lineage-dialog-bar'})`
	display       : flex;
	align-items   : center;
	height        : 3em;
	min-height    : 3em;
	font-size     : var(--font-size);
	border-bottom : var(--border);
	> span {
		opacity : 0.7;
	}
`;

export const FactorLineageTree = styled.div.attrs({'data-widget': 'factor-lineage-tree', 'data-v-scroll': ''})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
	min-height     : 0;
	overflow-y     : auto;
	padding        : calc(var(--margin) / 2) 0;
`;

export const FactorLineageNodeBlock = styled.div.attrs({'data-widget': 'factor-lineage-node-block'})`
	display        : flex;
	flex-direction : column;
`;

export const FactorLineageNodeRow = styled.div.attrs<{ root?: boolean }>(({root}) => {
	return {
		'data-widget': 'factor-lineage-node-row',
		'data-root': root ? 'yes' : 'no'
	};
})<{ root?: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto 1fr auto;
	align-items           : center;
	column-gap            : calc(var(--margin) / 2);
	height                : var(--tall-height);
	padding               : 0 calc(var(--margin) / 2);
	&:hover {
		background-color : var(--hover-color);
	}
	&[data-root='yes'] {
		font-weight      : var(--font-demi-bold);
		background-color : var(--hover-color);
		border-radius    : var(--border-radius);
	}
	&:not([data-root='yes'])::before {
		content    : '';
		display    : block;
		position   : absolute;
		left       : calc(var(--margin) * -0.5);
		top        : 50%;
		width      : calc(var(--margin) * 0.5);
		border-top : var(--border);
	}
`;

export const FactorLineageNodeChildren = styled.div.attrs({'data-widget': 'factor-lineage-node-children'})`
	margin-left : calc(var(--margin) * 0.5);
	border-left : var(--border);
`;

export const FactorLineageNodeName = styled.span.attrs({'data-widget': 'factor-lineage-node-name'})`
	font-family   : var(--title-font-family);
	white-space   : nowrap;
	overflow      : hidden;
	text-overflow : ellipsis;
`;

export const FactorLineageNodeTopic = styled.span.attrs({'data-widget': 'factor-lineage-node-topic'})`
	opacity     : 0.7;
	font-size   : 0.9em;
	white-space : nowrap;
`;

export const FactorLineageNodePipeline = styled.span.attrs({'data-widget': 'factor-lineage-node-pipeline'})`
	opacity       : 0.6;
	font-size     : 0.85em;
	white-space   : nowrap;
	overflow      : hidden;
	text-overflow : ellipsis;
	text-align    : right;
	justify-self  : end;
`;

export const FactorLineageRelationBadge = styled.span.attrs<{ type?: string }>(({type}) => {
	return {
		'data-widget': 'factor-lineage-relation-badge',
		'data-type': type ?? 'Direct'
	};
})<{ type?: string }>`
	display          : flex;
	align-items      : center;
	justify-content  : center;
	font-size        : 0.8em;
	height           : 1.6em;
	padding          : 0 calc(var(--margin) / 4);
	border-radius    : calc(var(--border-radius) / 2);
	color            : var(--invert-color);
	background-color : var(--primary-color);
	white-space      : nowrap;
	&[data-type='Computed'] {
		background-color : var(--danger-color);
	}
`;

export const FactorLineageNoData = styled.div.attrs({'data-widget': 'factor-lineage-no-data'})`
	display         : flex;
	flex-grow       : 1;
	align-items     : center;
	justify-content : center;
	font-variant    : petite-caps;
	font-weight     : var(--font-demi-bold);
	opacity         : 0.7;
`;

export const FactorLineageDialogFooter = styled.div.attrs({'data-widget': 'factor-lineage-dialog-footer'})`
	display         : flex;
	align-items     : center;
	justify-content : flex-end;
	height          : var(--header-height);
`;
