import {isPiiClassificationEnabled, setPiiClassificationEnabled} from '@/feature-switch';
import {SettingsSection, SettingsSectionBody, SettingsSectionTitle} from '@/widgets/basic/settings/settings-section';
import {Toggle} from '@/widgets/basic/toggle';
import React, {useState} from 'react';

export const ClassificationSettings = () => {
	const [enabled, setEnabled] = useState(isPiiClassificationEnabled());

	const onChange = (value: boolean) => {
		setPiiClassificationEnabled(value);
		setEnabled(value);
	};

	return <SettingsSection>
		<SettingsSectionTitle>Data Classification</SettingsSectionTitle>
		<SettingsSectionBody>
			<div style={{display: 'flex', alignItems: 'center', gridGap: 'calc(var(--margin) / 3)'}}>
				<Toggle value={enabled} onChange={onChange}/>
				<span style={{opacity: 0.75}}>
					Show the Data Classification (PII) page in the side menu. Off by default.
				</span>
			</div>
		</SettingsSectionBody>
	</SettingsSection>;
};
