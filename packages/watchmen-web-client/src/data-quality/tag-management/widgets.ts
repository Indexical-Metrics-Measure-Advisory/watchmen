import styled from 'styled-components';

export const TagManagementContainer = styled.div.attrs({'data-widget': 'tag-management-page'})`
	display        : flex;
	flex-direction : column;
	height         : 100%;
	overflow       : hidden;
`;

export const TagCardGrid = styled.div.attrs({'data-widget': 'tag-card-grid'})`
	display               : grid;
	grid-template-columns : repeat(auto-fill, minmax(320px, 1fr));
	gap                   : calc(var(--margin) / 2);
	padding               : calc(var(--margin) / 2);
`;

// Card — follows TupleCard / CatalogCard visual style
export const TagCardContainer = styled.div.attrs({'data-widget': 'tag-card'})`
	display        : flex;
	flex-direction : column;
	border-radius  : calc(var(--border-radius) * 2);
	box-shadow     : var(--shadow);
	cursor         : pointer;
	transition     : all 300ms ease-in-out;

	&:hover {
		box-shadow : var(--hover-shadow);
	}

	&[data-changed="true"] {
		border-left : 3px solid var(--primary-color, #1890ff);
	}
`;

export const TagCardBody = styled.div.attrs({'data-widget': 'tag-card-body'})`
	padding : calc(var(--margin) / 2) var(--margin);
`;

export const TagCardTitle = styled.div.attrs({'data-widget': 'tag-card-title'})`
	display      : flex;
	align-items  : center;
	font-family  : var(--title-font-family);
	font-size    : 1.3em;
	font-weight  : var(--font-demi-bold);
	gap          : 8px;

	> span {
		flex-grow     : 1;
		word-break    : break-word;
		overflow      : hidden;
		text-overflow : ellipsis;
		white-space   : nowrap;
	}
`;

export const TagCardColorDot = styled.div<{ $color: string }>`
	width         : 12px;
	height        : 12px;
	border-radius : 3px;
	background    : ${props => props.$color};
	flex-shrink   : 0;
`;

export const TagCardDescription = styled.div.attrs({'data-widget': 'tag-card-description'})`
	display            : -webkit-box;
	word-break         : break-word;
	font-size          : 0.85em;
	opacity            : 0.7;
	margin-top         : calc(var(--margin) / 4);
	-webkit-line-clamp : 2;
	-webkit-line-break : after-white-space;
	-webkit-box-orient : vertical;
	white-space        : normal;
	overflow           : hidden;
	min-height         : calc(0.85em * 1.5 * 2);
`;

export const TagCardMeta = styled.div.attrs({'data-widget': 'tag-card-meta'})`
	display    : flex;
	flex-wrap  : wrap;
	gap        : calc(var(--margin) / 2);
	font-size   : 0.8em;
	opacity     : 0.7;
	margin-top  : calc(var(--margin) / 2);
`;

export const TagCardMetaItem = styled.span.attrs({'data-widget': 'tag-card-meta-item'})`
	display        : flex;
	align-items    : center;
	gap            : 4px;
	padding        : 2px calc(var(--margin) / 4);
	border-radius  : calc(var(--border-radius) / 2);
	background     : var(--light-color, rgba(0, 0, 0, 0.04));
	white-space    : nowrap;
`;

export const TagCardActions = styled.div.attrs({'data-widget': 'tag-card-actions'})`
	display        : flex;
	gap            : 8px;
	padding        : calc(var(--margin) / 4) var(--margin);
	border-top     : var(--border);
	background     : var(--light-color, rgba(0, 0, 0, 0.04));
`;

export const TagCardEditBtn = styled.button.attrs({'data-widget': 'tag-card-edit-btn'})`
	background    : transparent;
	border        : var(--border);
	border-radius : var(--border-radius);
	padding       : 4px 12px;
	cursor        : pointer;
	font-size     : 12px;
	transition    : background 150ms ease;

	&:hover {
		background : var(--bg-color);
	}
`;

export const TagCardDeleteBtn = styled.button.attrs({'data-widget': 'tag-card-delete-btn'})`
	background    : #ff4d4f;
	color         : white;
	border        : none;
	border-radius : var(--border-radius);
	padding       : 4px 12px;
	cursor        : pointer;
	font-size     : 12px;
	transition    : opacity 150ms ease;

	&:hover {
		opacity : 0.85;
	}
`;

export const TagNoData = styled.div`
	display      : flex;
	align-items  : center;
	justify-content : center;
	height       : 200px;
	opacity      : 0.5;
	font-size    : 14px;
`;

// ── Editor Overlay ──────────────────────────────────────────────

export const TagEditorOverlay = styled.div.attrs({'data-widget': 'tag-editor-overlay'})`
	position        : fixed;
	top             : 0;
	left            : 0;
	right           : 0;
	bottom          : 0;
	background      : rgba(0, 0, 0, 0.3);
	z-index         : 1000;
	display         : flex;
	align-items     : flex-start;
	justify-content : center;
	overflow-y      : auto;
	padding-top     : 10vh;
	padding-bottom  : 10vh;
`;

export const TagEditorPanel = styled.div.attrs({'data-widget': 'tag-editor-panel'})`
	background    : var(--bg-color);
	border-radius : calc(var(--border-radius) * 2);
	box-shadow    : 0 8px 32px rgba(0, 0, 0, 0.2);
	padding       : var(--margin);
	width         : 420px;
	max-height    : 80vh;
	overflow-y    : auto;
`;

export const TagEditorTitle = styled.h3.attrs({'data-widget': 'tag-editor-title'})`
	margin      : 0 0 calc(var(--margin) / 2) 0;
	font-size   : 1.1em;
	font-weight  : var(--font-bold);
`;

export const TagEditorField = styled.div.attrs({'data-widget': 'tag-editor-field'})`
	margin-bottom : calc(var(--margin) / 2);
`;

export const TagEditorLabel = styled.label.attrs({'data-widget': 'tag-editor-label'})`
	font-size   : 12px;
	font-weight : var(--font-demi-bold);
	margin-bottom : 4px;
	display     : block;
	color       : var(--text-secondary);
`;

export const TagEditorInput = styled.input.attrs({'data-widget': 'tag-editor-input'})`
	height     : var(--height);
	padding    : 0 8px;
	border     : var(--border);
	border-radius : var(--border-radius);
	font-size  : 14px;
	outline    : none;
	width      : 100%;
`;

export const TagEditorTextarea = styled.textarea.attrs({'data-widget': 'tag-editor-textarea'})`
	padding      : 8px;
	border       : var(--border);
	border-radius : var(--border-radius);
	font-size    : 14px;
	outline      : none;
	resize       : vertical;
	min-height   : 60px;
	width        : 100%;
`;

export const TagEditorColorPicker = styled.div.attrs({'data-widget': 'tag-editor-color-picker'})`
	display  : flex;
	flex-wrap: wrap;
	gap      : 6px;
`;

export const TagEditorColorSwatch = styled.div<{ $color: string; $selected: boolean }>`
	width        : 24px;
	height       : 24px;
	border-radius : 4px;
	background   : ${props => props.$color};
	cursor      : pointer;
	border      : ${props => props.$selected ? '2px solid #000' : '2px solid transparent'};
	transform   : ${props => props.$selected ? 'scale(1.1)' : 'scale(1)'};
	transition  : all 150ms ease;
`;

export const TagEditorColorInput = styled.input.attrs({'data-widget': 'tag-editor-color-input'})`
	width        : 120px;
	height       : var(--height);
	padding      : 0 8px;
	border       : var(--border);
	border-radius : var(--border-radius);
	font-size    : 14px;
	margin-top   : 8px;
`;

export const TagEditorActions = styled.div.attrs({'data-widget': 'tag-editor-actions'})`
	display        : flex;
	justify-content : flex-end;
	gap            : 8px;
	margin-top     : var(--margin);
`;

export const TagEditorCancelBtn = styled.button.attrs({'data-widget': 'tag-editor-cancel-btn'})`
	background    : transparent;
	border        : var(--border);
	border-radius : var(--border-radius);
	padding       : 6px 16px;
	cursor        : pointer;
	font-size     : 13px;
`;

export const TagEditorSaveBtn = styled.button.attrs<{ disabled?: boolean }>(
	{'data-widget': 'tag-editor-save-btn'}
)`
	background    : var(--primary-color);
	color         : white;
	border        : none;
	border-radius : var(--border-radius);
	padding       : 6px 16px;
	cursor        : pointer;
	font-size     : 13px;
	opacity       : ${props => props.disabled ? 0.5 : 1};
	pointer-events: ${props => props.disabled ? 'none' : 'auto'};
`;
