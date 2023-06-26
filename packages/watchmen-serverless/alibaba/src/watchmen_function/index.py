import oss2, json
import asyncio
import logging
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager, RestSettings
from watchmen_rest.auth_helper import register_authentication_manager
from watchmen_rest.authentication import build_authentication_manager
from watchmen_utilities import is_blank
from watchmen_storage import get_storage_based_worker_id_service


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def initialize(context):
    ask_snowflake_generator()
    print("initialize invoked")


def handler(event, context):
    evt = json.loads(event)
    creds = context.credentials
    # Required by OSS sdk
    auth = oss2.StsAuth(
        creds.access_key_id,
        creds.access_key_secret,
        creds.security_token)
    evt = evt['events'][0]
    bucket_name = evt['oss']['bucket']['name']
    endpoint = 'oss-' + evt['region'] + '.aliyuncs.com'
    bucket = oss2.Bucket(auth, endpoint, bucket_name)
    objectName = evt['oss']['object']['key']
    remote_stream = bucket.get_object(objectName)
    if not remote_stream:
        return
    remote_stream = remote_stream.read()
    topic_event = json.loads(remote_stream)
    settings = RestSettings()
    register_authentication_manager(build_authentication_manager(settings, build_find_user_by_name(), build_find_user_by_pat(), []))
    trigger_data = PipelineTriggerDataWithPAT(pat=topic_event.get('pat'), code=topic_event.get('code'), data=topic_event.get('data'))
    pat = trigger_data.pat
    if is_blank(pat):
        raise Exception('PAT not found.')
    principal_service = get_principal_by_pat(retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
    trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
    asyncio.run(try_to_invoke_pipelines(trigger_data, trace_id, principal_service))
    logger.info('done by OSS trigger handler')


def pre_stop(context):
    storage = ask_meta_storage()
    snowflake_generator = ask_snowflake_generator()
    get_storage_based_worker_id_service(storage).release_worker(snowflake_generator.dataCenterId, snowflake_generator.workerId)
    logger.info('preStop start')
