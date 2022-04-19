import {Indicator, IndicatorBaseOn} from '../../tuples/indicator-types';
import {getCurrentTime} from '../../utils';
import {BUCKET_AMOUNT_ID} from './mock-data-buckets';
import {MonthlyOrderPremium, Order, WeeklyOrderPremium} from './mock-data-topics';

export const INDICATOR_ORDER_PREMIUM_ID = '1';
export const INDICATOR_MONTHLY_ORDER_PREMIUM_ID = '2';
export const INDICATOR_WEEKLY_ORDER_PREMIUM_ID = '3';

const OrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_ORDER_PREMIUM_ID,
	name: 'Order Premium',
	topicOrSubjectId: Order.topicId,
	factorId: Order.factors.find(factor => factor.name === 'premium')?.factorId,
	baseOn: IndicatorBaseOn.TOPIC,
	valueBuckets: [BUCKET_AMOUNT_ID],
	category1: 'premium',
	userGroupIds: ['1', '2'],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
export const MonthlyOrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_MONTHLY_ORDER_PREMIUM_ID,
	name: 'Monthly Order Premium',
	topicOrSubjectId: MonthlyOrderPremium.topicId,
	factorId: MonthlyOrderPremium.factors.find(factor => factor.name === 'premium')?.factorId,
	baseOn: IndicatorBaseOn.TOPIC,
	category1: 'premium',
	category2: 'short term',
	category3: 'monthly',
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
const WeeklyOrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_WEEKLY_ORDER_PREMIUM_ID,
	name: 'Weekly Order Premium',
	topicOrSubjectId: WeeklyOrderPremium.topicId,
	factorId: WeeklyOrderPremium.factors.find(factor => factor.name === 'premium')?.factorId,
	baseOn: IndicatorBaseOn.TOPIC,
	category1: 'premium',
	category2: 'short term',
	category3: 'weekly',
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
export const OrderPremiumIndicators = [OrderPremiumIndicator, MonthlyOrderPremiumIndicator, WeeklyOrderPremiumIndicator];
export const DemoIndicators = [OrderPremiumIndicators].flat();