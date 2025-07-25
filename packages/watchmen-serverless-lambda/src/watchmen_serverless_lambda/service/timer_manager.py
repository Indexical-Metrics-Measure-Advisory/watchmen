import logging
import time

from watchmen_serverless_lambda.storage import ask_file_log_service

logger = logging.getLogger(__name__)


class LambdaTimeManager:
 
    def __init__(self, context, safety_margin=60):
        self.context = context
        self.safety_margin = safety_margin
        self.start_time = time.time()
        self.state_store = ask_file_log_service()
        
    @property
    def remaining_time(self):
        """Calculate the remaining available time (in seconds)"""
        return self.context.get_remaining_time_in_millis() / 1000
    
    @property
    def is_safe(self):
        """Determine whether there is sufficient time to continue processing (considering the safety margin)"""
        return self.remaining_time > self.safety_margin
    
    def load_state(self, tenant_id: str, state_key: str):
        try:
            state = self.state_store.load_state(tenant_id, state_key)
            return state
        except Exception as e:
            logger.error(f"load state failed: {str(e)}, from begin")
    
    def save_state(self, tenant_id: str,  state_key: str, state):
        try:
            self.state_store.save_state(tenant_id, state_key, state)
        except Exception as e:
            logger.error(f"save state failed: {str(e)}")
    
    def delete_state(self, tenant_id: str, state_key: str):
        try:
            self.state_store.delete_state(tenant_id, state_key)
        except Exception as e:
            logger.error(f"save state failed: {str(e)}")
    

def get_lambda_time_manager(context):
    return LambdaTimeManager(context)