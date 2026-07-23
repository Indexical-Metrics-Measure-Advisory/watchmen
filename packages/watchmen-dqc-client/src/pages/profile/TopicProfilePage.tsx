import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { topicProfileService } from '@/services/topicProfileService';
import { topicService } from '@/services/topicService';

const DATE_FMT = 'yyyy-MM-dd';

/** Render one profile entry; complex values are shown as JSON. */
const renderValue = (value: any): string => {
	if (value === null || value === undefined) return '-';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
};

/** Topic profile viewer — GET /dqc/topic/profile. The backend declares
 * TopicProfile as a wide `Any` dict, so entries are rendered generically. */
const TopicProfilePage: React.FC = () => {
	const { t } = useTranslation(['dqc', 'common']);
	const [topicId, setTopicId] = useState('');
	const [date, setDate] = useState(format(new Date(), DATE_FMT));
	const [query, setQuery] = useState<{ topicId: string; date: string } | null>(null);

	const topicsQuery = useQuery({ queryKey: ['dqc', 'topics'], queryFn: () => topicService.getAllTopics() });
	const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);

	const profileQuery = useQuery({
		queryKey: ['dqc', 'topic-profile', query],
		enabled: !!query,
		queryFn: () => topicProfileService.findProfile(query!.topicId, query!.date),
	});

	React.useEffect(() => {
		if (profileQuery.isError) {
			toast.error(t('dqc:profile.loadFailed'));
		}
	}, [profileQuery.isError, t]);

	const entries = profileQuery.data ? Object.entries(profileQuery.data) : [];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="flex flex-wrap items-end gap-3 p-4">
					<div className="flex w-64 flex-col gap-1.5">
						<Label>{t('dqc:profile.selectTopic')}</Label>
						<Select value={topicId} onValueChange={setTopicId}>
							<SelectTrigger><SelectValue placeholder={t('common:selectPlaceholder')} /></SelectTrigger>
							<SelectContent>
								{topics.map((topic) => (
									<SelectItem key={topic.topicId} value={topic.topicId!}>{topic.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>{t('common:date')}</Label>
						<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
					</div>
					<Button
						onClick={() => topicId && setQuery({ topicId, date })}
						disabled={!topicId || profileQuery.isFetching}
					>
						<Search className="mr-1.5 h-4 w-4" />
						{t('dqc:profile.query')}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium">
						{topics.find((topic) => topic.topicId === query?.topicId)?.name ?? ''} {query?.date ?? ''}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{!query ? (
						<p className="p-8 text-center text-sm text-muted-foreground">{t('dqc:profile.hint')}</p>
					) : profileQuery.isLoading ? (
						<p className="p-8 text-center text-sm text-muted-foreground">{t('common:loading')}</p>
					) : entries.length === 0 ? (
						<p className="p-8 text-center text-sm text-muted-foreground">{t('dqc:profile.empty')}</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-64">{t('common:name')}</TableHead>
									<TableHead>{t('dqc:health.details')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entries.map(([key, value]) => (
									<TableRow key={key}>
										<TableCell className="align-top font-mono text-xs">{key}</TableCell>
										<TableCell className="whitespace-pre-wrap break-all text-sm">{renderValue(value)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default TopicProfilePage;
