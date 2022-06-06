import {RefObject, useEffect, useState} from 'react';

export enum Construct {
	ACTIVE,
	DONE,
	WAIT
}

export const useConstructed = (ref: RefObject<HTMLDivElement>, avoidScrollOnActive: boolean = false) => {
	const [constructed, setConstructed] = useState(Construct.WAIT);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (constructed === Construct.ACTIVE && !avoidScrollOnActive) {
			ref.current?.scrollIntoView({behavior: 'smooth'});
		}
		if (constructed === Construct.ACTIVE || constructed === Construct.DONE) {
			setVisible(true);
		}
	}, [constructed, ref, avoidScrollOnActive]);
	useEffect(() => {
		if (!visible) {
			setConstructed(Construct.WAIT);
		}
	}, [visible]);

	return {constructed, setConstructed, visible, setVisible};
};