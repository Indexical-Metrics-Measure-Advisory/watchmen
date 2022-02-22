from logging import getLogger

from watchmen_model.admin import PipelineTriggerType
from watchmen_reactor.common import ReactorException
from watchmen_utilities import is_not_blank, serialize_to_json
from .external_writer import CreateExternalWriter, ExternalWriter, ExternalWriterParams

logger = getLogger(__name__)


class StandardExternalWriter(ExternalWriter):
	# noinspection PyMethodMayBeStatic
	async def do_run(self, params: ExternalWriterParams) -> None:
		previous_data = params.previousData
		current_data = params.currentData
		if previous_data is None and current_data is not None:
			trigger_type = PipelineTriggerType.INSERT.value
		elif previous_data is not None and current_data is not None:
			trigger_type = PipelineTriggerType.MERGE.value
		elif previous_data is not None and current_data is None:
			trigger_type = PipelineTriggerType.DELETE.value
		else:
			raise ReactorException(
				f'Fire standard external writer when previous and current are none is not supported.')
		payload = {
			'code': params.eventCode,
			'currentData': current_data,
			'previousData': previous_data,
			'triggerType': trigger_type
		}

		headers = {'Content-Type': 'application/json'}
		if is_not_blank(params.pat):
			headers['Authorization'] = f'PAT {params.pat.strip()}'

		# lazy load
		# noinspection PyPackageRequirements
		from requests import post
		response = post(
			url=params.url,
			timeout=2,
			data=serialize_to_json(payload),
			headers=headers
		)
		if response.status_code == 200:
			logger.info(response.json())
		else:
			logger.error(response.text)

	def run(self, params: ExternalWriterParams) -> bool:
		self.do_run(params)
		return True


def create_standard_writer(code: str) -> StandardExternalWriter:
	return StandardExternalWriter(code)


def register_standard_writer() -> CreateExternalWriter:
	return create_standard_writer
