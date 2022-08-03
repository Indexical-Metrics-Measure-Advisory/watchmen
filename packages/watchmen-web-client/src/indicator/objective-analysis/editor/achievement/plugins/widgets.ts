import styled from 'styled-components';

export const PluginsContainer = styled.div.attrs({'data-widget': 'achievement-plugins'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	margin-top            : calc(var(--margin) / 2);
	font-size             : calc(var(--font-size) * 1.2);
	> span[data-widget=achievement-label] {
		align-self : start;
	}
`;
export const PluginPickContainer = styled.div.attrs({'data-widget': 'achievement-plugin-picker'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	> div[data-widget=achievement-dropdown] {
		grid-column : 1;
		min-width   : 350px;
	}
`;
