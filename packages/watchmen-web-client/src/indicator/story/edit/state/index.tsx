
// import {useInitializeBuckets} from './use-initialize-buckets';
// import {useInitializeConvergence} from './use-initialize-convergence';
// import {useInitializeObjectives} from './use-initialize-objectives';

import {useInitializeStories} from "@/indicator/story/edit/state/use-initialize-stories";

export const usePrepareStory = () => {
    // init objective
    const stories = useInitializeStories();
    // then buckets
    // const bucketsInitialized = useInitializeBuckets(convergence);
    // // then objectives
    // const objectivesInitialized = useInitializeObjectives(convergence);

    return {initialized: true, stories};
};
