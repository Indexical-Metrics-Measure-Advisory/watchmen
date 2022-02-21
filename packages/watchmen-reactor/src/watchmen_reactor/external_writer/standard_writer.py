import logging

from requests import post

from watchmen_model.admin import PipelineTriggerType
from watchmen_reactor.common import ReactorException
from watchmen_utilities import is_not_blank, serialize_to_json
from .external_writer import ExternalWriter, ExternalWriterParams

log = logging.getLogger("app." + __name__)


class StandardExternalWriter(ExternalWriter):
	# noinspection PyMethodMayBeStatic
	async def do_run(self, params: ExternalWriterParams) -> None:
		previous_data = params.previous_data
		current_data = params.current_data
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
			'code': params.event_code,
			'current_data': current_data,
			'previous_data': previous_data,
			'trigger_type': trigger_type
		}

		headers = {'Content-Type': 'application/json'}
		if is_not_blank(params.pat):
			headers['Authorization'] = f'PAT {params.pat.strip()}'

		response = post(
			params.url,
			timeout=2,
			data=serialize_to_json(payload),
			headers=headers
		)
		if response.status_code == 200:
			logging.info(response.json())
		else:
			logging.error(response.text)

	def run(self, params: ExternalWriterParams) -> bool:
		self.do_run(params)
		return True
