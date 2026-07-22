import styled from 'styled-components';

export const PiiBody = styled.div.attrs({'data-widget': 'pii-body'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	flex-grow      : 1;
	overflow       : hidden;
`;

// ——— tabs ———
export const PiiTabHeaders = styled.div.attrs({'data-widget': 'pii-tab-headers'})`
	display       : flex;
	position      : relative;
	align-items   : center;
	min-height    : calc(var(--height) * 1.4);
	height        : calc(var(--height) * 1.4);
	padding       : 0 calc(var(--margin) / 2);
	border-bottom : var(--border);
`;
export const PiiTabHeader = styled.div.attrs<{ active: boolean }>(({active}) => {
	return {
		'data-widget': 'pii-tab-header',
		style: {
			color: active ? 'var(--primary-color)' : (void 0),
			borderBottomColor: active ? 'var(--primary-color)' : (void 0),
			fontWeight: active ? 'var(--font-bold)' : (void 0)
		}
	};
})<{ active: boolean }>`
	display        : flex;
	position       : relative;
	align-items    : center;
	height         : 100%;
	padding        : 0 calc(var(--margin) / 3);
	font-variant   : petite-caps;
	white-space    : nowrap;
	border-bottom  : 2px solid transparent;
	margin-bottom  : -1px;
	cursor         : pointer;
	transition     : color 300ms ease-in-out;
	&:hover {
		color : var(--primary-color);
	}
	&:not(:last-child) {
		margin-right : calc(var(--margin) / 3);
	}
`;
export const PiiTabContent = styled.div.attrs({'data-widget': 'pii-tab-content', 'data-v-scroll': ''})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	flex-grow      : 1;
	padding        : calc(var(--margin) / 2);
	overflow-y     : auto;
	overflow-x     : hidden;
`;

// ——— toolbar ———
export const PiiToolbar = styled.div.attrs({'data-widget': 'pii-toolbar'})`
	display       : flex;
	position      : relative;
	align-items   : center;
	flex-wrap     : wrap;
	grid-gap      : calc(var(--margin) / 4);
	margin-bottom : calc(var(--margin) / 2);
`;
export const PiiToolbarLabel = styled.span.attrs({'data-widget': 'pii-toolbar-label'})`
	font-variant : petite-caps;
	opacity      : 0.8;
`;
export const PiiToolbarInput = styled.div.attrs({'data-widget': 'pii-toolbar-input'})`
	display : flex;
	width   : 220px;
`;
export const PiiToolbarDropdown = styled.div.attrs<{ width?: number }>(({width = 180}) => {
	return {'data-widget': 'pii-toolbar-dropdown', style: {width}};
})<{ width?: number }>`
	display : flex;
`;
export const PiiToolbarPlaceholder = styled.div`
	flex-grow : 1;
`;

// ——— badges & tags ———
export const PiiLevelBadge = styled.span.attrs<{ level?: string }>(({level}) => {
	return {
		'data-widget': 'pii-level-badge',
		style: {
			color: level === '1级' ? 'var(--danger-color)' : 'var(--warn-color)',
			borderColor: level === '1级' ? 'var(--danger-color)' : 'var(--warn-color)'
		}
	};
})<{ level?: string }>`
	display        : inline-flex;
	align-items    : center;
	padding        : 0 8px;
	height         : 20px;
	font-size      : 0.85em;
	border         : var(--border);
	border-radius  : 10px;
	white-space    : nowrap;
`;
export const PiiSourceBadge = styled.span.attrs<{ source?: string }>(({source}) => {
	return {
		'data-widget': 'pii-source-badge',
		style: {
			color: source === 'keyword' ? 'var(--success-color)' : source === 'ai' ? 'var(--info-color, var(--primary-color))' : 'var(--primary-color)',
			borderColor: source === 'keyword' ? 'var(--success-color)' : source === 'ai' ? 'var(--info-color, var(--primary-color))' : 'var(--primary-color)'
		}
	};
})<{ source?: string }>`
	display       : inline-flex;
	align-items   : center;
	padding       : 0 8px;
	height        : 20px;
	font-size     : 0.85em;
	border        : var(--border);
	border-radius : 10px;
	white-space   : nowrap;
`;
export const PiiStatusBadge = styled.span.attrs<{ confirmed: boolean }>(({confirmed}) => {
	return {
		'data-widget': 'pii-status-badge',
		style: {color: confirmed ? 'var(--success-color)' : 'var(--warn-color)'}
	};
})<{ confirmed: boolean }>`
	display      : inline-flex;
	align-items  : center;
	font-size    : 0.9em;
	font-variant : petite-caps;
	white-space  : nowrap;
`;
export const PiiTag = styled.span.attrs({'data-widget': 'pii-tag'})`
	display          : inline-flex;
	align-items      : center;
	padding          : 0 6px;
	height           : 18px;
	font-family      : var(--code-font-family);
	font-size        : 0.8em;
	background-color : var(--hover-color);
	border-radius    : 3px;
	margin           : 0 4px 4px 0;
	white-space      : nowrap;
`;

// ——— confidence / progress ———
export const PiiProgress = styled.div.attrs({'data-widget': 'pii-progress'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	width            : 80px;
	height           : 6px;
	border-radius    : 3px;
	background-color : var(--hover-color);
	overflow         : hidden;
`;
export const PiiProgressFill = styled.div.attrs<{ percent: number; warn?: boolean }>(({percent, warn = false}) => {
	return {
		'data-widget': 'pii-progress-fill',
		style: {
			width: `${Math.min(100, Math.max(0, percent))}%`,
			backgroundColor: warn ? 'var(--warn-color)' : 'var(--primary-color)'
		}
	};
})<{ percent: number; warn?: boolean }>`
	height       : 100%;
	border-radius : 3px;
	transition   : width 300ms ease-in-out;
`;
export const PiiProgressText = styled.span.attrs({'data-widget': 'pii-progress-text'})`
	font-family : var(--code-font-family);
	font-size   : 0.85em;
	margin-left : 8px;
	white-space : nowrap;
`;

// ——— term cards ———
export const PiiTermGrid = styled.div.attrs({'data-widget': 'pii-term-grid'})`
	display               : grid;
	grid-template-columns : repeat(auto-fill, minmax(300px, 1fr));
	grid-gap              : calc(var(--margin) / 2);
`;
export const PiiTermCard = styled.div.attrs({'data-widget': 'pii-term-card'})`
	display          : flex;
	position         : relative;
	flex-direction   : column;
	border           : var(--border);
	border-radius    : var(--border-radius);
	background-color : var(--invert-color);
	padding          : calc(var(--margin) / 3);
`;
export const PiiTermCardHeader = styled.div.attrs({'data-widget': 'pii-term-card-header'})`
	display         : flex;
	align-items     : center;
	justify-content : space-between;
	margin-bottom   : 4px;
`;
export const PiiTermCardTitle = styled.span.attrs({'data-widget': 'pii-term-card-title'})`
	font-size   : 1.1em;
	font-weight : var(--font-demi-bold);
`;
export const PiiTermCardMeta = styled.div.attrs({'data-widget': 'pii-term-card-meta'})`
	display       : flex;
	align-items   : center;
	flex-wrap     : wrap;
	grid-gap      : 8px;
	font-size     : 0.9em;
	opacity       : 0.85;
	margin-bottom : 8px;
`;
export const PiiTermCardStats = styled.div.attrs({'data-widget': 'pii-term-card-stats'})`
	display       : flex;
	align-items   : center;
	font-size     : 0.9em;
	border-top    : var(--border);
	padding-top   : 8px;
	margin-top    : 4px;
	> span:last-child {
		font-family : var(--code-font-family);
		font-weight : var(--font-demi-bold);
		margin-left : 6px;
	}
`;
export const PiiTermCardTags = styled.div.attrs({'data-widget': 'pii-term-card-tags'})`
	display     : flex;
	flex-wrap   : wrap;
	margin-top  : 6px;
	min-height  : 4px;
`;
export const PiiTermCardActions = styled.div.attrs({'data-widget': 'pii-term-card-actions'})`
	display     : flex;
	align-items : center;
	margin-top  : 8px;
	> span {
		font-variant : petite-caps;
		cursor       : pointer;
		&:first-child {
			color        : var(--primary-color);
			margin-right : calc(var(--margin) / 3);
		}
		&:last-child {
			color : var(--danger-color);
		}
		&:hover {
			text-decoration : underline;
		}
	}
`;

// ——— table ———
export const PiiTable = styled.table.attrs({'data-widget': 'pii-table'})`
	width           : 100%;
	border-collapse : collapse;
	font-size       : 0.95em;
	> thead > tr > th {
		position         : sticky;
		top              : 0;
		text-align       : left;
		font-variant     : petite-caps;
		font-weight      : var(--font-demi-bold);
		padding          : 8px 12px;
		background-color : var(--invert-color);
		border-bottom    : var(--border);
		white-space      : nowrap;
		z-index          : 1;
	}
	> tbody > tr > td {
		padding       : 8px 12px;
		border-bottom : var(--border);
		white-space   : nowrap;
	}
	> tbody > tr:nth-child(even) > td {
		background-color : var(--tooltip-bg-color, transparent);
	}
`;
export const PiiMonoText = styled.span.attrs({'data-widget': 'pii-mono-text'})`
	font-family : var(--code-font-family);
`;
export const PiiTopicText = styled.span.attrs({'data-widget': 'pii-topic-text'})`
	font-family : var(--code-font-family);
	color       : var(--primary-color);
`;

// ——— cards / panels ———
export const PiiCard = styled.div.attrs({'data-widget': 'pii-card'})`
	display          : flex;
	position         : relative;
	flex-direction   : column;
	border           : var(--border);
	border-radius    : var(--border-radius);
	background-color : var(--invert-color);
	padding          : calc(var(--margin) / 2);
	margin-bottom    : calc(var(--margin) / 2);
`;
export const PiiCardTitle = styled.div.attrs({'data-widget': 'pii-card-title'})`
	display        : flex;
	align-items    : center;
	font-size      : 1.05em;
	font-weight    : var(--font-demi-bold);
	font-variant   : petite-caps;
	margin-bottom  : calc(var(--margin) / 3);
`;
export const PiiCardTitleBadge = styled.span.attrs({'data-widget': 'pii-card-title-badge'})`
	display          : inline-flex;
	align-items      : center;
	justify-content  : center;
	min-width        : 20px;
	height           : 20px;
	padding          : 0 6px;
	margin-left      : 8px;
	font-size        : 0.75em;
	font-family      : var(--code-font-family);
	color            : var(--invert-color);
	background-color : var(--primary-color);
	border-radius    : 10px;
`;
export const PiiKpiRow = styled.div.attrs({'data-widget': 'pii-kpi-row'})`
	display               : grid;
	grid-template-columns : repeat(4, 1fr);
	grid-gap              : calc(var(--margin) / 2);
	margin-bottom         : calc(var(--margin) / 2);
	@media (max-width: 1200px) {
		grid-template-columns : repeat(2, 1fr);
	}
`;
export const PiiKpiValue = styled.div.attrs<{ danger?: boolean }>(({danger = false}) => {
	return {
		'data-widget': 'pii-kpi-value',
		style: {color: danger ? 'var(--danger-color)' : 'var(--primary-color)'}
	};
})<{ danger?: boolean }>`
	font-family : var(--code-font-family);
	font-size   : 1.8em;
	font-weight : var(--font-bold);
	line-height : 1.2;
`;
export const PiiKpiLabel = styled.div.attrs({'data-widget': 'pii-kpi-label'})`
	font-variant : petite-caps;
	opacity      : 0.8;
`;
export const PiiKpiSubtext = styled.div.attrs<{ danger?: boolean }>(({danger = false}) => {
	return {
		'data-widget': 'pii-kpi-subtext',
		style: {color: danger ? 'var(--danger-color)' : (void 0)}
	};
})<{ danger?: boolean }>`
	font-size  : 0.85em;
	opacity    : 0.85;
	margin-top : 4px;
`;
export const PiiColumns = styled.div.attrs<{ ratio?: string }>(({ratio = '3fr 2fr'}) => {
	return {'data-widget': 'pii-columns', style: {gridTemplateColumns: ratio}};
})<{ ratio?: string }>`
	display               : grid;
	grid-gap              : calc(var(--margin) / 2);
	align-items           : start;
	@media (max-width: 1200px) {
		grid-template-columns : 1fr !important;
	}
`;

// ——— notes ———
export const PiiInfoNote = styled.div.attrs({'data-widget': 'pii-info-note'})`
	display          : flex;
	align-items      : center;
	padding          : 10px calc(var(--margin) / 2);
	margin-top       : calc(var(--margin) / 2);
	font-size        : 0.9em;
	color            : var(--primary-color);
	background-color : var(--hover-color);
	border-left      : 3px solid var(--primary-color);
	border-radius    : var(--border-radius);
`;
export const PiiWarnNote = styled.div.attrs({'data-widget': 'pii-warn-note'})`
	display          : flex;
	align-items      : center;
	padding          : 10px calc(var(--margin) / 2);
	margin-top       : calc(var(--margin) / 3);
	font-size        : 0.9em;
	color            : var(--warn-color);
	background-color : var(--hover-color);
	border-left      : 3px solid var(--warn-color);
	border-radius    : var(--border-radius);
`;
export const PiiNoData = styled.div.attrs({'data-widget': 'pii-no-data'})`
	display         : flex;
	align-items     : center;
	justify-content : center;
	padding         : calc(var(--margin) / 2);
	opacity         : 0.6;
	font-variant    : petite-caps;
`;

// ——— term editor modal ———
export const PiiEditorOverlay = styled.div.attrs({'data-widget': 'pii-editor-overlay'})`
	display          : flex;
	position         : fixed;
	top              : 0;
	left             : 0;
	width            : 100vw;
	height           : 100vh;
	align-items      : center;
	justify-content  : center;
	background-color : rgba(0, 0, 0, 0.35);
	z-index          : 9990;
`;
export const PiiEditorPanel = styled.div.attrs({'data-widget': 'pii-editor-panel'})`
	display          : flex;
	flex-direction   : column;
	width            : 520px;
	max-width        : calc(100vw - 64px);
	max-height       : calc(100vh - 64px);
	overflow-y       : auto;
	background-color : var(--invert-color);
	border           : var(--border);
	border-radius    : var(--border-radius);
	box-shadow       : var(--shadow);
	padding          : calc(var(--margin) / 2);
`;
export const PiiEditorTitle = styled.div.attrs({'data-widget': 'pii-editor-title'})`
	font-size     : 1.2em;
	font-weight   : var(--font-demi-bold);
	font-variant  : petite-caps;
	margin-bottom : calc(var(--margin) / 2);
`;
export const PiiEditorField = styled.div.attrs({'data-widget': 'pii-editor-field'})`
	display        : flex;
	flex-direction : column;
	margin-bottom  : calc(var(--margin) / 3);
`;
export const PiiEditorLabel = styled.span.attrs({'data-widget': 'pii-editor-label'})`
	font-size     : 0.9em;
	font-variant  : petite-caps;
	opacity       : 0.85;
	margin-bottom : 4px;
`;
export const PiiEditorInput = styled.input.attrs({'data-widget': 'pii-editor-input'})`
	height           : var(--height);
	padding          : 0 var(--input-indent);
	font-family      : var(--font-family);
	font-size        : var(--font-size);
	color            : var(--font-color);
	background-color : transparent;
	border           : var(--border);
	border-radius    : var(--border-radius);
	outline          : none;
	&:focus {
		border-color : var(--primary-color);
	}
`;
export const PiiEditorTextarea = styled.textarea.attrs({'data-widget': 'pii-editor-textarea'})`
	min-height       : 64px;
	padding          : 6px var(--input-indent);
	font-family      : var(--font-family);
	font-size        : var(--font-size);
	color            : var(--font-color);
	background-color : transparent;
	border           : var(--border);
	border-radius    : var(--border-radius);
	outline          : none;
	resize           : vertical;
	&:focus {
		border-color : var(--primary-color);
	}
`;
export const PiiEditorActions = styled.div.attrs({'data-widget': 'pii-editor-actions'})`
	display         : flex;
	align-items     : center;
	justify-content : flex-end;
	grid-gap        : calc(var(--margin) / 4);
	margin-top      : calc(var(--margin) / 3);
`;

// ——— lineage ———
export const PiiChartBox = styled.div.attrs<{ height?: number }>(({height = 420}) => {
	return {'data-widget': 'pii-chart-box', style: {height}};
})<{ height?: number }>`
	width : 100%;
`;
export const PiiLineageList = styled.div.attrs({'data-widget': 'pii-lineage-list'})`
	display        : flex;
	flex-direction : column;
`;
export const PiiLineageListItem = styled.div.attrs({'data-widget': 'pii-lineage-list-item'})`
	display         : flex;
	align-items     : center;
	justify-content : space-between;
	padding         : 6px 0;
	&:not(:last-child) {
		border-bottom : var(--border);
	}
	> span:last-child {
		font-size : 0.85em;
		opacity   : 0.7;
	}
`;
export const PiiSegmented = styled.div.attrs({'data-widget': 'pii-segmented'})`
	display       : flex;
	align-items   : center;
	border        : var(--border);
	border-radius : var(--border-radius);
	overflow      : hidden;
	> span {
		display     : flex;
		align-items : center;
		height      : var(--height);
		padding     : 0 12px;
		cursor      : pointer;
		white-space : nowrap;
		&[data-active=true] {
			color            : var(--invert-color);
			background-color : var(--primary-color);
		}
		&:not(:last-child) {
			border-right : var(--border);
		}
	}
`;
export const PiiSlider = styled.input.attrs({'data-widget': 'pii-slider', type: 'range'})`
	accent-color : var(--primary-color);
	width        : 140px;
`;
