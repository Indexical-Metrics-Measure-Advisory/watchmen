import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {GptEventBus} from "@/admin/ai-models/gpt/gpt_model_bus_types";
import {TupleEventTypes, TupleState} from "@/widgets/tuple-workbench/tuple-event-bus-types";
import {useTupleEventBus} from "@/widgets/tuple-workbench/tuple-event-bus";

const Context = createContext<GptEventBus>({} as GptEventBus);
Context.displayName = 'GptEventBus';

export const GptModelEventBusProvider = (props: { children?: ReactNode }) => {
    const {children} = props;

    const {fire} = useTupleEventBus();

    const bus = useCreateEventBus<GptEventBus>('gpt', {
        beforeFire: () => fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED)
    });

    return <Context.Provider value={bus}>
        {children}
    </Context.Provider>;
};

export const useAIModelEventBus = () => useContext(Context);
