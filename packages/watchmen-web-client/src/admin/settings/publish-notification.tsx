import {createEmptyPublishNotificationSetting, fetchPublishNotificationSetting, savePublishNotificationSetting, testPublishNotificationSetting} from '@/services/data/publish-notification';
import {PublishNotificationResourceType, PublishNotificationSetting, PublishNotificationTargetType} from '@/services/data/publish-notification-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {SettingsSection, SettingsSectionBody, SettingsSectionTitle} from '@/widgets/basic/settings/settings-section';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {Toggle} from '@/widgets/basic/toggle';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';

const Label = styled.div`
	font-variant : petite-caps;
	opacity      : 0.7;
	text-align   : right;
`;
const SpanAll = styled.div`
	grid-column : span 2;
`;
const Checkboxes = styled(SpanAll)`
	display     : flex;
	align-items : center;
	gap         : calc(var(--margin) * 2);
`;
const CheckboxItem = styled.div`
	display     : flex;
	align-items : center;
	gap         : calc(var(--margin) / 4);
`;
const Buttons = styled(SpanAll)`
	display     : flex;
	align-items : center;
	gap         : calc(var(--margin) / 2);
`;

const TARGET_TYPE_OPTIONS: Array<DropdownOption> = [
	{value: PublishNotificationTargetType.FEISHU, label: 'Feishu Bot'},
	{value: PublishNotificationTargetType.WEBHOOK, label: 'Webhook (HTTP)'}
];

export const PublishNotificationSettings = () => {
	const {fire} = useEventBus();
	const [setting, setSetting] = useState<PublishNotificationSetting>(createEmptyPublishNotificationSetting());
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		(async () => {
			const setting = await fetchPublishNotificationSetting();
			if (setting != null) {
				setSetting({...createEmptyPublishNotificationSetting(), ...setting, resources: setting.resources || []});
			}
			setInitialized(true);
		})();
	}, []);

	const change = (patch: Partial<PublishNotificationSetting>) => {
		setSetting(setting => ({...setting, ...patch}));
	};
	const toggleResource = (resource: PublishNotificationResourceType) => () => {
		setSetting(setting => {
			const exists = setting.resources.includes(resource);
			return {
				...setting,
				resources: exists
					? setting.resources.filter(r => r !== resource)
					: [...setting.resources, resource]
			};
		});
	};

	const validate = (): boolean => {
		if (!setting.enabled) {
			return true;
		}
		if (setting.resources.length === 0) {
			fire(EventTypes.SHOW_ALERT, <AlertLabel>Select at least one resource (topic or pipeline).</AlertLabel>);
			return false;
		}
		if ((setting.url || '').trim().length === 0) {
			fire(EventTypes.SHOW_ALERT, <AlertLabel>Notification target url is required.</AlertLabel>);
			return false;
		}
		return true;
	};

	const onSaveClicked = () => {
		if (!validate()) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await savePublishNotificationSetting(setting),
			(saved: PublishNotificationSetting) => {
				setSetting({...createEmptyPublishNotificationSetting(), ...saved, resources: saved.resources || []});
			});
	};
	const onTestClicked = () => {
		if (!validate()) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await testPublishNotificationSetting(setting),
			(result: { success: boolean; message: string }) => {
				fire(EventTypes.SHOW_ALERT, <AlertLabel>{result.message}</AlertLabel>);
			});
	};

	if (!initialized) {
		return null;
	}

	return <SettingsSection>
		<SettingsSectionTitle>Publish Notification</SettingsSectionTitle>
		<SettingsSectionBody>
			<SpanAll>
				Notify an external system (feishu or a third-party webhook) when a topic or pipeline is published.
				Applies to the save actions on topic and pipeline administration.
			</SpanAll>
			<Label>Enabled</Label>
			<Toggle value={setting.enabled} onChange={enabled => change({enabled})}/>
			<Label>Resources</Label>
			<Checkboxes>
				<CheckboxItem>
					<CheckBox value={setting.resources.includes(PublishNotificationResourceType.TOPIC)}
					          onChange={toggleResource(PublishNotificationResourceType.TOPIC)}/>
					<span>Topic</span>
				</CheckboxItem>
				<CheckboxItem>
					<CheckBox value={setting.resources.includes(PublishNotificationResourceType.PIPELINE)}
					          onChange={toggleResource(PublishNotificationResourceType.PIPELINE)}/>
					<span>Pipeline</span>
				</CheckboxItem>
			</Checkboxes>
			<Label>Target Type</Label>
			<Dropdown value={setting.type} options={TARGET_TYPE_OPTIONS}
			          onChange={option => change({type: option.value as PublishNotificationTargetType})}/>
			<Label>URL</Label>
			<Input value={setting.url} type="text"
			       onChange={event => change({url: event.target.value})}
			       placeholder="Feishu bot webhook url, or the url of a third-party endpoint"/>
			<Label>Secret</Label>
			<Input value={setting.secret} type="password"
			       onChange={event => change({secret: event.target.value})}
			       placeholder="Optional. Feishu bot sign secret, or bearer token of the endpoint"/>
			<Buttons>
				<Button ink={ButtonInk.PRIMARY} onClick={onSaveClicked}><span>Save</span></Button>
				<Button ink={ButtonInk.WARN} onClick={onTestClicked}><span>Send Test Message</span></Button>
			</Buttons>
		</SettingsSectionBody>
	</SettingsSection>;
};
