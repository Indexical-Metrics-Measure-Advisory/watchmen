import json
from typing import List, Optional

from watchmen_ai.hypothesis.model.chat import ChatSession
from watchmen_auth import PrincipalService
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId, UserId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral, EntityName


class ChatSessionShaper(UserBasedTupleShaper):
    """聊天会话实体映射器"""
    
    def serialize(self, session: ChatSession) -> EntityRow:
        """将ChatSession对象序列化为数据库行"""
        row = {
            'id': session.id,
            'title': session.title,
            'messages': json.dumps([msg.model_dump() for msg in session.messages]) if session.messages else '[]',
            'analysis_type': session.analysisType,
        }
        
        row = AuditableShaper.serialize(session, row)
        row = UserBasedTupleShaper.serialize(session, row)
        return row
    
    def deserialize(self, row: EntityRow) -> ChatSession:
        """将数据库行反序列化为ChatSession对象"""
        from watchmen_ai.hypothesis.model.chat import Message, UserMessage, AssistantMessage, SystemMessage, ToolMessage, ThinkingMessage, DeveloperMessage
        
        # 解析消息JSON
        messages_json = row.get('messages', '[]')
        messages = []
        if messages_json:
            try:
                messages_data = json.loads(messages_json)
                for msg_data in messages_data:
                    # 根据消息类型创建相应的消息对象
                    msg_type = msg_data.get('type', 'user')
                    if msg_type == 'user':
                        messages.append(UserMessage(**msg_data))
                    elif msg_type == 'assistant':
                        messages.append(AssistantMessage(**msg_data))
                    elif msg_type == 'system':
                        messages.append(SystemMessage(**msg_data))
                    elif msg_type == 'tool':
                        messages.append(ToolMessage(**msg_data))
                    elif msg_type == 'thinking':
                        messages.append(ThinkingMessage(**msg_data))
                    elif msg_type == 'developer':
                        messages.append(DeveloperMessage(**msg_data))
                    else:
                        # 默认创建用户消息
                        messages.append(UserMessage(**msg_data))
            except (json.JSONDecodeError, TypeError):
                messages = []
        
        session = ChatSession(
            id=row.get('id'),
            title=row.get('title'),
            messages=messages,
            analysisType=row.get('analysis_type'),
        )
        
        # noinspection PyTypeChecker
        session: ChatSession = AuditableShaper.deserialize(row, session)
        # noinspection PyTypeChecker
        session: ChatSession = UserBasedTupleShaper.deserialize(row, session)
        
        return session


CHAT_SESSION_ENTITY_NAME = 'chat_sessions'
CHAT_SESSION_ENTITY_SHAPER = ChatSessionShaper()


class ChatSessionService(UserBasedTupleService):
    """聊天会话服务"""

    def get_storable_id_column_name(self) -> EntityName:
        return "id"

    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return CHAT_SESSION_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return CHAT_SESSION_ENTITY_SHAPER

    def get_storable_id(self, storable: ChatSession) -> str:
        return storable.id

    def set_storable_id(self, storable: ChatSession, storable_id: str) -> ChatSession:
        storable.id = storable_id
        return storable

    def find_by_user(self, user_id: UserId, tenant_id: TenantId) -> List[ChatSession]:
        """根据用户ID查找聊天会话"""
        criteria = [
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
        ]
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_id_and_user(self, session_id: str, user_id: UserId, tenant_id: TenantId) -> Optional[ChatSession]:
        """根据会话ID和用户ID查找聊天会话"""
        criteria = [
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='id'), right=session_id),
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
        ]
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def delete_by_id_and_user(self, session_id: str, user_id: UserId, tenant_id: TenantId) -> bool:
        """根据会话ID和用户ID删除聊天会话"""
        session = self.find_by_id_and_user(session_id, user_id, tenant_id)
        if session:
            self.delete_by_id(session_id)
            return True
        return False