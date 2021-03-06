import {Factor} from '@/services/data/tuples/factor-types';
import {askSynonymFactors} from '@/services/data/tuples/topic';
import {Topic, TopicKind} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {DropdownButtons, DropdownButtonsContainer, DwarfButton} from '@/widgets/basic/button';
import {ICON_DOWNLOAD, ICON_DROPDOWN, ICON_UPLOAD} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {
	downloadAsZip,
	uploadFile,
	UploadFileAcceptsJson,
	UploadFileAcceptsTxtCsvJson,
	useCollapseFixedThing
} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useEffect, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {isTopicNameInvalid} from '../utils';
import {SAMPLE_FACTORS_CSV, SAMPLE_FACTORS_JSON} from './sample-factors';
import {
	parseFactorsFromStructureCsv,
	parseFactorsFromStructureJson,
	parseFromInstanceJson
} from './topic-import-from-file';
import {DownloadTemplateButton} from './widgets';

export const FactorsImportButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const buttonRef = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTopicEventBus();
	const [showDropdown, setShowDropdown] = useState(false);
	const [isSynonym, setIsSynonym] = useState(topic.kind === TopicKind.SYNONYM);
	useEffect(() => {
		const onTopicKindChanged = () => {
			setIsSynonym(topic.kind === TopicKind.SYNONYM);
		};
		on(TopicEventTypes.TOPIC_KIND_CHANGED, onTopicKindChanged);
		return () => {
			off(TopicEventTypes.TOPIC_KIND_CHANGED, onTopicKindChanged);
		};
	}, [on, off, topic.kind]);
	useCollapseFixedThing({
		containerRef: buttonRef,
		visible: showDropdown,
		hide: () => setShowDropdown(false)
	});

	const onInstanceFileSelected = async (file: File) => {
		const name = file.name;
		try {
			switch (true) {
				case name.endsWith('.json'): {
					const content = await file.text();
					topic.factors = await parseFromInstanceJson(topic, content);
					fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
					break;
				}
				default:
					fireGlobal(EventTypes.SHOW_NOT_IMPLEMENT);
			}
		} catch (e: any) {
			console.groupCollapsed('Failed to import factors from instance json file.');
			console.error(e);
			console.groupEnd();
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{e.message ?? 'Failed to import factors, check file format please.'}
			</AlertLabel>);
		}
	};
	const onImportByInstanceClicked = () => {
		// console.log('import by instance');
		uploadFile(UploadFileAcceptsJson, onInstanceFileSelected);
	};
	const onStructureFileSelected = async (file: File) => {
		const name = file.name;
		try {
			switch (true) {
				case name.endsWith('.txt'):
				case name.endsWith('.csv'): {
					const content = await file.text();
					topic.factors = await parseFactorsFromStructureCsv(topic, content);
					fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
					break;
				}
				case name.endsWith('.json'): {
					const content = await file.text();
					topic.factors = await parseFactorsFromStructureJson(topic, content);
					fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
					break;
				}
				default:
					fireGlobal(EventTypes.SHOW_NOT_IMPLEMENT);
			}
		} catch (e: any) {
			console.groupCollapsed('Failed to import factors from structure file.');
			console.error(e);
			console.groupEnd();
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{e.message ?? 'Failed to import factors, check file format please.'}
			</AlertLabel>);
		}
	};
	const onDropdownClicked = (event: MouseEvent<HTMLSpanElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setShowDropdown(true);
	};
	const onImportByStructureClicked = () => {
		// console.log('import by structure');
		uploadFile(UploadFileAcceptsTxtCsvJson, onStructureFileSelected);
	};
	const onDownloadClicked = async () => {
		// console.log('download');
		await downloadAsZip({
			'factors-template.csv': SAMPLE_FACTORS_CSV,
			'factors-template.json': JSON.stringify(SAMPLE_FACTORS_JSON, null, '\t')
		}, 'factors-template.zip');
	};
	const onSyncWithSourceClicked = () => {
		if ((topic.name || '').trim().length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Topic name is required.</AlertLabel>);
			return;
		}
		if (isTopicNameInvalid(topic.name)) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				Please use camel case or snake case for topic name.
			</AlertLabel>);
			return;
		}
		if (topic.dataSourceId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data source is required.</AlertLabel>);
			return;
		}

		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			'Synchronize synonym topic factors will replace all existing definition, are you sure to continue?',
			async () => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
					return await askSynonymFactors(topic.name, topic.dataSourceId!);
				}, (factors: Array<Factor>) => {
					topic.factors = factors;
					fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
				});
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	const leadButton = isSynonym
		? <DwarfButton ink={ButtonInk.PRIMARY} onClick={onSyncWithSourceClicked}>
			<FontAwesomeIcon icon={ICON_UPLOAD}/>
			<span>Synchronize Factors with Source Table</span>
			<span data-widget="dropdown-caret" onClick={onDropdownClicked}>
				<FontAwesomeIcon icon={ICON_DROPDOWN}/>
			</span>
		</DwarfButton>
		: <DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportByStructureClicked}>
			<FontAwesomeIcon icon={ICON_UPLOAD}/>
			<span>Import Factors from Structure</span>
			<span data-widget="dropdown-caret" onClick={onDropdownClicked}>
				<FontAwesomeIcon icon={ICON_DROPDOWN}/>
			</span>
		</DwarfButton>;

	return <DropdownButtonsContainer ref={buttonRef}>
		{leadButton}
		<DropdownButtons visible={showDropdown}>
			{isSynonym
				? <DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportByStructureClicked}>
					<FontAwesomeIcon icon={ICON_UPLOAD}/>
					<span>Import Factors from Structure</span>
				</DwarfButton>
				: null}
			<DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportByInstanceClicked}>
				<FontAwesomeIcon icon={ICON_UPLOAD}/>
				<span>Import Factors from Instance</span>
			</DwarfButton>
			<DownloadTemplateButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>
				<FontAwesomeIcon icon={ICON_DOWNLOAD}/>
				<span>Download Structure Template</span>
			</DownloadTemplateButton>
		</DropdownButtons>
	</DropdownButtonsContainer>;
};