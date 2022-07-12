import {Inspection} from '@/services/data/tuples/inspection-types';
import {RowOfAny} from '@/services/data/types';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes, InspectionRenderMode} from '../inspection-event-bus-types';
import {InspectionButton} from '../widgets';
import {DataToolbarContainer} from './widgets';

export const DataToolbar = (props: { inspection: Inspection }) => {
	const {inspection} = props;

	const {on, off, fire} = useInspectionEventBus();
	const [visible, setVisible] = useState(false);
	const [gridVisible, setGridVisible] = useState(true);
	const [chartsVisible, setChartsVisible] = useState(false);
	useEffect(() => {
		const onDataLoaded = (anInspection: Inspection, data: Array<RowOfAny>) => {
			if (anInspection !== inspection) {
				return;
			}

			setVisible(data.length !== 0);
		};
		on(InspectionEventTypes.DISPLAY_DATA_READY, onDataLoaded);
		return () => {
			off(InspectionEventTypes.DISPLAY_DATA_READY, onDataLoaded);
		};
	}, [on, off, inspection]);
	useEffect(() => {
		const onSwitchRenderMode = (renderMode: InspectionRenderMode) => {
			if (renderMode === InspectionRenderMode.VIEW) {
				fire(InspectionEventTypes.SET_DATA_GRID_VISIBILITY, inspection, true);
				setGridVisible(true);
			}
		};
		on(InspectionEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		return () => {
			off(InspectionEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		};
	}, [on, off, fire, inspection]);

	if (!visible) {
		return null;
	}

	const onHideDataGridClicked = () => {
		fire(InspectionEventTypes.SET_DATA_GRID_VISIBILITY, inspection, !gridVisible);
		setGridVisible(!gridVisible);
	};
	const onShowAvailableChartsClicked = () => {
		fire(InspectionEventTypes.SET_CHARTS_VISIBILITY, inspection, !chartsVisible);
		setChartsVisible(!chartsVisible);
	};
	// const onPrintClicked = () => {
	// 	window.print();
	// };

	return <DataToolbarContainer>
		<span/>
		<InspectionButton ink={gridVisible ? ButtonInk.WAIVE : ButtonInk.PRIMARY} onClick={onHideDataGridClicked}>
			{gridVisible ? Lang.INDICATOR.INSPECTION.HIDE_DATA_GRID : Lang.INDICATOR.INSPECTION.SHOW_DATA_GRID}
		</InspectionButton>
		<InspectionButton ink={chartsVisible ? ButtonInk.WAIVE : ButtonInk.PRIMARY}
		                  onClick={onShowAvailableChartsClicked}>
			{chartsVisible ? Lang.INDICATOR.INSPECTION.HIDE_AVAILABLE_CHARTS : Lang.INDICATOR.INSPECTION.SHOW_AVAILABLE_CHARTS}
		</InspectionButton>
		{/*<InspectionButton ink={ButtonInk.PRIMARY} onClick={onPrintClicked}>*/}
		{/*	{Lang.INDICATOR.INSPECTION.PRINT}*/}
		{/*</InspectionButton>*/}
	</DataToolbarContainer>;
};