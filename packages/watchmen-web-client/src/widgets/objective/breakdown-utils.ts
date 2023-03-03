import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {
	ComputedObjectiveParameter,
	ConditionalObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveFactorId, ObjectiveFactorOnIndicator,
	ObjectiveParameterJoint,
	ObjectiveTarget
} from '@/services/data/tuples/objective-types';
import {
	isComputedFactor,
	isComputedParameter,
	isExpressionParameter,
	isIndicatorFactor,
	isJointParameter,
	isReferParameter
} from '@/services/data/tuples/objective-utils';
import {isNotBlank} from '@/services/utils';

const findReferredFactorIdsFromJoint = (joint: ObjectiveParameterJoint, factorIds: Array<ObjectiveFactorId>) => {
	(joint.filters ?? []).forEach(condition => {
		if (isJointParameter(condition)) {
			findReferredFactorIdsFromJoint(condition, factorIds);
		} else if (isExpressionParameter(condition)) {
			if (condition.left != null && isReferParameter(condition.left)) {
				factorIds.push(condition.left.uuid);
			}
			if (condition.right != null && isReferParameter(condition.right)) {
				factorIds.push(condition.right.uuid);
			}
		}
	});
};

const findReferredFactorIdsFromComputedParameter = (parameter: ComputedObjectiveParameter, factorIds: Array<ObjectiveFactorId>) => {
	(parameter.parameters ?? []).forEach(parameter => {
		if (isReferParameter(parameter)) {
			factorIds.push(parameter.uuid);
		} else if (isComputedParameter(parameter)) {
			findReferredFactorIdsFromComputedParameter(parameter, factorIds);
		}
		if ((parameter as ConditionalObjectiveParameter).conditional
			&& (parameter as ConditionalObjectiveParameter).on != null) {
			findReferredFactorIdsFromJoint((parameter as ConditionalObjectiveParameter).on!, factorIds);
		}
	});
};

const findFactorRelations = (
	factor: ObjectiveFactor,
	allFactors: Record<ObjectiveFactorId, ObjectiveFactor>,
	usedFactors: Record<ObjectiveFactorId, ObjectiveFactor>
) => {
	if (isIndicatorFactor(factor)) {
		return;
	}
	if (isComputedFactor(factor) && factor.formula != null) {
		const usedFactorIds: Array<ObjectiveFactorId> = [];
		findReferredFactorIdsFromComputedParameter(factor.formula, usedFactorIds);
		const foundFactorIds = usedFactorIds.filter(x => isNotBlank(x)).filter(factorId => usedFactors[factorId] != null);
		const foundFactors = foundFactorIds.map(factorId => allFactors[factorId]).filter(x => x != null);
		foundFactors.forEach(factor => usedFactors[factor.uuid] = factor);
		foundFactors.forEach(factor => findFactorRelations(factor, allFactors, usedFactors));
	}
};

export const parseBreakdown = (objective: Objective, target: ObjectiveTarget): { could: boolean, indicatorId?: IndicatorId } => {
	if (target.asis == null) {
		return {could: false};
	}

	const usedFactorIds: Array<ObjectiveFactorId> = [];

	// find directly referred factor by given target
	if (typeof target.asis === 'string') {
		usedFactorIds.push(target.asis);
	} else {
		findReferredFactorIdsFromComputedParameter(target.asis, usedFactorIds);
	}

	// build all factors map
	const allFactorMap = (objective.factors || []).reduce((map, factor) => {
		map[factor.uuid] = factor;
		return map;
	}, {} as Record<ObjectiveFactorId, ObjectiveFactor>);
	// build used factors
	const usedFactors: Array<ObjectiveFactor> = usedFactorIds
		.filter(factorId => isNotBlank(factorId))
		.map(factorId => allFactorMap[factorId])
		.filter(factor => factor != null);
	// build used factors map
	const usedFactorMap = usedFactors.reduce((map, factor) => {
		map[factor.uuid] = factor;
		return map;
	}, {} as Record<ObjectiveFactorId, ObjectiveFactor>);
	// find related factors for each used factor
	usedFactors.forEach(factor => findFactorRelations(factor, allFactorMap, usedFactorMap));

	// find indicator factors
	const indicatorFactors: Array<ObjectiveFactorOnIndicator> = Object.keys(usedFactorMap)
		.map(factorId => usedFactorMap[factorId])
		.filter(factor => isIndicatorFactor(factor)) as Array<ObjectiveFactorOnIndicator>;
	// gather indicator from factors
	const indicatorIds = indicatorFactors.reduce((all, factor) => {
		if (isNotBlank(factor.indicatorId) && all.map[factor.indicatorId!] == null) {
			all.map[factor.indicatorId!] = true;
			all.ids.push(factor.indicatorId!);
		}
		return all;
	}, {map: {}, ids: []} as { map: Record<IndicatorId, true>; ids: Array<IndicatorId> }).ids;
	// only single indicator based can be breakdown
	if (indicatorIds.length === 1) {
		return {could: true, indicatorId: indicatorIds[0]};
	}
	return {could: false};
};