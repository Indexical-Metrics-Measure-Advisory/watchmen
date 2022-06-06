import {Achievement} from '@/services/data/tuples/achievement-types';
import {Lang} from '@/widgets/langs';
import {useState} from 'react';
import {v4} from 'uuid';
import {IndicatorCandidate} from '../indicator-candidate';
import {MoreIndicators} from '../more-indicators';
import {HierarchicalIndicatorCategoryContent, INDICATOR_UNCLASSIFIED, IndicatorCategoryContent} from '../types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {
	IndicatorCategoryColumn,
	IndicatorCategoryContainer,
	IndicatorCategoryCurve,
	IndicatorCategoryNode,
	IndicatorCategoryNodeContainer
} from './widgets';

export const IndicatorCategory = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
	category: IndicatorCategoryContent;
}) => {
	const {paletteId, parentId, achievement, category} = props;

	const [categoryId] = useState(v4());
	const {ref, curve} = useCurve(parentId);

	const {sub: hasSubCategories, data: subCategories} = (() => {
		const children = (category as HierarchicalIndicatorCategoryContent).categories;
		return {sub: children != null && children.length !== 0, data: children || []};
	})();
	const name = category.name === INDICATOR_UNCLASSIFIED ? Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.UNCLASSIFIED_CATEGORY : category.name;

	return <IndicatorCategoryContainer>
		<IndicatorCategoryColumn>
			<IndicatorCategoryNodeContainer>
				<IndicatorCategoryNode id={categoryId} ref={ref}>
					{name}
				</IndicatorCategoryNode>
				{curve == null
					? null
					: <IndicatorCategoryCurve rect={curve}>
						<g>
							<path d={computeCurvePath(curve)}/>
						</g>
					</IndicatorCategoryCurve>}
			</IndicatorCategoryNodeContainer>
		</IndicatorCategoryColumn>
		<IndicatorCategoryColumn>
			{(category.indicators || []).map(indicator => {
				return <IndicatorCandidate paletteId={paletteId} parentId={categoryId}
				                           achievement={achievement} indicator={indicator}
				                           key={indicator.indicatorId}/>;
			})}
			{hasSubCategories
				? <MoreIndicators paletteId={paletteId} parentId={categoryId}
				                  achievement={achievement} candidates={subCategories}/>
				: null}
		</IndicatorCategoryColumn>
	</IndicatorCategoryContainer>;
};