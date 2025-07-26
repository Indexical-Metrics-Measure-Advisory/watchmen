import logging
import random
import time

import boto3
from botocore.exceptions import ClientError

retryable_errors = ('ThrottlingException', 'RequestLimitExceeded',
                    'InternalError', 'ServiceUnavailable')

class SQSSender:
    
    def __init__(self, queue_url: str, region_name: str = None,
                 max_retries: int = 5, base_delay: float = 1.0,
                 max_delay: float = 30.0, session: boto3.Session = None):
        self.queue_url = queue_url
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        
        self.logger = logging.getLogger('SQSSender')
        self.logger.setLevel(logging.INFO)
        
        if session:
            self.sqs = session.client('sqs', region_name=region_name)
        else:
            self.sqs = boto3.client('sqs', region_name=region_name)
    
    def _exponential_backoff_delay(self, attempt: int) -> float:
        delay = self.base_delay * (2 ** attempt)
        jitter = delay * random.uniform(-0.5, 0.5)
        delay_with_jitter = delay + jitter
        return min(delay_with_jitter, self.max_delay)
    
    def send_message(self, message_body: str,
                     message_attributes: dict = None,
                     group_id: str = None,
                     deduplication_id: str = None) -> dict:

        params = {
            'QueueUrl': self.queue_url,
            'MessageBody': message_body
        }
        
        if message_attributes:
            params['MessageAttributes'] = message_attributes
        if group_id:
            params['MessageGroupId'] = group_id
        if deduplication_id:
            params['MessageDeduplicationId'] = deduplication_id
        
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                response = self.sqs.send_message(**params)
                self.logger.info(f"send success，MessageId: {response['MessageId']}")
                return response
            
            except ClientError as e:
                error_code = e.response['Error']['Code']
                last_exception = e
                
                if error_code in retryable_errors:
                    delay = self._exponential_backoff_delay(attempt)
                    self.logger.warning(
                        f"sent failed(error code: {error_code})，{delay:.2f} secs retry ({attempt + 1}/{self.max_retries + 1})"
                    )
                    time.sleep(delay)
                else:
                    self.logger.error(f"send fail(can't retry error): {e}")
                    raise
            
            except Exception as e:
                last_exception = e
                delay = self._exponential_backoff_delay(attempt)
                self.logger.warning(
                    f"send fail(unknown error): {e}，{delay:.2f} secs retry ({attempt + 1}/{self.max_retries + 1})"
                )
                time.sleep(delay)
        self.logger.error(f"send fail，max retry number ({self.max_retries})")
        raise last_exception
    
    def send_batch(self, messages: list) -> tuple:
        max_batch_size = 10
        successes = []
        failures = []
        
        for i in range(0, len(messages), max_batch_size):
            batch = messages[i:i + max_batch_size]
            batch_entries = [
                {
                    'Id': msg.get('Id', str(idx)),
                    'MessageBody': msg['MessageBody'],
                    **{k: v for k, v in msg.items() if
                       k in ('MessageAttributes', 'MessageGroupId', 'MessageDeduplicationId')}
                }
                for idx, msg in enumerate(batch)
            ]
            
            for attempt in range(self.max_retries + 1):
                try:
                    response = self.sqs.send_message_batch(
                        QueueUrl=self.queue_url,
                        Entries=batch_entries
                    )
                    
                    if 'Successful' in response:
                        successes.extend(response['Successful'])
                    
                    if 'Failed' in response:
                        failed_entries = response['Failed']
                        self.logger.warning(f"batch send partial fail: {len(failed_entries)}/{len(batch_entries)}")
                        
                        messages_to_retry = []
                        
                        for failed in failed_entries:
                            if failed['Code'] in retryable_errors:
                                original_msg = next(
                                    (m for m in batch if m.get('Id', str(batch_entries.index(m))) == failed['Id']),
                                    None
                                )
                                if original_msg:
                                    messages_to_retry.append(original_msg)
                            else:
                                failures.append({
                                    'Id': failed['Id'],
                                    'Error': failed['Code'],
                                    'Message': failed['Message']
                                })
                        
                        if messages_to_retry and attempt < self.max_retries:
                            delay = self._exponential_backoff_delay(attempt)
                            self.logger.warning(
                                f"partial messages will after {delay:.2f} secs to do the retry ({attempt + 1}/{self.max_retries + 1})"
                            )
                            time.sleep(delay)
                            batch_entries = messages_to_retry
                        else:
                            failures.extend([
                                {'Id': f['Id'], 'Error': f['Code'], 'Message': f['Message']}
                                for f in failed_entries
                            ])
                            break
                    else:
                        break
                except ClientError as e:
                    error_code = e.response['Error']['Code']
                    
                    if error_code in retryable_errors and attempt < self.max_retries:
                        delay = self._exponential_backoff_delay(attempt)
                        self.logger.warning(
                            f"batch send failed(error code: {error_code})，{delay:.2f} secs retry ({attempt + 1}/{self.max_retries + 1})"
                        )
                        time.sleep(delay)
                    else:
                        # Can't retry error, or max retry number
                        self.logger.error(f"batch send failed: {e}")
                        failures.extend([
                            {'Id': entry['Id'], 'Error': error_code, 'Message': str(e)}
                            for entry in batch_entries
                        ])
                        break
                
                except Exception as e:
                    if attempt < self.max_retries:
                        delay = self._exponential_backoff_delay(attempt)
                        self.logger.warning(
                            f"batch send failed(unknown error): {e}，{delay:.2f} secs retry ({attempt + 1}/{self.max_retries + 1})"
                        )
                        time.sleep(delay)
                    else:
                        self.logger.error(f"batch send failed: {e}")
                        failures.extend([
                            {'Id': entry['Id'], 'Error': 'UnknownError', 'Message': str(e)}
                            for entry in batch_entries
                        ])
                        break
        
        return successes, failures
