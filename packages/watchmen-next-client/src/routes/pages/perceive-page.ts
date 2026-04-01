import {Store} from '../../state/store';
import {renderKpiBar} from '../../components/kpi-bar';
import {renderEventTimeline} from '../../components/event-timeline';
import {renderChangeDetail} from '../../components/change-detail';

export const renderPerceivePage = (store: Store) => `
	<div class="wm-perceive-page">
		<div class="wm-perceive-top">
			${renderKpiBar(store)}
		</div>
		<div class="wm-perceive-main">
			<div class="wm-perceive-timeline">${renderEventTimeline(store)}</div>
			<div class="wm-perceive-detail">${renderChangeDetail(store)}</div>
		</div>
	</div>
`;
