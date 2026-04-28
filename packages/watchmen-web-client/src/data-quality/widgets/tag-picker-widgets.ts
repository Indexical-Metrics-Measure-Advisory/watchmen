import styled from 'styled-components';

interface TagDropdownProps {
	atBottom: boolean;
}

interface TagDropdownItemProps {
	active: boolean;
}

export const TagPickerContainer = styled.div.attrs<{ 'data-widget'?: string }>({})`
	display        : flex;
	position       : relative;
	align-items    : center;
	flex-wrap      : wrap;
	gap            : calc(var(--margin) / 4);
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2);
	border         : var(--border);
	border-radius  : var(--border-radius);
	min-height     : var(--height);
	background-color : transparent;
	cursor         : pointer;
	transition     : border-color 300ms ease-in-out;
	&:hover {
		border-color : var(--primary-color);
	}
	&[data-active=true] {
		border-color : var(--primary-color);
	}
`;

export const TagItem = styled.div.attrs<{ color: string }>({})`
	display      : flex;
	align-items  : center;
	gap           : calc(var(--margin) / 4);
	padding       : 2px 8px;
	border-radius : 12px;
	background-color : ${({color}) => color}20;
	color        : ${({color}) => color};
	font-size     : 0.9em;
	line-height   : 1.6;
	white-space   : nowrap;
`;

export const TagColorDot = styled.span.attrs<{ color: string }>({})`
	display       : inline-block;
	width         : 8px;
	height        : 8px;
	border-radius  : 50%;
	background-color : ${({color}) => color};
	flex-shrink   : 0;
`;

export const TagRemoveButton = styled.span.attrs({'data-widget': 'tag-remove'})`
	display      : inline-flex;
	align-items  : center;
	justify-content : center;
	width        : 14px;
	height       : 14px;
	border-radius : 50%;
	font-size     : 10px;
	cursor        : pointer;
	&:hover {
		background-color : rgba(0, 0, 0, 0.15);
	}
`;

export const TagDropdown = styled.div.attrs<TagDropdownProps>({
	'data-widget': 'tag-picker-dropdown'
})<TagDropdownProps>`
	display       : flex;
	flex-direction : column;
	position      : absolute;
	left          : 0;
	width         : 100%;
	max-height    : 240px;
	overflow-y    : auto;
	border        : var(--border);
	border-radius : var(--border-radius);
	background-color : var(--bg-color);
	z-index       : 1000;
	box-shadow    : 0 4px 12px rgba(0, 0, 0, 0.15);
	bottom        : ${({atBottom}) => atBottom ? '100%' : 'auto'};
	top           : ${({atBottom}) => atBottom ? 'auto' : '100%'};
`;

export const TagDropdownItem = styled.div.attrs<TagDropdownItemProps>({
	'data-widget': 'tag-dropdown-item'
})<TagDropdownItemProps>`
	display      : flex;
	align-items  : center;
	gap          : calc(var(--margin) / 2);
	padding       : 0 calc(var(--margin) / 2);
	height        : var(--height);
	cursor        : pointer;
	background-color : ${({active}) => active ? 'var(--hover-color)' : 'transparent'};
	&:hover {
		background-color : var(--hover-color);
	}
`;

export const CreateTagButton = styled.div`
	display      : flex;
	align-items  : center;
	gap          : calc(var(--margin) / 2);
	padding       : 0 calc(var(--margin) / 2);
	height        : var(--height);
	cursor        : pointer;
	color        : var(--primary-color);
	border-top   : var(--border);
	&:hover {
		background-color : var(--hover-color);
	}
`;
