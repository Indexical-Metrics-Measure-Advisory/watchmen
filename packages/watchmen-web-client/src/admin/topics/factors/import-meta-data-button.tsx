import {Topic, TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {DropdownButtons, DropdownButtonsContainer, DwarfButton} from '@/widgets/basic/button';
import {ICON_DOWNLOAD, ICON_DROPDOWN, ICON_UPLOAD} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {uploadFile, UploadFileAcceptsTxtCsvJson, useCollapseFixedThing, useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useEffect, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {DownloadTemplateButton} from './widgets';

export const ImportMetaDataButton = (props: { topic: Topic }) => {
	const {topic} = props;

	const buttonRef = useRef<HTMLDivElement>(null);
	const {fire: fireGlobal} = useEventBus();
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

	const onDataFileSelected = async (file: File) => {
		const name = file.name;
		try {
			switch (true) {
				case name.endsWith('.txt'):
				case name.endsWith('.csv'): {
					const content = await file.text();
					// topic.factors = await parseFromStructureCsv(topic, content);
					break;
				}
				case name.endsWith('.json'): {
					const content = await file.text();
					// topic.factors = await parseFromStructureJson(topic, content);
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
	const onImportClicked = () => {
		const factors = topic.factors || [];
		if (factors.length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Please define factors first.</AlertLabel>);
			return;
		}

		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			'Existing meta will be truncated and replaced by imported items, are you sure to continue?',
			async () => {
				fireGlobal(EventTypes.HIDE_DIALOG);
				uploadFile(UploadFileAcceptsTxtCsvJson, onDataFileSelected);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};
	const onDropdownClicked = (event: MouseEvent<HTMLSpanElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setShowDropdown(true);
	};
	const onDownloadClicked = async () => {
		// await downloadAsZip({
		// 	'factors-template.csv': SAMPLE_FACTORS_CSV,
		// 	'factors-template.json': JSON.stringify(SAMPLE_FACTORS_JSON, null, '\t')
		// }, 'factors-template.zip');
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