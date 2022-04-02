import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import hotkeys from 'hotkeys-js';
import React, {ChangeEvent, useEffect, useRef, useState} from 'react';
import {ICON_HELP} from '../basic/constants';
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
	ADMIN_ENUM = 'admin/enumeration'
}

const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

const HelpDialog = (props: { text?: string }) => {
	const {text} = props;

	const {fire} = useEventBus();
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchText, setSearchText] = useState(text ?? '');
	useEffect(() => {
		if (inputRef != null && inputRef.current != null) {
			inputRef.current.focus();
		}
	});

	const onKeyChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		if (value === searchText) {
			return;
		}

		setSearchText(value);
	};
	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <HelpDialogBody>
		<HelpDialogSearchInput value={searchText} onChange={onKeyChanged} ref={inputRef}/>
		<HelpDialogSearchResults>

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
		on(EventTypes.SHOW_HELP, onShowHelp);
		return () => {
			off(EventTypes.SHOW_HELP, onShowHelp);
		};
	}, [on, off]);

	const onHelpClicked = () => {
		showHelpDialog(fire, state.key);
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
			showHelpDialog(fire, key);
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
