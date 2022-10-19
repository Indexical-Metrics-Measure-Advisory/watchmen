from fastapi import APIRouter

from watchmen_model.common.tuple_ids import NotificationDefinitionId


router = APIRouter()


@router.get('/notify', tags=['webhook'])
def notify(notification_definition_id: NotificationDefinitionId):
	# load notification event

	# load event definition

	# load notification definition

	# check notification method

	pass



