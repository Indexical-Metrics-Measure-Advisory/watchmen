import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {GptProviderKind} from "@/services/data/tuples/gpt-model-types";

export const ModelProviderInput = (props: { value:GptProviderKind ,onChange:any}) => {
    const {value,onChange} = props;

    // const {fire} = usePluginEventBus();
    // const forceUpdate = useForceUpdate();
    //
    // const onTypeChange = (option: DropdownOption) => {
    //     gptModel.gptProvider = option.value as GptProviderKind;
    //     // fire(PluginEventTypes.PLUGIN_TYPE_CHANGED, plugin);
    //     // forceUpdate();
    // };



    const provider_options =
         [

            {value: 'Microsoft', label: 'Microsoft'},
            {value: 'OpenAI', label: 'OpenAI'},
            {value: 'Anthropic', label: 'Anthropic'},
            {value: 'AWS', label: 'AWS'},
            {value: 'Hugging Face', label: 'Hugging Face'},
            {value: 'Google', label: 'Google'},
            {value: 'Ollama', label: 'Ollama'}
        ]





    return <TuplePropertyDropdown value={value} options={provider_options} onChange={onChange}/>;
};