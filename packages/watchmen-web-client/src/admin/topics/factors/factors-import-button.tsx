import {Topic} from '@/services/data/tuples/topic-types';
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
import React, {MouseEvent, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {SAMPLE_FACTORS_CSV, SAMPLE_FACTORS_JSON} from './sample-factors';
import {parseFromInstanceJson, parseFromStructureCsv, parseFromStructureJson} from './topic-import-from-file';

export const FactorsImportButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const buttonRef = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useTopicEventBus();
	const [showDropdown, setShowDropdown] = useState(false);
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
					topic.factors = await parseFromStructureCsv(topic, content);
					fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
					break;
				}
				case name.endsWith('.json'): {
					const content = await file.text();
					topic.factors = await parseFromStructureJson(topic, content);
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

	return <DropdownButtonsContainer ref={buttonRef}>
		<DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportByStructureClicked}>
			<FontAwesomeIcon icon={ICON_UPLOAD}/>
			<span>Import Factors from Structure</span>
			<span data-widget="dropdown-caret" onClick={onDropdownClicked}>
				<FontAwesomeIcon icon={ICON_DROPDOWN}/>
			</span>
		</DwarfButton>
		<DropdownButtons visible={showDropdown}>
			<DwarfButton ink={ButtonInk.PRIMARY} onClick={onImportByInstanceClicked}>
				<FontAwesomeIcon icon={ICON_UPLOAD}/>
				<span>Import Factors from Instance</span>
			</DwarfButton>
			<DwarfButton ink={ButtonInk.PRIMARY} onClick={onDownloadClicked}>
				<FontAwesomeIcon icon={ICON_DOWNLOAD} style={{transform: 'scale(0.8)', transformOrigin: 'left'}}/>
				<span style={{marginLeft: '-3px'}}>Download Structure Template</span>
			</DwarfButton>
		</DropdownButtons>
	</DropdownButtonsContainer>;
};