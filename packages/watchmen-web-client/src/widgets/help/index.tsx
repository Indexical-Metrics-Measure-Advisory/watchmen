import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import hotkeys from 'hotkeys-js';
import {useEffect, useState} from 'react';
import {ICON_HELP} from '../basic/constants';
import {useEventBus} from '../events/event-bus';
import {EventTypes} from '../events/types';
import {HelpContainer, HelpIcon, HelpLabel} from './widgets';

// enable hotkeys in anything
hotkeys.filter = () => {
	return true;
};

const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

export const HelpButton = () => {
	const {on, off} = useEventBus();
	const [state, setState] = useState({key: '', visible: false});
	useEffect(() => {
		const onShowHelp = (key: string) => {
			setState({key, visible: true});
		};
		on(EventTypes.SHOW_HELP, onShowHelp);
		return () => {
			off(EventTypes.SHOW_HELP, onShowHelp);
		};
	}, [on, off]);

	const onHelpClicked = () => {

	};
	const onAnimationEnd = () => {
		setState(state => {
			return {...state, visible: false};
		});
	};

	return <HelpContainer visible={state.visible}
	                      onClick={onHelpClicked} onAnimationEnd={onAnimationEnd}>
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
			fire(EventTypes.SHOW_HELP, key);
			return false;
		};
		hotkeys('⌃+k,⌘+k', showHelp);
		return () => {
			hotkeys.unbind('h', showHelp);
		};
	}, [fire, key]);
	useEffect(() => {
		setTimeout(() => {
			fire(EventTypes.SHOW_HELP, key);
		}, 10000);
	});
};

export enum HELP_KEYS {
	ADMIN_ENUM = 'admin/enumeration'
}