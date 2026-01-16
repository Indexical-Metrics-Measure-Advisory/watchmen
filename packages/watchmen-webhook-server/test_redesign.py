import sys
import asyncio
from unittest.mock import MagicMock, patch

# Ensure we can import from src
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-webhook-server/src')
# Adjust these paths if necessary based on where other packages are located relative to root
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-model/src')
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-utilities/src')
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-rest/src')
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-meta/src')
sys.path.append('/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-auth/src')

try:
    from watchmen_webhook_server.action.definition import AlertAction
    from watchmen_webhook_server.action.action_service import ActionService
    from watchmen_model.webhook.subscription_event import SubscriptionEvent
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
        eventSource='test',
        sourceId='1',
        tenantId='1'
    ) 
    
    with patch('smtplib.SMTP') as mock_smtp:
        mock_server = MagicMock()
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
        eventSource='test',
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
