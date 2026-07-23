import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const NotFoundPage: React.FC = () => {
	const { t } = useTranslation('nav');
	return (
		<div className="flex h-[60vh] flex-col items-center justify-center gap-4">
			<p className="text-lg text-muted-foreground">{t('notFound')}</p>
			<Button asChild variant="outline">
				<Link to="/">{t('backHome')}</Link>
			</Button>
		</div>
	);
};

export default NotFoundPage;
