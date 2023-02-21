import {Indicator, IndicatorAggregateArithmetic, IndicatorBaseOn} from '../../tuples/indicator-types';
import {getCurrentTime} from '../../utils';
import {BUCKET_AMOUNT_ID} from './mock-data-buckets';
import {MonthlyOrderPremium, Order, WeeklyOrderPremium} from './mock-data-topics';

export const INDICATOR_ORDER_PREMIUM_ID = '1';
export const INDICATOR_MONTHLY_ORDER_PREMIUM_ID = '2';
export const INDICATOR_WEEKLY_ORDER_PREMIUM_ID = '3';
export const INDICATOR_MONTHLY_ORDER_PREMIUM_ON_SUBJECT_ID = '4';

const OrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_ORDER_PREMIUM_ID,
	name: 'Order Premium',
	topicOrSubjectId: Order.topicId,
	factorId: Order.factors.find(factor => factor.name === 'premium')?.factorId,
	aggregateArithmetic: IndicatorAggregateArithmetic.SUM,
	baseOn: IndicatorBaseOn.TOPIC,
	valueBuckets: [BUCKET_AMOUNT_ID],
	category1: 'premium',
	description: `Purchase order cycle time
This is the total time spent on a purchase order throughout the process—from purchase order creation through approval, receipt, invoice generation, and payment completion. It primarily focuses on the purchase order and excludes the production and delivery of the product itself. This KPI is measured in either hours or days.

A lower cycle time indicates that you have a fast and systemized procurement team. You can also categorize suppliers based on their cycle time. For instance, suppliers with a cycle time of 4 days or less could be grouped under short while suppliers with cycle time ranging from 5-8 days could be grouped under medium and suppliers with cycle time above 8 days could be grouped under long. This metric comes in handy when you have to identify the right supplier to respond to urgent orders and fulfill them quickly.

Cost of purchase order
This KPI measures the average cost of processing a purchase order, from its creation to closing of the invoice. There’s no hard and fast rule when it comes to calculating this metric since the factors influencing the processing cost vary from firm to firm based on their size and industry. Each firm uses a different set of components to determine the average processing cost. That said, the main components used to calculate this metric are the total time spent (broken down further by tasks) and the number of staff directly or indirectly involved in each step. This is why firms that manually process purchase orders have a higher average cost compared to firms that have automated the entire process. By consistently tracking the cost of purchase orders, you can improve the efficiency of the procure-to-pay cycle, which will lead to reduced errors and lower costs.`,
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
export const MonthlyOrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_MONTHLY_ORDER_PREMIUM_ID,
	name: 'Monthly Order Premium',
	topicOrSubjectId: MonthlyOrderPremium.topicId,
	factorId: MonthlyOrderPremium.factors.find(factor => factor.name === 'premium')?.factorId,
	aggregateArithmetic: IndicatorAggregateArithmetic.SUM,
	baseOn: IndicatorBaseOn.TOPIC,
	category1: 'premium',
	category2: 'short term',
	category3: 'monthly',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
const WeeklyOrderPremiumIndicator: Indicator = {
	indicatorId: INDICATOR_WEEKLY_ORDER_PREMIUM_ID,
	name: 'Weekly Order Premium',
	topicOrSubjectId: WeeklyOrderPremium.topicId,
	factorId: WeeklyOrderPremium.factors.find(factor => factor.name === 'premium')?.factorId,
	aggregateArithmetic: IndicatorAggregateArithmetic.SUM,
	baseOn: IndicatorBaseOn.TOPIC,
	category1: 'premium',
	category2: 'short term',
	category3: 'weekly',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
const MonthlyOrderPremiumIndicatorOnSubject: Indicator = {
	indicatorId: INDICATOR_MONTHLY_ORDER_PREMIUM_ON_SUBJECT_ID,
	name: 'Monthly Order Premium On Subject',
	topicOrSubjectId: '1',
	factorId: '6', // premium
	aggregateArithmetic: IndicatorAggregateArithmetic.SUM,
	baseOn: IndicatorBaseOn.SUBJECT,
	valueBuckets: [BUCKET_AMOUNT_ID],
	category1: 'premium',
	category2: 'short term',
	category3: 'monthly',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
export const OrderPremiumIndicators = [
	OrderPremiumIndicator, MonthlyOrderPremiumIndicator, WeeklyOrderPremiumIndicator, MonthlyOrderPremiumIndicatorOnSubject];
export const DemoIndicators = [OrderPremiumIndicators].flat();