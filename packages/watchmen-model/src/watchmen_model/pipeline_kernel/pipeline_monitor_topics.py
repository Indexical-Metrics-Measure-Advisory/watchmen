from typing import List

from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind, TopicType


def ask_pipeline_monitor_topics() -> List[Topic]:
	# TODO define all pipeline monitor topics
	return [
		Topic(
			name='raw_pipeline_monitor_log',
			kind=TopicKind.SYSTEM,
			type=TopicType.RAW,
			factors=[
				Factor(factorId='rpml-f-1', name='uid', type=FactorType.TEXT),
				Factor(
					factorId='rpml-f-2', name='traceId', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_1, precision='50'),
				Factor(
					factorId='rpml-f-3', name='pipelineId', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_2, precision='50'),
				Factor(
					factorId='rpml-f-4', name='topicId', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_3, precision='50'),
				Factor(factorId='rpml-f-5', name='prerequisite', type=FactorType.BOOLEAN),
				Factor(factorId='rpml-f-6', name='prerequisiteDefinedAs', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-7', name='status', type=FactorType.TEXT, flatten=True),
				Factor(factorId='rpml-f-8', name='startTime', type=FactorType.FULL_DATETIME, flatten=True),
				Factor(factorId='rpml-f-9', name='spentInMills', type=FactorType.UNSIGNED, flatten=True),
				Factor(factorId='rpml-f-10', name='error', type=FactorType.TEXT),
				Factor(factorId='rpml-f-11', name='oldValue', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-12', name='newValue', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-13', name='stages', type=FactorType.ARRAY),
				Factor(factorId='rpml-f-14', name='stages.stageId', type=FactorType.TEXT),
				Factor(factorId='rpml-f-15', name='stages.name', type=FactorType.TEXT),
				Factor(factorId='rpml-f-16', name='stages.prerequisite', type=FactorType.BOOLEAN),
				Factor(factorId='rpml-f-17', name='stages.prerequisiteDefinedAs', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-18', name='stages.status', type=FactorType.TEXT),
				Factor(factorId='rpml-f-19', name='stages.startTime', type=FactorType.FULL_DATETIME),
				Factor(factorId='rpml-f-20', name='stages.spentInMills', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-21', name='stages.error', type=FactorType.TEXT),
				Factor(factorId='rpml-f-22', name='stages.units', type=FactorType.ARRAY),
				Factor(factorId='rpml-f-23', name='stages.units.unitId', type=FactorType.TEXT),
				Factor(factorId='rpml-f-24', name='stages.units.name', type=FactorType.TEXT),
				Factor(factorId='rpml-f-25', name='stages.units.prerequisite', type=FactorType.BOOLEAN),
				Factor(factorId='rpml-f-26', name='stages.units.prerequisiteDefinedAs', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-27', name='stages.units.loopVariableName', type=FactorType.TEXT),
				Factor(factorId='rpml-f-28', name='stages.units.loopVariableValue', type=FactorType.ARRAY),
				Factor(factorId='rpml-f-29', name='stages.units.status', type=FactorType.TEXT),
				Factor(factorId='rpml-f-30', name='stages.units.startTime', type=FactorType.FULL_DATETIME),
				Factor(factorId='rpml-f-31', name='stages.units.spentInMills', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-32', name='stages.units.error', type=FactorType.TEXT),
				Factor(factorId='rpml-f-33', name='stages.units.actions', type=FactorType.ARRAY),
				Factor(factorId='rpml-f-34', name='stages.units.actions.uid', type=FactorType.TEXT),
				Factor(factorId='rpml-f-35', name='stages.units.actions.actionId', type=FactorType.TEXT),
				Factor(factorId='rpml-f-36', name='stages.units.actions.type', type=FactorType.TEXT),
				Factor(factorId='rpml-f-37', name='stages.units.actions.insertCount', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-38', name='stages.units.actions.updateCount', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-39', name='stages.units.actions.deleteCount', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-40', name='stages.units.actions.definedAs', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-41', name='stages.units.actions.findBy', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-42', name='stages.units.actions.touched', type=FactorType.OBJECT),
				Factor(factorId='rpml-f-43', name='stages.units.actions.status', type=FactorType.TEXT),
				Factor(factorId='rpml-f-44', name='stages.units.actions.startTime', type=FactorType.FULL_DATETIME),
				Factor(factorId='rpml-f-45', name='stages.units.actions.spentInMills', type=FactorType.UNSIGNED),
				Factor(factorId='rpml-f-46', name='stages.units.actions.error', type=FactorType.TEXT),
				Factor(
					factorId='rpml-f-47', name='dataId', type=FactorType.NUMBER,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_4, precision='20'),
			],
			description='Pipeline monitor log raw topic.'
		)
	]
