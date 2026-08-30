import {Apis, get, post} from './apis';
import {generateUuid} from './tuples/utils';
import {isMockService} from './utils';
import {PublishNotificationSetting, PublishNotificationTargetType, PublishNotificationTestResult} from './publish-notification-types';

export const createEmptyPublishNotificationSetting = (): PublishNotificationSetting => ({
	settingId: generateUuid(),
	enabled: false,
	resources: [],
	type: PublishNotificationTargetType.FEISHU,
	url: '',
	secret: ''
});

export const fetchPublishNotificationSetting = async (): Promise<PublishNotificationSetting | null> => {
	if (isMockService()) {
		return new Promise<PublishNotificationSetting | null>(resolve => {
			setTimeout(() => resolve(null), 300);
		});
	} else {
		return await get({api: Apis.PUBLISH_NOTIFICATION_SETTING_GET});
	}
};

export const savePublishNotificationSetting = async (setting: PublishNotificationSetting): Promise<PublishNotificationSetting> => {
	if (isMockService()) {
		return new Promise<PublishNotificationSetting>(resolve => {
			setTimeout(() => resolve(setting), 300);
		});
	} else {
		return await post({api: Apis.PUBLISH_NOTIFICATION_SETTING_SAVE, data: setting});
	}
};

export const testPublishNotificationSetting = async (setting: PublishNotificationSetting): Promise<PublishNotificationTestResult> => {
	if (isMockService()) {
		return new Promise<PublishNotificationTestResult>(resolve => {
			setTimeout(() => resolve({success: true, message: 'Mock: test message sent.'}), 300);
		});
	} else {
		return await post({api: Apis.PUBLISH_NOTIFICATION_SETTING_TEST, data: setting});
	}
};
