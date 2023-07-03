import {getHelpButtonTimeout, getHelpButtonVisibleDelay} from '@/feature-switch';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import hotkeys from 'hotkeys-js';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {ICON_EXTERNAL_LINK, ICON_HELP} from '../basic/constants';
import {ButtonInk} from '../basic/types';
import {useEventBus} from '../events/event-bus';
import {EventTypes} from '../events/types';
import {Lang} from '../langs';
import {
	HelpContainer,
	HelpDialogBody,
	HelpDialogButtons,
	HelpDialogCloseButton,
	HelpDialogSearchInput,
	HelpDialogSearchResultItem,
	HelpDialogSearchResults,
	HelpDialogVersionLabel,
	HelpIcon,
	HelpLabel
} from './widgets';

// enable hotkeys in anything
hotkeys.filter = () => {
	return true;
};

export enum HELP_KEYS {
	ADMIN_TENANT = 'data zone',
	ADMIN_DATA_SOURCE = 'data source',
	ADMIN_EXTERNAL_WRITER = 'external writer',
	ADMIN_PLUGIN = 'plugin',
	ADMIN_USER = 'user',
	ADMIN_USER_GROUP = 'user group',
	ADMIN_SPACE = 'space',
	ADMIN_ENUM = 'enumeration',
	ADMIN_TOPIC = 'topic',
	ADMIN_PIPELINE = 'pipeline',
	ADMIN_SIMULATOR = 'simulator',
	ADMIN_MONITOR_LOGS = 'monitor logs',
	ADMIN_DASHBOARD = 'dashboard',
	CONSOLE_HOME = 'console home',
	CONSOLE_CONNECTED_SPACE = 'connected space',
	CONSOLE_SUBJECT = 'subject',
	CONSOLE_REPORT = 'report',
	CONSOLE_DASHBOARD = 'dashboard',
	DQC_STATISTICS = 'statistics',
	DQC_MONITOR_RULES = 'monitor rules',
	DQC_CONSANGUINITY = 'consanguinity',
	DQC_CATALOG = 'catalog',
	IDW_BUCKET = 'bucket',
	IDW_INDICATOR = 'indicator',
	IDW_OBJECTIVE = 'objective',
	IDW_CONVERGENCE = 'convergence',
	SETTINGS = 'settings'
}

type MatchedItem = {
	name: string;
	url: string;
}

const CONTENTS: Array<{ words: string, name: string, url: string }> = [
	{words: 'admin data zone 管理员 数据区域', name: 'Admin / Data Zone', url: 'admin/data-zone'},
	{words: 'admin data source 管理员 数据源 数据库/存储', name: 'Admin / Data Source', url: 'admin/data-source'},
	{
		words: 'admin external writer 管理员 外部 写 输出数据',
		name: 'Admin / External Writer',
		url: 'admin/external-writer'
	},
	{words: 'admin user 管理员 用户 账号', name: 'Admin / User', url: 'admin/user'},
	{words: 'admin user group 管理员 用户组 账号组', name: 'Admin / User Group', url: 'admin/user-group'},
	{words: 'admin space 管理员 空间 数据集 用户组', name: 'Admin / Space', url: 'admin/space'},
	{
		words: 'admin enumeration export import upload download 管理员 枚举 导入 导出 上传 下载',
		name: 'Admin / Enumeration',
		url: 'admin/enumeration'
	},
	{
		words: 'admin topic pipeline export download scripts 管理员 数据集 管道 导出 数据库 脚本',
		name: 'Admin / Topic',
		url: 'admin/topic'
	},
	{
		words: 'admin topic pipeline export import upload download 管理员 数据集 管道 导入 导出 上传 下载',
		name: 'Admin / Pipeline',
		url: 'admin/pipeline'
	},
	{
		words: 'admin topic pipeline simulator 管理员 数据集 管道 模拟器',
		name: 'Admin / Simulator',
		url: 'admin/simulator'
	},
	{
		words: 'admin topic pipeline monitor logs 管理员 数据集 管道 执行日志',
		name: 'Admin / Monitor Logs',
		url: 'admin/monitor-logs'
	},
	{words: 'admin dashboard 管理员 仪表盘', name: 'Admin / Dashboard', url: 'admin/dashboard'},
	{words: 'console home 控制台 首页', name: 'Console / Home', url: 'console/console-home'},
	{
		words: 'console connected spaces 控制台 工作空间',
		name: 'Console / Connected Space',
		url: 'console/console-connected-space'
	},
	{words: 'console subject 控制台 主题', name: 'Console / Subject', url: 'console/console-subject'},
	{
		words: 'console subject report chart 控制台 主题 报表 图表',
		name: 'Console / Report',
		url: 'console/console-report'
	},
	{words: 'console dashboard 控制台 仪表盘', name: 'Console / Dashboard', url: 'console/dashboard'},
	{
		words: 'dqc data quality center status statistics 数据监控中心 状态',
		name: 'DQC / Statistics',
		url: 'dqc/run-statistics'
	},
	{
		words: 'dqc data quality center monitor rules 数据监控中心 规则',
		name: 'DQC / Monitor Rules',
		url: 'dqc/monitor-rules'
	},
	{
		words: 'dqc data quality center consanguinity 数据监控中心 血缘',
		name: 'DQC / Consanguinity',
		url: 'dqc/consanguinity'
	},
	{words: 'dqc data quality center catalog 数据监控中心 目录', name: 'DQC / Catalog', url: 'dqc/catalog'},
	{words: 'indicator bucket 指标 分桶', name: 'Indicator / Bucket', url: 'indicator/bucket'},
	{words: 'indicator 指标', name: 'Indicator / Indicator', url: 'indicator/indicator'},
	{
		words: 'indicator inspection achievement objective analysis perspective 指标 洞察 业绩 目标 分析 视角 观点',
		name: 'Indicator / Objective',
		url: 'indicator/objective'
	},
	{words: 'settings configuration options 设置 配置', name: 'Settings', url: 'web-client-index#language'}
];

const match = (text?: string): Array<MatchedItem> => {
	text = (text || '').toLowerCase();
	const [major, minor] = (process.env.REACT_APP_VERSION || '').split('.');
	if (text.length === 0) {
		return CONTENTS.map(item => {
			return {name: item.name, url: `https://imma-watchmen.com/docs/${major}.${minor}/web-client/${item.url}`};
		});
	} else {
		return CONTENTS.filter(item => {
			return item.words.includes(text as string);
		}).map(item => {
			return {name: item.name, url: `https://imma-watchmen.com/docs/${major}.${minor}/web-client/${item.url}`};
		});
	}
};

const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

const HelpDialog = (props: { text?: string }) => {
	const {text} = props;

	const {fire} = useEventBus();
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchText, setSearchText] = useState(text ?? '');
	const [matchedItems, setMatchedItems] = useState<Array<MatchedItem>>(match(text));
	useEffect(() => {
		if (inputRef != null && inputRef.current != null) {
			inputRef.current.focus();
		}
	});

	const onTextChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		if (value === searchText) {
			return;
		}

		setSearchText(value);
		setMatchedItems(match(value.trim()));
	};
	const onItemClicked = (item: MatchedItem) => () => {
		window.open(item.url);
	};
	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <HelpDialogBody>
		<HelpDialogSearchInput value={searchText} onChange={onTextChanged} ref={inputRef}/>
		<HelpDialogSearchResults>
			{matchedItems.length === 0
				? <HelpDialogSearchResultItem>No matched.</HelpDialogSearchResultItem>
				: matchedItems.map(item => {
					return <HelpDialogSearchResultItem onClick={onItemClicked(item)} key={item.name}>
						<span>{item.name}</span>
						<FontAwesomeIcon icon={ICON_EXTERNAL_LINK}/>
					</HelpDialogSearchResultItem>;
				})}
		</HelpDialogSearchResults>
		<HelpDialogButtons>
			<HelpDialogVersionLabel>Watchmen Web Client, Ver. {process.env.REACT_APP_VERSION}</HelpDialogVersionLabel>
			<HelpDialogCloseButton ink={ButtonInk.PRIMARY} onClick={onCloseClicked}>
				{Lang.ACTIONS.CLOSE}
			</HelpDialogCloseButton>
		</HelpDialogButtons>
	</HelpDialogBody>;
};
const showHelpDialog = (fire: Function, key: string) => {
	fire(EventTypes.SHOW_DIALOG, <HelpDialog text={key}/>,
		{
			marginTop: '10vh',
			marginLeft: '20%',
			width: '60%',
			maxHeight: '80vh'
		});
};
export const HelpButton = () => {
	const {on, off, fire} = useEventBus();
	const [state, setState] = useState({key: '', visible: false});
	useEffect(() => {
		const onShowHelp = (key: string) => {
			setState({key, visible: true});
		};
		const onHelpKeySwitched = (key: string) => {
			setState(state => ({key, visible: state.visible}));
		};
		on(EventTypes.SHOW_HELP, onShowHelp);
		on(EventTypes.SWITCH_HELP_KEY, onHelpKeySwitched);
		return () => {
			off(EventTypes.SHOW_HELP, onShowHelp);
			off(EventTypes.SWITCH_HELP_KEY, onHelpKeySwitched);
		};
	}, [on, off]);
	useEffect(() => {
		if (state.visible) {
			setTimeout(() => setState(state => {
				return {...state, visible: false};
			}), getHelpButtonTimeout());
		}
	}, [state.visible]);

	const onHelpClicked = () => {
		showHelpDialog(fire, state.key);
	};

	return <HelpContainer visible={state.visible} onClick={onHelpClicked}>
		<HelpLabel>
			{isMacLike ? '⌘ + k' : 'CTRL + K'}
		</HelpLabel>
		<HelpIcon>
			<FontAwesomeIcon icon={ICON_HELP}/>
		</HelpIcon>
	</HelpContainer>;
};

export const useHelp = (key: string) => {
	const {fire} = useEventBus();
	useEffect(() => {
		const showHelp = () => {
			showHelpDialog(fire, key);
			return false;
		};
		hotkeys('⌃+k,⌘+k', showHelp);
		fire(EventTypes.SWITCH_HELP_KEY, key);
		return () => {
			hotkeys.unbind('⌃+k,⌘+k', showHelp);
		};
	}, [fire, key]);
	useEffect(() => {
		setTimeout(() => {
			fire(EventTypes.SHOW_HELP, key);
		}, getHelpButtonVisibleDelay());
	});
};
