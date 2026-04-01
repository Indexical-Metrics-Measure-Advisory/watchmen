import {renderSimpleModulePage} from './simple-module-page';

export const renderSettingsPage = (label: string) =>
	renderSimpleModulePage(label, 'System configuration.', '');
