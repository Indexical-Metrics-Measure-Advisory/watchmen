import sys
import asyncio
import os
from unittest.mock import MagicMock, patch

# Ensure we can import from src
base_path = '/Users/yifeng/Documents/git_watchmen/watchmen/packages'
for folder in os.listdir(base_path):
    pkg_path = os.path.join(base_path, folder, 'src')
    if os.path.exists(pkg_path):
         sys.path.append(pkg_path)

import types

# Mock watchmen_meta to avoid DB connection on import
watchmen_meta = types.ModuleType('watchmen_meta')
sys.modules['watchmen_meta'] = watchmen_meta

watchmen_meta.common = MagicMock()
sys.modules['watchmen_meta.common'] = watchmen_meta.common

watchmen_meta.admin = MagicMock()
sys.modules['watchmen_meta.admin'] = watchmen_meta.admin

watchmen_meta.webhook = types.ModuleType('watchmen_meta.webhook')
sys.modules['watchmen_meta.webhook'] = watchmen_meta.webhook
watchmen_meta.webhook.notification_definition_service = MagicMock()
sys.modules['watchmen_meta.webhook.notification_definition_service'] = watchmen_meta.webhook.notification_definition_service

watchmen_meta.webhook.subscription_event_lock_service = MagicMock()
sys.modules['watchmen_meta.webhook.subscription_event_lock_service'] = watchmen_meta.webhook.subscription_event_lock_service

watchmen_meta.webhook.subscription_event_service = MagicMock()
sys.modules['watchmen_meta.webhook.subscription_event_service'] = watchmen_meta.webhook.subscription_event_service

watchmen_meta.system = MagicMock()
sys.modules['watchmen_meta.system'] = watchmen_meta.system

watchmen_meta.console = MagicMock()
sys.modules['watchmen_meta.console'] = watchmen_meta.console

# Mock other heavy dependencies
sys.modules['dask'] = MagicMock()
sys.modules['distributed'] = MagicMock()
sys.modules['pandas'] = MagicMock()
sys.modules['numpy'] = MagicMock()

jose = types.ModuleType('jose')
sys.modules['jose'] = jose
jose.jwt = MagicMock()
sys.modules['jose.jwt'] = jose.jwt
jose.JWTError = Exception

sys.modules['passlib'] = MagicMock()
sys.modules['passlib.context'] = MagicMock()
sys.modules['bcrypt'] = MagicMock()

jsonschema = types.ModuleType('jsonschema')
sys.modules['jsonschema'] = jsonschema
jsonschema.exceptions = MagicMock()
sys.modules['jsonschema.exceptions'] = jsonschema.exceptions
jsonschema.validators = MagicMock()
sys.modules['jsonschema.validators'] = jsonschema.validators

sys.modules['bs4'] = MagicMock()
sys.modules['playwright'] = MagicMock()
sys.modules['playwright.async_api'] = MagicMock()
sys.modules['jinja2'] = MagicMock()
sys.modules['premailer'] = MagicMock()
sys.modules['pyppeteer'] = MagicMock()

try:
    from watchmen_webhook_server.action.definition import AlertAction
    from watchmen_webhook_server.action.action_service import ActionService
    from watchmen_model.webhook.subscription_event import SubscriptionEvent
    from watchmen_model.webhook.event_defination import EventSource
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

async def test_email_executor():
    print("Testing EmailExecutor...")
    service = ActionService()
    
    action = AlertAction(
        type='email',
        parameters={
            'server': 'smtp.example.com',
            'username': 'user',
            'password': 'password',
            'to': 'test@example.com',
            'subject': 'Test Alert',
            'content': 'Hello World'
        }
    )
    
    event = SubscriptionEvent(
        subscriptionEventId='123',
        eventSource=EventSource.SUBJECT,
        sourceId='1',
        tenantId='1'
    ) 
    
    with patch('smtplib.SMTP_SSL') as mock_smtp:
        mock_server = MagicMock()
        mock_server.local_hostname = 'localhost'
        mock_smtp.return_value = mock_server
        
        result = await service.notify(action, event)
        
        if result:
            print("EmailExecutor: Success")
            mock_server.login.assert_called_with('user', 'password')
            mock_server.sendmail.assert_called()
        else:
            print("EmailExecutor: Failed")

async def test_feishu_executor():
    print("Testing FeishuExecutor...")
    service = ActionService()
    
    action = AlertAction(
        type='feishu',
        parameters={
            'webhook_url': 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
            'content': 'Feishu Test'
        }
    )
    
    event = SubscriptionEvent(
        subscriptionEventId='123',
        eventSource=EventSource.SUBJECT,
        sourceId='1',
        tenantId='1'
    )
    
    with patch('requests.post') as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'code': 0}
        mock_post.return_value = mock_response
        
        result = await service.notify(action, event)
        
        if result:
            print("FeishuExecutor: Success")
            mock_post.assert_called()
        else:
            print("FeishuExecutor: Failed")

async def main():
    await test_email_executor()
    await test_feishu_executor()

if __name__ == "__main__":
    asyncio.run(main())
