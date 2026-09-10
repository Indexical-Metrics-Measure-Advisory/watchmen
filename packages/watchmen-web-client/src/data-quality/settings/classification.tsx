import {isPiiClassificationEnabled, setPiiClassificationEnabled} from '@/feature-switch';
import {SettingsSection, SettingsSectionBody, SettingsSectionTitle} from '@/widgets/basic/settings/settings-section';
import {Toggle} from '@/widgets/basic/toggle';
import React, {useState} from 'react';
import styled from 'styled-components';

const ClassificationRow = styled.div.attrs({'data-widget': 'dqc-classification-row'})`
	display     : flex;
	align-items : center;
	grid-gap    : calc(var(--margin) / 3);
`;
const ClassificationHint = styled.span.attrs({'data-widget': 'dqc-classification-hint'})`
	opacity : 0.75;
`;

export const ClassificationSettings = () => {
	const [enabled, setEnabled] = useState(isPiiClassificationEnabled());

	const onChange = (value: boolean) => {
		setPiiClassificationEnabled(value);
		setEnabled(value);
	};

	return <SettingsSection>
		<SettingsSectionTitle>Data Classification</SettingsSectionTitle>
		<SettingsSectionBody>
			<ClassificationRow>
				<Toggle value={enabled} onChange={onChange}/>
				<ClassificationHint>
					Show the Data Classification (PII) page in the side menu. Off by default.
				</ClassificationHint>
			</ClassificationRow>
		</SettingsSectionBody>
	</SettingsSection>;
};
