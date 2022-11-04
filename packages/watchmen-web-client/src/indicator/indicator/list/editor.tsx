import {Router} from '@/routes/types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import React from 'react';
import {Navigate} from 'react-router-dom';

// noinspection JSUnusedLocalSymbols
const IndicatorEditor = (props: { indicator: Indicator }) => {
	return <Navigate to={Router.IDW_INDICATOR_EDIT}/>;
};

export const renderEditor = (indicator: Indicator) => {
	return <IndicatorEditor indicator={indicator}/>;
};
