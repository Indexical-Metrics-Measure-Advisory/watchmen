import {MonitorRuleGrade} from '@/services/data/data-quality/rule-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import styled from 'styled-components';

export const Body = styled.div.attrs({'data-widget': 'rules-body'})`
	display        : flex;
	flex-direction : column;
`;
export const SearchCriteriaContainer = styled.div.attrs({'data-widget': 'rules-search'})`
	display               : grid;
	grid-template-columns : auto auto auto 1fr auto auto;
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 4);
	padding               : calc(var(--margin) / 2) var(--margin);
	margin-bottom         : calc(var(--margin) / 2);
	border                : var(--border);
	border-radius         : calc(var(--border-radius) * 3.5);
	background-color      : var(--invert-color);
	box-shadow            : 0 1px 2px rgba(37, 38, 94, 0.04), 0 6px 18px rgba(37, 38, 94, 0.06);
	align-items           : center;
`;
export const GradePickerContainer = styled.div.attrs({'data-widget': 'rules-search-grade'})`
	display     : flex;
	align-items : center;
	> button {
		border-radius : calc(var(--height) / 2);
		//&:first-child {
		//	border-top-right-radius    : 0;
		//	border-bottom-right-radius : 0;
		//}
		//&:last-child {
		//	border-top-left-radius    : 0;
		//	border-bottom-left-radius : 0;
		//}
		> svg {
			margin-left : calc(var(--margin) / 4);
		}
	}
`;
export const SearchLabel = styled.div.attrs({'data-widget': 'rules-search-label'})`
	font-variant : petite-caps;
`;
export const OverviewContainer = styled.div.attrs({'data-widget': 'rules-overview'})`
	padding   : 0;
	margin    : 0 0 calc(var(--margin) / 2);
`;
export const SearchResultContainer = styled.div.attrs({'data-widget': 'rules-result'})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
`;
export const SearchResultTargetLabel = styled.div.attrs({'data-widget': 'rules-result-target'})`
	display       : flex;
	align-items   : center;
	font-size     : 1.15em;
	font-weight   : var(--font-demi-bold);
	height        : 40px;
	padding       : 0 calc(var(--margin) / 2);
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
export const SearchResultHeader = styled.div.attrs<{
	grade: MonitorRuleGrade.GLOBAL | MonitorRuleGrade.TOPIC
}>(({grade}) => {
	return {
		'data-widget': 'rules-result-header',
		style: {
			gridTemplateColumns: grade === MonitorRuleGrade.TOPIC ? '40px 280px 350px 85px 100px 400px' : (void 0)
		}
	};
})<{ grade: MonitorRuleGrade.GLOBAL | MonitorRuleGrade.TOPIC }>`
	display               : grid;
	grid-template-columns : 40px 350px 85px 100px;
	grid-auto-rows        : var(--height);
	border-bottom         : var(--border);
	border-bottom-width   : 2px;
	overflow-x            : hidden;
`;
export const SearchResultHeaderCell = styled.div.attrs({'data-widget': 'rules-result-header-cell'})`
	display         : flex;
	align-items     : center;
	font-size       : 0.85em;
	letter-spacing  : 0.05em;
	text-transform  : uppercase;
	font-weight     : var(--font-demi-bold);
	opacity         : 0.65;
	height          : var(--height);
	padding         : 0 calc(var(--margin) / 2);
	border-right    : var(--border);
	&:last-child {
		border-right : none;
	}
`;
export const SearchResultHeaderSeqCell = styled(SearchResultHeaderCell)`
	padding : 0 calc(var(--margin) / 4);
`;
export const SearchResultBody = styled.div.attrs({
	'data-widget': 'rules-result-body',
	'data-v-scroll': ''
})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
	/* hero header (~90px) + kpi band + criteria card replace the old page header */
	height         : calc(100vh - 90px - var(--page-header-height) - 70px - 40px - var(--height) - 2px);
	overflow-y     : auto;
	overflow-x     : hidden;
	border         : var(--border);
	border-radius  : calc(var(--border-radius) * 3.5);
	background-color : var(--invert-color);
	box-shadow     : 0 1px 2px rgba(37, 38, 94, 0.04), 0 6px 18px rgba(37, 38, 94, 0.06);
	margin-bottom  : calc(var(--margin) / 2);
`;

export const ColorfulCheckBox = styled(CheckBox).attrs(({value}) => {
	return {
		style: {
			color: value === true ? 'var(--success-color)' : 'var(--danger-color)'
		}
	};
})`
`;