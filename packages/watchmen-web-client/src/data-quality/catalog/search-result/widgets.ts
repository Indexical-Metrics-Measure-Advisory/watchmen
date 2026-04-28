import styled from 'styled-components';

export const SearchResultContainer = styled.div.attrs({'data-widget': 'catalog-result'})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
`;
export const SearchResultTargetLabel = styled.div.attrs({'data-widget': 'catalog-result-target'})`
	display       : flex;
	align-items   : center;
	font-size     : 1.4em;
	font-weight   : var(--font-bold);
	font-variant  : petite-caps;
	height        : 40px;
	padding       : 0 var(--margin);
	border-bottom : var(--border);
	> span:first-child {
		flex-grow : 1;
	}
	> div[data-widget=dropdown] {
		width        : unset;
		min-width    : 200px;
		max-width    : 300px;
		font-size    : var(--font-size);
		font-variant : none;
		font-weight  : normal;
	}
	> button {
		margin-left : calc(var(--margin) / 4);
	}
`;
export const SearchResultBody = styled.div.attrs({
	'data-widget': 'catalog-result-body',
	'data-v-scroll': ''
})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
	height         : calc(100vh - var(--page-header-height) - 81px - 40px);
	overflow-y     : auto;
	overflow-x     : hidden;
	padding        : calc(var(--margin) / 2);
`;
export const NoData = styled.div`
	display      : flex;
	align-items  : center;
	justify-content : center;
	height       : var(--height);
	width        : 100%;
	padding      : 0 calc(var(--margin) / 2);
	> svg {
		margin-right : calc(var(--margin) / 4);
	}
`;
// Card grid container
export const CatalogCardGrid = styled.div.attrs({'data-widget': 'catalog-card-grid'})`
	display               : grid;
	grid-template-columns : repeat(auto-fill, minmax(320px, 1fr));
	gap                   : calc(var(--margin) / 2);
`;
// Card container — follows TupleCard visual style
export const CatalogCardContainer = styled.div.attrs({'data-widget': 'catalog-card'})`
	display         : flex;
	flex-direction  : column;
	padding         : calc(var(--margin) / 2) var(--margin);
	position        : relative;
	border-radius   : calc(var(--border-radius) * 2);
	box-shadow      : var(--shadow);
	cursor          : pointer;
	transition      : all 300ms ease-in-out;
	&:hover {
		box-shadow : var(--hover-shadow);
	}
	&[data-expanded=true] {
		cursor : default;
	}
	&[data-changed=true] {
		border-left : 3px solid var(--primary-color, #1890ff);
	}
`;
// Card title
export const CatalogCardTitle = styled.div.attrs({'data-widget': 'catalog-card-title'})`
	display      : flex;
	align-items  : center;
	font-family  : var(--title-font-family);
	font-size    : 1.3em;
	font-weight  : var(--font-demi-bold);
	> span {
		flex-grow     : 1;
		word-break    : break-word;
		overflow      : hidden;
		text-overflow : ellipsis;
		white-space   : nowrap;
	}
`;
// Card description (collapsed)
export const CatalogCardDescription = styled.div.attrs({'data-widget': 'catalog-card-description'})`
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
`;
// Card meta row (Topic Count / Owners / Rule Count)
export const CatalogCardMeta = styled.div.attrs({'data-widget': 'catalog-card-meta'})`
	display         : flex;
	flex-wrap       : wrap;
	gap             : calc(var(--margin) / 2);
	font-size       : 0.8em;
	opacity         : 0.7;
	margin-top      : calc(var(--margin) / 2);
`;
export const CatalogCardMetaItem = styled.div.attrs({'data-widget': 'catalog-card-meta-item'})`
	display       : flex;
	align-items   : center;
	gap           : 4px;
	padding       : 2px calc(var(--margin) / 4);
	border-radius : calc(var(--border-radius) / 2);
	background    : var(--light-color, rgba(0,0,0,0.04));
	white-space   : nowrap;
`;
// Edit cell (expanded inside card)
export const CatalogEditCell = styled.div`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	height                : 0;
	overflow              : hidden;
	&[data-expanded=true] {
		border-top : var(--border);
		height     : auto;
		padding    : calc(var(--margin) / 2) 0 0 0;
		margin-top : calc(var(--margin) / 2);
	}
	> div[data-widget=tuple-property-item-picker] {
		grid-template-rows : var(--height) 1fr;
		> div[data-widget=tuple-property-item-picker-picked-items] {
			margin-top     : 0;
			padding-bottom : 0;
		}
	}
`;
export const CatalogEditLabel = styled.div`
	display      : flex;
	position     : relative;
	align-items  : center;
	align-self   : start;
	font-variant : petite-caps;
	font-weight  : var(--font-demi-bold);
	height       : var(--height);
`;
export const CatalogEditButtons = styled.div`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto auto auto 1fr;
	align-items           : center;
	height                : var(--height);
	> button:first-child,
	> button:nth-child(3) {
		margin-right : calc(var(--margin) / 4);
		&:hover {
			z-index : 1;
		}
	}
	> button:nth-child(2):not(:last-child) {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
	> button:nth-child(3) {
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		&:after {
			content          : '';
			display          : block;
			position         : absolute;
			left             : 0;
			top              : 30%;
			width            : 1px;
			height           : 40%;
			background-color : var(--invert-color);
			opacity          : 0.7;
		}
	}
`;
