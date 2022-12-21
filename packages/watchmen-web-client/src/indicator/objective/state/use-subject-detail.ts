import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {useState} from 'react';

export const useSubjectDetail = () => {
	const [subjects, setSubjects] = useState<Array<SubjectForIndicator>>([]);

};