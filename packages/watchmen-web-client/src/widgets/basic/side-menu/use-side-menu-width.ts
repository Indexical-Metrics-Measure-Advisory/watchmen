import {useEffect, useState} from 'react';
import {useEventBus} from '../../events/event-bus';
import {EventTypes} from '../../events/types';
import {SIDE_MENU_MAX_WIDTH, SIDE_MENU_MIN_WIDTH} from '../constants';

export const useSideMenuWidth = () => {
	const {on, off, fire} = useEventBus();
	const [menuWidth, setMenuWidth] = useState(SIDE_MENU_MIN_WIDTH);
	useEffect(() => {
		const onAskMenuWidth = (onWidthGet: (width: number) => void) => {
			onWidthGet(menuWidth);
		};
		on(EventTypes.ASK_SIDE_MENU_WIDTH, onAskMenuWidth);
		return () => {
			off(EventTypes.ASK_SIDE_MENU_WIDTH, onAskMenuWidth);
		};
	}, [on, off, fire, menuWidth]);

	const onResize = (newWidth: number) => {
		const width = Math.min(Math.max(newWidth, SIDE_MENU_MIN_WIDTH), SIDE_MENU_MAX_WIDTH);
		setMenuWidth(width);
		fire(EventTypes.SIDE_MENU_RESIZED, width);
	};
	const showTooltip = menuWidth / SIDE_MENU_MIN_WIDTH <= 1.5;

	return {
		menuWidth,
		showTooltip,
		onResize
	};
};