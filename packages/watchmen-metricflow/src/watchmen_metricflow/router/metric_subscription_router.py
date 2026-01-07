from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.model.metric_subscription import Subscription
from watchmen_metricflow.service.subscription_runner import SubscriptionRunner
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_subscription_service(principal_service: PrincipalService) -> SubscriptionService:
	return SubscriptionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/metricflow/subscription/analysis/{analysis_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_subscriptions_by_analysis_id(
		analysis_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Subscription]:
	"""Get all subscriptions for a specific analysis"""
	if is_blank(analysis_id):
		raise_400('Analysis id is required.')

	service = get_subscription_service(principal_service)

	def action() -> List[Subscription]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return service.find_by_analysis_id(analysis_id, tenant_id)

	return trans_readonly(service, action)


@router.get('/metricflow/subscription/{subscription_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_subscription_by_id(
		subscription_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Subscription:
	"""Get a specific subscription by id"""
	if is_blank(subscription_id):
		raise_400('Subscription id is required.')

	service = get_subscription_service(principal_service)

	def action() -> Subscription:
		subscription = service.find_by_id(subscription_id)
		if subscription is None:
			raise_404()
		return subscription

	return trans_readonly(service, action)


@router.post('/metricflow/subscription', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def create_subscription(
		subscription: Subscription,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Subscription:
	"""Create a new subscription"""
	# Set tenant ID from principal
	subscription.tenantId = principal_service.get_tenant_id()
	subscription.userId = principal_service.userId
	
	service = get_subscription_service(principal_service)
	subscription.id = str(service.snowflakeGenerator.next_id())

	def action() -> Subscription:
		return service.create(subscription)

	return trans(service, action)


@router.post('/metricflow/subscription/update', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def update_subscription(
		subscription: Subscription,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Subscription:
	"""Update an existing subscription"""
	if is_blank(subscription.id):
		raise_400('Subscription id is required.')

	# Set tenant ID from principal
	subscription.tenantId = principal_service.get_tenant_id()

	service = get_subscription_service(principal_service)

	def action() -> Subscription:
		existing_subscription = service.find_by_id(subscription.id)
		if existing_subscription is None:
			raise_404()
		
		# Ensure analysisId is not changed or handle it if allowed (usually it shouldn't change)
		# For now, just update
		return service.update(subscription)

	return trans(service, action)


@router.delete('/metricflow/subscription/delete', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def delete_subscription(
		subscription_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Subscription:
	"""Delete a subscription by id"""
	if is_blank(subscription_id):
		raise_400('Subscription id is required.')

	service = get_subscription_service(principal_service)

	def action() -> Subscription:
		# check existence
		subscription = service.find_by_id(subscription_id)
		if subscription is None:
			raise_404()
			
		service.delete(subscription_id)
		return subscription

	return trans(service, action)
	return trans(service, action)


@router.post('/metricflow/subscription/run', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def run_subscription(
		principal_service: PrincipalService = Depends(get_console_principal)
):
	"""Run subscriptions for the current tenant based on current time"""
	runner = SubscriptionRunner(principal_service)
	await runner.run()


@router.post('/metricflow/subscription/run/{subscription_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def run_subscription_by_id(
		subscription_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
):
	"""Test run a specific subscription immediately"""
	runner = SubscriptionRunner(principal_service)
	await runner.run_by_id(subscription_id)


