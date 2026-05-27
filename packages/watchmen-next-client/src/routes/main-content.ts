import {Store} from '../state/store';
import {renderObservePage} from './pages/observe-page';
import {renderPerceivePage} from './pages/perceive-page';
import {renderIngestPage} from './pages/ingest-page';
import {renderModelPage} from './pages/model-page';
import {renderTransformPage} from './pages/transform-page';
import {renderGovernPage} from './pages/govern-page';
import {renderFeedbackPage} from './pages/feedback-page';
import {renderSettingsPage} from './pages/settings-page';

export const renderMainContent = (store: Store) => {
	const {state} = store;
	if (state.main === 'observe') {
		return renderObservePage(store);
	}
	if (state.main === 'perceive') {
		return renderPerceivePage(store);
	}
	if (state.main === 'ingest') {
		return renderIngestPage(store);
	}
	if (state.main === 'model') {
		return renderModelPage(store);
	}
	if (state.main === 'transform') {
		return renderTransformPage(store);
	}
	if (state.main === 'govern') {
		return renderGovernPage(store);
	}
	if (state.main === 'feedback') {
		return renderFeedbackPage(store);
	}
	const label = store.data.mainNav.find(item => item.key === state.main)?.label || state.main;
	return renderSettingsPage(label);
};
