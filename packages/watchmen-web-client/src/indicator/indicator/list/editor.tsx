import {Router} from '@/routes/types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import React from 'react';
import {Redirect} from 'react-router-dom';

// noinspection JSUnusedLocalSymbols
const IndicatorEditor = (props: { indicator: Indicator }) => {
	return <Redirect to={Router.INDICATOR_INDICATOR_PREPARE}/>;
};

export const renderEditor = (indicator: Indicator) => {
	return <IndicatorEditor indicator={indicator}/>;
};
