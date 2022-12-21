import {Topic} from '@/services/data/tuples/topic-types';
import {useState} from 'react';

export const useTopicDetail = () => {
	const [topics, setTopics] = useState<Array<Topic>>([]);

}