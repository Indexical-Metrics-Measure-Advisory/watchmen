import {RefObject, useEffect, useState} from 'react';

export const useConstructed = (ref: RefObject<HTMLDivElement>, avoidScroll?: boolean) => {
	const [constructed, setConstructed] = useState(false);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (constructed) {
			if (avoidScroll) {
				ref.current?.scrollIntoView({behavior: 'smooth'});
			}
			setVisible(true);
		}
	}, [constructed, ref]);
	useEffect(() => {
		if (!visible) {
			setConstructed(false);
		}
	}, [visible]);

	return {constructed, setConstructed, visible, setVisible};
};