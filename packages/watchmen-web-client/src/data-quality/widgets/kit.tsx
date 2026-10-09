import Color from 'color';
import React from 'react';
import styled from 'styled-components';

/**
 * Shared CRM-style visual kit for the data-quality module: pill badges, icon
 * chips, ambient page scaffold, hero header and rounded card panels.
 * All styles consume theme CSS variables so they work in both light and dark themes.
 */

/** translucent tint of a literal chart color, for pill/chip backgrounds */
export const tintOf = (base: string, alpha: number) => Color(base).alpha(alpha).rgb().string();

// ——— pill badge ———
export const Pill = styled.span.attrs<{ tone?: string }>(({tone}) => {
	return {
		'data-widget': 'dqc-pill',
		style: {
			color: tone ?? 'var(--font-color)',
			backgroundColor: tone ? tintOf(tone, 0.12) : 'var(--hover-color)'
		}
	};
})<{ tone?: string }>`
	display          : inline-flex;
	align-items      : center;
	white-space      : nowrap;
	border-radius    : 999px;
	padding          : 1px 9px;
	font-size        : 0.78em;
	font-weight      : var(--font-demi-bold);
	text-transform   : capitalize;
`;

// ——— icon chip ———
export const IconChip = styled.span.attrs<{ tone?: string }>(({tone}) => {
	return {
		'data-widget': 'dqc-icon-chip',
		style: {
			backgroundColor: tone ? tintOf(tone, 0.12) : 'var(--hover-color)',
			color: tone ?? 'var(--font-color)'
		}
	};
})<{ tone?: string }>`
	display          : inline-flex;
	align-items      : center;
	justify-content  : center;
	width            : 28px;
	height           : 28px;
	flex-shrink      : 0;
	border-radius    : 50%;
	font-size        : 1.2em;
`;

// ——— page scaffold ———
export const AmbientBody = styled.div.attrs({'data-widget': 'dqc-ambient-body'})`
	display        : flex;
	flex           : 1;
	flex-direction : column;
	padding        : calc(var(--margin) / 2);
	background-color : var(--bg-color);
	/* ambient glows behind the cards; engines without color-mix simply skip them */
	background-image :
		radial-gradient(1100px 420px at 88% -60px, color-mix(in srgb, var(--primary-color) 8%, transparent), transparent 70%),
		radial-gradient(900px 380px at 6% -80px, color-mix(in srgb, var(--success-color) 6%, transparent), transparent 70%);
`;

// ——— hero header ———
export const HeroHeader = styled.div.attrs({'data-widget': 'dqc-hero'})`
	display         : flex;
	align-items     : flex-end;
	justify-content : space-between;
	flex-wrap       : wrap;
	grid-gap        : calc(var(--margin) / 2);
	padding         : calc(var(--margin) / 4) calc(var(--margin) / 6) calc(var(--margin) / 2);
`;
export const HeroTitle = styled.div.attrs({'data-widget': 'dqc-hero-title'})`
	font-family : var(--title-font-family);
	font-size   : 2.4em;
	line-height : 1.15;
`;
export const HeroSubtitle = styled.div.attrs({'data-widget': 'dqc-hero-subtitle'})`
	opacity    : 0.65;
	font-size  : 1em;
	margin-top : 6px;
`;
export const HeroToolbar = styled.div.attrs({'data-widget': 'dqc-hero-toolbar'})`
	display        : flex;
	align-items    : center;
	grid-gap       : calc(var(--margin) / 3);
	padding-bottom : 6px;
`;
export const WindowPill = styled.span.attrs({'data-widget': 'dqc-window-pill'})`
	display          : inline-flex;
	align-items      : center;
	grid-gap         : 6px;
	padding          : 4px 12px;
	border-radius    : 999px;
	background-color : var(--hover-color);
	background-color : color-mix(in srgb, var(--primary-color) 10%, transparent);
	color            : var(--primary-color);
	font-size        : 0.9em;
	font-weight      : var(--font-demi-bold);
	white-space      : nowrap;
`;
export const QuickLink = styled.button.attrs({'data-widget': 'dqc-quick-link'})`
	display          : inline-flex;
	align-items      : center;
	grid-gap         : 6px;
	padding          : 4px 12px;
	border           : var(--border);
	border-radius    : 999px;
	background-color : transparent;
	color            : var(--font-color);
	font-family      : inherit;
	font-size        : 0.9em;
	white-space      : nowrap;
	cursor           : pointer;
	&:hover {
		border-color : var(--primary-color);
		color        : var(--primary-color);
	}
`;

// ——— card panel ———
export const CardPanel = styled.section.attrs({'data-widget': 'dqc-card-panel'})`
	display          : flex;
	flex-direction   : column;
	border           : var(--border);
	border-radius    : calc(var(--border-radius) * 3.5);
	background-color : var(--invert-color);
	box-shadow       : 0 1px 2px rgba(37, 38, 94, 0.04), 0 6px 18px rgba(37, 38, 94, 0.06);
	padding          : calc(var(--margin) / 2);
	margin-bottom    : calc(var(--margin) / 2);
`;
export const CardPanelTitleRow = styled.div.attrs({'data-widget': 'dqc-card-panel-title-row'})`
	display        : flex;
	align-items    : center;
	grid-gap       : calc(var(--margin) / 4);
	margin-bottom  : calc(var(--margin) / 3);
`;
export const CardPanelTitle = styled.div.attrs({'data-widget': 'dqc-card-panel-title'})`
	font-size   : 1.1em;
	font-weight : var(--font-demi-bold);
`;
export const CardPanelAside = styled.div.attrs({'data-widget': 'dqc-card-panel-aside'})`
	display     : flex;
	align-items : center;
	grid-gap    : calc(var(--margin) / 4);
	margin-left : auto;
`;
