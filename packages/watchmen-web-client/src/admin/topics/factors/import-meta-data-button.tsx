import {CompatibleTypes, FactorType} from '@/services/data/tuples/factor-types';
import {importTopicData} from '@/services/data/tuples/topic';
import {Topic, TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {isFakedUuid} from '@/services/data/tuples/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {DropdownButtons, DropdownButtonsContainer, DwarfButton} from '@/widgets/basic/button';
import {ICON_DOWNLOAD, ICON_DROPDOWN, ICON_UPLOAD} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {
	downloadAsZip,
	uploadFile,
	UploadFileAcceptsTxtCsvJson,
	useCollapseFixedThing,
	useForceUpdate
} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {parse as parseCSV} from 'csv-parse/dist/esm';
import {stringify} from 'csv-stringify/dist/esm/sync';
import React, {MouseEvent, useEffect, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {DownloadTemplateButton} from './widgets';

export const ImportMetaDataButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const buttonRef = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireTuple} = useTupleEventBus();
	const {on, off} = useTopicEventBus();
	const [showDropdown, setShowDropdown] = useState(false);
	const forceUpdate = useForceUpdate();
	useCollapseFixedThing({
		containerRef: buttonRef,
		visible: showDropdown,
		hide: () => setShowDropdown(false)
	});
	useEffect(() => {
		const onChanged = () => {
			forceUpdate();
		};
		on(TopicEventTypes.TOPIC_TYPE_CHANGED, onChanged);
		on(TopicEventTypes.TOPIC_KIND_CHANGED, onChanged);
		on(TopicEventTypes.FACTOR_ADDED, onChanged);
		on(TopicEventTypes.FACTOR_REMOVED, onChanged);
		on(TopicEventTypes.FACTORS_IMPORTED, onChanged);
		return () => {
			off(TopicEventTypes.TOPIC_TYPE_CHANGED, onChanged);
			off(TopicEventTypes.TOPIC_KIND_CHANGED, onChanged);
			off(TopicEventTypes.FACTOR_ADDED, onChanged);
			off(TopicEventTypes.FACTOR_REMOVED, onChanged);
			off(TopicEventTypes.FACTORS_IMPORTED, onChanged);
		};
	}, [on, off, topic, forceUpdate]);

	if (topic.type !== TopicType.META || topic.kind === TopicKind.SYNONYM || (topic.factors || []).length === 0) {
		return null;
	}

	const cleanImportData = (data: Array<any>): Array<any> => {
		return data.map(row => {
			return Object.keys(row || {}).reduce((map, key) => {
				const value = row[key];
				if (value !== '' && value != null) {
					map[key] = value;
				}
				return map;
			}, {} as Record<string, any>);
		});
	};
	const onDataFileSelected = async (file: File) => {
		const name = file.name;
		try {
			switch (true) {
				case name.endsWith('.txt'):
				case name.endsWith('.csv'): {
					const content = await file.text();
					parseCSV(content, {
						columns: true,
						comment: '#',
						skipEmptyLines: true,
						skipRecordsWithError: true,
						skipRecordsWithEmptyValues: true,
						trim: true,
						autoParse: true,
						autoParseDate: true
					}, (err, data) => {
						if (err) {
							fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Failed to read data file.</AlertLabel>);
							return;
						}
						if ((data || []).length === 0) {
							fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>No items needs to be imported.</AlertLabel>);
							return;
						}

						fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
							await importTopicData(topic.topicId, cleanImportData(data));
						}, () => {
							fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data imported.</AlertLabel>);
						});
					});
					break;
				}
				case name.endsWith('.json'): {
					const content = await file.text();
					const data = JSON.parse(content);
					if ((data || []).length === 0) {
						fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>No items needs to be imported.</AlertLabel>);
						return;
					}
					fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
						await importTopicData(topic.topicId, cleanImportData(data));
					}, () => {
						fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data imported.</AlertLabel>);
					});
					break;
				}
				default:
					fireGlobal(EventTypes.SHOW_NOT_IMPLEMENT);
			}
		} catch (e: any) {
			console.groupCollapsed('Failed to import meta data from file.');
			console.error(e);
			console.groupEnd();
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{e.message ?? 'Failed to import meta data, check file format please.'}
			</AlertLabel>);
		}
	};
	const doImportData = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			'Existing data will be truncated and replaced by imported data, are you sure to continue?',
			async () => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				uploadFile(UploadFileAcceptsTxtCsvJson, onDataFileSelected);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};
	const doSaveTopic = () => {
		fireGlobal(EventTypes.HIDE_DIALOG);
		fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.SAVING);
		fireTuple(TupleEventTypes.SAVE_TUPLE, topic, (topic, saved) => {
			if (saved) {
				fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.SAVED);
				doImportData();
			} else {
				fireTuple(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
			}
		});
	};
	const onImportClicked = () => {
		const factors = topic.factors || [];
		if (factors.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please define factors first.</AlertLabel>);
			return;
		}

		if (isFakedUuid(topic)) {
			fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
				'Current topic is not persist yet, should be saved first before import data. Are you sure to save it first?',
				() => doSaveTopic(), () => fireGlobal(EventTypes.HIDE_DIALOG));
		} else {
			fireTuple(TupleEventTypes.ASK_TUPLE_STATE, (state: TupleState) => {
				if (state === TupleState.CHANGED) {
					fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
						'Current topic is changed, should be saved first before import data. Are you sure to save it first?',
						() => doSaveTopic(), () => fireGlobal(EventTypes.HIDE_DIALOG));
				} else if (state === TupleState.SAVING) {
					fireGlobal(EventTypes.SHOW_ALERT,
						<AlertLabel>
							Current topic is saving, please wait for saved and try to import again.
						</AlertLabel>);
				} else {
					doImportData();
				}
			});
		}
	};
	const onDropdownClicked = (event: MouseEvent<HTMLSpanElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setShowDropdown(true);
	};
	const onDownloadClicked = async () => {
		const factors = topic.factors || [];
		if (factors.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please define factors first.</AlertLabel>);
			return;
		}

		const sampleJson = [topic.factors.reduce((row, factor) => {
			switch (true) {
				case factor.type === FactorType.BOOLEAN:
					row[factor.name] = true;
					break;
				case factor.type === FactorType.SEQUENCE:
				case CompatibleTypes[FactorType.NUMBER].includes?.includes(factor.type):
				case CompatibleTypes[FactorType.UNSIGNED].includes?.includes(factor.type):
					row[factor.name] = 0;
					break;
				default:
					row[factor.name] = '';
					break;
			}
			return row;
		}, {} as Record<string, string | number | boolean | null>)];
		await downloadAsZip({
			'meta-data-template.csv': stringify(sampleJson, {
				columns: topic.factors.map(factor => factor.name),
				header: true
			}),
			'meta-data-template.json': JSON.stringify(sampleJson, null, '\t')
		}, 'meta-data-template.zip');
	};

	return <DropdownButtonsContainer ref={buttonRef}>
		<DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportClicked}>
			<FontAwesomeIcon icon={ICON_UPLOAD}/>
			<span>Import Meta Data</span>
			<span data-widget="dropdown-caret" onClick={onDropdownClicked}>
				<FontAwesomeIcon icon={ICON_DROPDOWN}/>
			</span>
		</DwarfButton>
		<DropdownButtons visible={showDropdown}>
			<DownloadTemplateButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>
				<FontAwesomeIcon icon={ICON_DOWNLOAD}/>
				<span>Download Template</span>
			</DownloadTemplateButton>
		</DropdownButtons>
	</DropdownButtonsContainer>;
};