import styled from 'styled-components';
import {PaletteColumn} from '../widgets';

export const PluginsContainer = styled.div.attrs({'data-widget': 'plugins-container'})`
	display   : flex;
	position  : relative;
	flex-wrap : nowrap;
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
`;
export const PluginsRootColumn = styled(PaletteColumn).attrs({'data-widget': 'plugins-root-column'})`
	padding : 0 var(--margin);
	&:first-child {
		padding-left : 0;
	}
	&:last-child {
		padding-right : 0;
	}
`;