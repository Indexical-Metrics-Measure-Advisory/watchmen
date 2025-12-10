import React from 'react';
import styled from 'styled-components';
import {getWebAppEnvironment} from '../../../feature-switch';
import {Logo} from '../logo';

// height might changed by language switching, fix it.
const SideMenuLogoContainer = styled.div.attrs({'data-widget': 'side-menu-logo'})`
	display               : grid;
	position              : relative;
	grid-template-columns : var(--side-menu-icon-size) 1fr;
	grid-column-gap       : var(--side-menu-margin);
	align-items           : center;
	align-self            : stretch;
	padding               : calc(var(--margin) / 2) var(--side-menu-margin);
	height                : 66px;
`;
const SideMenuLogoImage = styled(Logo).attrs({'data-widget': 'side-menu-logo-image'})`
	width  : var(--side-menu-icon-size);
	height : var(--side-menu-icon-size);
`;
const SideMenuLogoTitleContainer = styled.div`
	display        : flex;
	flex-direction : column;
`;
const SideMenuLogoTitle = styled.div.attrs({'data-widget': 'side-menu-logo-title'})`
	font-family  : var(--title-font-family);
	font-weight  : var(--font-bold);
	font-style   : italic;
	font-size    : 2.1em;
	font-variant : petite-caps;
	overflow-x   : hidden;
	white-space  : nowrap;
	line-height  : 1;
`;
const PlatformLabel = styled.span`
	font-size    : 0.7em;
	font-variant : petite-caps;
	opacity      : 0.7;
`;
const EnvTag = styled.div.attrs({'data-widget': 'side-menu-logo-env'})`
	font-size      : 0.8em;
	font-weight    : var(--font-bold);
	color          : var(--invert-color);
	background-color : var(--primary-color);
	padding        : 0 4px;
	border-radius  : var(--border-radius);
	align-self     : flex-start;
	margin-top     : 2px;
	text-transform : uppercase;
	&[data-env=runtime] {
		background-color : var(--success-color);
	}
`;

export const SideMenuLogo = (props: { title?: string; }) => {
	const {title = 'Watchmen'} = props;
	const env = getWebAppEnvironment();

	return <SideMenuLogoContainer>
		<SideMenuLogoImage/>
		<SideMenuLogoTitleContainer>
			<SideMenuLogoTitle>{title}</SideMenuLogoTitle>
			<PlatformLabel>Development Platform</PlatformLabel>
			{env ? <EnvTag data-env={env}>{env}</EnvTag> : null}
		</SideMenuLogoTitleContainer>
	</SideMenuLogoContainer>;
};