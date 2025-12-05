import styled from 'styled-components';

export const TopicDataContainer = styled.div`
	display          : flex;
	position         : absolute;
	bottom           : 0;
	left             : 0;
	width            : 100%;
	height           : 50%;
	background-color : var(--bg-color);
	border-top       : 1px solid var(--border-color);
	z-index          : 1000;
	flex-direction   : column;
	box-shadow       : var(--shadow);
`;

export const TopicDataBackdrop = styled.div`
	position         : absolute;
	top              : 0;
	left             : 0;
	width            : 100%;
	height           : 100%;
	z-index          : 999;
	background-color : transparent;
`;

export const TopicDataHeader = styled.div`
	display         : flex;
	align-items     : center;
	padding         : 0 var(--margin);
	height          : var(--header-height);
	border-bottom   : 1px solid var(--border-color);
	justify-content : space-between;
`;

export const TopicDataTitle = styled.div`
	font-family : var(--title-font-family);
	font-size   : 1.2em;
`;

export const CloseButton = styled.div`
	display         : flex;
	align-items     : center;
	justify-content : center;
	width           : var(--header-height);
	height          : var(--header-height);
	cursor          : pointer;
	transition      : all 300ms ease-in-out;
	&:hover {
		color : var(--warn-color);
	}
`;
