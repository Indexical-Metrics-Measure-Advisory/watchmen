import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import styled from 'styled-components';
import {ICON_VOLUME_DECREASE, ICON_VOLUME_INCREASE, ICON_VOLUME_NO_CHANGE} from '../basic/constants';
import {BetterThanBase, VolumeChange} from '../objective/utils';

const VolumeChangeIcons: Record<VolumeChange, IconDefinition> = {
	[VolumeChange.INCREASE]: ICON_VOLUME_INCREASE,
	[VolumeChange.DECREASE]: ICON_VOLUME_DECREASE,
	[VolumeChange.KEEP]: ICON_VOLUME_NO_CHANGE
};

const Icon = styled(FontAwesomeIcon)`
	&[data-better=true] {
		color : var(--success-color);
	}
	&[data-better=false] {
		color : var(--danger-color);
	}
	&[data-better=keep] {
		opacity : 0.7;
	}
`;

export const ObjectiveValueGrowthIcon = (props: { volume?: VolumeChange, better?: BetterThanBase }) => {
	const {volume, better} = props;

	if (volume == null) {
		return null;
	}

	return <Icon icon={VolumeChangeIcons[volume]} data-better={better}/>;
};