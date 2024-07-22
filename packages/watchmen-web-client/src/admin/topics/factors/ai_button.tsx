import {Factor} from '@/services/data/tuples/factor-types';
import {askSynonymFactors} from '@/services/data/tuples/topic';
import {Topic, TopicKind} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {DropdownButtons, DropdownButtonsContainer, DwarfButton} from '@/widgets/basic/button';
import {ICON_DROPDOWN, ICON_MAGIC_SPARKLES} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useCollapseFixedThing} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useEffect, useRef, useState} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {DownloadTemplateButton} from './widgets';
import {askAIGenerateDescription, askAIGenerateFactors} from "@/services/data/ai/ask_ai";
import {AskAIGenerateFactorsResponse} from "@/services/data/ai/ask_ai_types";

export const AIModelButton = (props: { topic: Topic }) => {
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


    const onDropdownClicked = (event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setShowDropdown(true);
    };


    const onAIFactorGenerateClicked = () => {

        // call ai gpt for generate new factors , limit in 10 ~ 20
        // pass topic name , description ,and current factor name , label and desc
        fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
            'System will generate suggested factors based on current context. are you sure to continue?',
            async () => {
                fireGlobal(EventTypes.HIDE_DIALOG);
                fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
                    return await askAIGenerateFactors(topic);
                }, (ai_result: AskAIGenerateFactorsResponse) => {
                    topic.factors = ai_result.suggestionFactors;
                    fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
                });
            },
            () => fireGlobal(EventTypes.HIDE_DIALOG));
    };


    const onAIFactorGenerateDescClicked = () => {

        // call ai gpt for generate new factors , limit in 10 ~ 20
        // pass topic name , description ,and current factor name , label and desc
        fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
            'System will generate suggested factors based on current context. are you sure to continue?',
            async () => {
                fireGlobal(EventTypes.HIDE_DIALOG);
                fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
                    return await askAIGenerateDescription(topic);
                }, (ai_result: AskAIGenerateFactorsResponse) => {
                    topic.factors = ai_result.suggestionFactors;
                    fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
                });
            },
            () => fireGlobal(EventTypes.HIDE_DIALOG));
    };


    const onPIIIdentifyingClicked = () => {


        fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
            return await askSynonymFactors(topic.name, topic.dataSourceId!);
        }, (factors: Array<Factor>) => {
            topic.factors = factors;
            fire(TopicEventTypes.FACTORS_IMPORTED, topic.factors);
            fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
                Please use camel case or snake case for topic name.
            </AlertLabel>);
        });


    };

    const leadButton =
        <DwarfButton ink={ButtonInk.PRIMARY} onClick={onAIFactorGenerateClicked}>
            <FontAwesomeIcon icon={ICON_MAGIC_SPARKLES}/>
            <span>Ask AI: Generate Factors</span>
            <span data-widget="dropdown-caret" onClick={onDropdownClicked}>
				<FontAwesomeIcon icon={ICON_DROPDOWN}/>
			</span>
        </DwarfButton>;

    return <DropdownButtonsContainer ref={buttonRef}>
        {leadButton}
        <DropdownButtons visible={showDropdown}>
            <DwarfButton ink={ButtonInk.PRIMARY} onClick={onAIFactorGenerateDescClicked}>
                <FontAwesomeIcon icon={ICON_MAGIC_SPARKLES}/>
                <span>Ask AI: Generate Description</span>
            </DwarfButton>
            <DownloadTemplateButton ink={ButtonInk.PRIMARY} onClick={onPIIIdentifyingClicked}>
                <FontAwesomeIcon icon={ICON_MAGIC_SPARKLES}/>
                <span>Ask AI: Identifying PII</span>
            </DownloadTemplateButton>
        </DropdownButtons>
    </DropdownButtonsContainer>;
};