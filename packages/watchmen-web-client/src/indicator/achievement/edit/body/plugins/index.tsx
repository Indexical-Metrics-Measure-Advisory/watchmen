import {Achievement} from '@/services/data/tuples/achievement-types';
import {PluginsContainer, PluginsRootColumn} from './widgets';

export const Plugins = (props: {
	achievement: Achievement;
}) => {
	// const {achievement} = props;

	return <PluginsContainer>
		<PluginsRootColumn>
			{/*<MoreIndicatorsNodeContainer>*/}
			{/*	<MoreIndicatorsNode id={id} onClick={onMoreClicked} ref={ref}>*/}
			{/*		<FontAwesomeIcon icon={ICON_EXPAND_NODES}/>*/}
			{/*		{Lang.INDICATOR.ACHIEVEMENT.ADD_COMPUTE_INDICATOR}*/}
			{/*	</MoreIndicatorsNode>*/}
			{/*	{curve == null*/}
			{/*		? null*/}
			{/*		: <MoreIndicatorsCurve rect={curve}>*/}
			{/*			<g>*/}
			{/*				<path d={computeCurvePath(curve)}/>*/}
			{/*			</g>*/}
			{/*		</MoreIndicatorsCurve>}*/}
			{/*</MoreIndicatorsNodeContainer>*/}
		</PluginsRootColumn>
	</PluginsContainer>;
	// paletteId={paletteId} parentId={rootId}
	//                      achievement={achievement} candidates={state.data}/>;
};