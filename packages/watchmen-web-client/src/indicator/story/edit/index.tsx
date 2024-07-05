import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {usePrepareStory} from "@/indicator/story/edit/state";

export const StoryEditor = () => {
    const {initialized,stories } = usePrepareStory();
    if (!initialized || stories == null) {
        return null;
    }

    // render when all reference data ready
    return <FixWidthPage>
        {/*<ObjectiveValuesHandler objective={objective}/>*/}
        <PageHeader title={Lang.INDICATOR.CONVERGENCE.TITLE}/>

    </FixWidthPage>;
};
