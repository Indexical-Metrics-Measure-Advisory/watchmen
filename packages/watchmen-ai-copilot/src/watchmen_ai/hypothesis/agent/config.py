from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class ModelProvider(str, Enum):
    """模型提供商"""
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


class VectorStoreType(str, Enum):
    """向量存储类型"""
    CHROMA = "chroma"
    PINECONE = "pinecone"
    WEAVIATE = "weaviate"
    FAISS = "faiss"


@dataclass
class LLMConfig:
    """大语言模型配置"""
    provider: ModelProvider = ModelProvider.OPENAI
    model_name: str = "gpt-4"
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 30
    retry_attempts: int = 3


@dataclass
class RAGConfig:
    """RAG配置"""
    vector_store_type: VectorStoreType = VectorStoreType.CHROMA
    embedding_model: str = "text-embedding-ada-002"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    similarity_threshold: float = 0.7
    index_path: Optional[str] = None
    collection_name: str = "watchmen_knowledge"


@dataclass
class MCPConfig:
    """MCP连接配置"""
    server_url: str = "http://localhost:8080"
    api_key: Optional[str] = None
    timeout: int = 30
    retry_attempts: int = 3
    cache_ttl: int = 300  # 缓存时间（秒）
    batch_size: int = 100


@dataclass
class AgentConfig:
    """代理配置"""
    # 基础配置
    agent_name: str = "WatchmenChatAgent"
    version: str = "1.0.0"
    debug_mode: bool = False
    
    # 模型配置
    llm_config: LLMConfig = None
    
    # RAG配置
    rag_config: RAGConfig = None
    
    # MCP配置
    mcp_config: MCPConfig = None
    
    # 工作流配置
    max_iterations: int = 10
    timeout_seconds: int = 300
    enable_memory: bool = True
    memory_window: int = 10  # 保留的消息数量
    
    # 意图识别配置
    intent_confidence_threshold: float = 0.6
    fallback_intent: str = "general_chat"
    
    # 工具配置
    enabled_tools: List[str] = None
    tool_timeout: int = 60
    
    # 缓存配置
    enable_cache: bool = True
    cache_ttl: int = 3600
    
    # 日志配置
    log_level: str = "INFO"
    log_conversations: bool = True
    
    def __post_init__(self):
        if self.llm_config is None:
            self.llm_config = LLMConfig()
        
        if self.rag_config is None:
            self.rag_config = RAGConfig()
        
        if self.mcp_config is None:
            self.mcp_config = MCPConfig()
        
        if self.enabled_tools is None:
            self.enabled_tools = [
                "metric_query",
                "report_generation", 
                "data_exploration",
                "knowledge_search"
            ]


# 默认配置实例
DEFAULT_CONFIG = AgentConfig()


# 预定义配置模板
CONFIG_TEMPLATES = {
    "development": AgentConfig(
        debug_mode=True,
        llm_config=LLMConfig(
            temperature=0.3,
            max_tokens=1000
        ),
        log_level="DEBUG"
    ),
    
    "production": AgentConfig(
        debug_mode=False,
        llm_config=LLMConfig(
            temperature=0.7,
            max_tokens=2000,
            retry_attempts=5
        ),
        timeout_seconds=600,
        log_level="WARNING"
    ),
    
    "testing": AgentConfig(
        debug_mode=True,
        llm_config=LLMConfig(
            provider=ModelProvider.LOCAL,
            model_name="test-model",
            temperature=0.0
        ),
        enable_cache=False,
        log_conversations=False
    )
}


def get_config(template_name: str = "default") -> AgentConfig:
    """获取配置"""
    if template_name == "default":
        return DEFAULT_CONFIG
    
    if template_name in CONFIG_TEMPLATES:
        return CONFIG_TEMPLATES[template_name]
    
    raise ValueError(f"Unknown config template: {template_name}")


def create_custom_config(**kwargs) -> AgentConfig:
    """创建自定义配置"""
    config = AgentConfig()
    
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)
        else:
            raise ValueError(f"Unknown config parameter: {key}")
    
    return config


# 环境变量映射
ENV_VAR_MAPPING = {
    "OPENAI_API_KEY": "llm_config.api_key",
    "AZURE_OPENAI_ENDPOINT": "llm_config.api_base",
    "MCP_SERVER_URL": "mcp_config.server_url",
    "MCP_API_KEY": "mcp_config.api_key",
    "VECTOR_STORE_PATH": "rag_config.index_path",
    "AGENT_DEBUG": "debug_mode",
    "AGENT_LOG_LEVEL": "log_level"
}


def load_config_from_env() -> AgentConfig:
    """从环境变量加载配置"""
    import os
    
    config = AgentConfig()
    
    for env_var, config_path in ENV_VAR_MAPPING.items():
        value = os.getenv(env_var)
        if value is not None:
            # 解析嵌套配置路径
            parts = config_path.split('.')
            obj = config
            
            for part in parts[:-1]:
                obj = getattr(obj, part)
            
            # 类型转换
            final_key = parts[-1]
            if hasattr(obj, final_key):
                current_value = getattr(obj, final_key)
                if isinstance(current_value, bool):
                    value = value.lower() in ('true', '1', 'yes', 'on')
                elif isinstance(current_value, int):
                    value = int(value)
                elif isinstance(current_value, float):
                    value = float(value)
                
                setattr(obj, final_key, value)
    
    return config


# 配置验证
def validate_config(config: AgentConfig) -> List[str]:
    """验证配置"""
    errors = []
    
    # 验证LLM配置
    if config.llm_config.provider == ModelProvider.OPENAI and not config.llm_config.api_key:
        errors.append("OpenAI API key is required")
    
    if config.llm_config.temperature < 0 or config.llm_config.temperature > 2:
        errors.append("Temperature must be between 0 and 2")
    
    if config.llm_config.max_tokens <= 0:
        errors.append("Max tokens must be positive")
    
    # 验证RAG配置
    if config.rag_config.chunk_size <= 0:
        errors.append("Chunk size must be positive")
    
    if config.rag_config.top_k <= 0:
        errors.append("Top K must be positive")
    
    if config.rag_config.similarity_threshold < 0 or config.rag_config.similarity_threshold > 1:
        errors.append("Similarity threshold must be between 0 and 1")
    
    # 验证代理配置
    if config.max_iterations <= 0:
        errors.append("Max iterations must be positive")
    
    if config.timeout_seconds <= 0:
        errors.append("Timeout must be positive")
    
    if config.intent_confidence_threshold < 0 or config.intent_confidence_threshold > 1:
        errors.append("Intent confidence threshold must be between 0 and 1")
    
    return errors


# 配置序列化
def config_to_dict(config: AgentConfig) -> Dict[str, Any]:
    """将配置转换为字典"""
    import dataclasses
    return dataclasses.asdict(config)


def config_from_dict(config_dict: Dict[str, Any]) -> AgentConfig:
    """从字典创建配置"""
    # 处理嵌套配置对象
    if 'llm_config' in config_dict and isinstance(config_dict['llm_config'], dict):
        config_dict['llm_config'] = LLMConfig(**config_dict['llm_config'])
    
    if 'rag_config' in config_dict and isinstance(config_dict['rag_config'], dict):
        config_dict['rag_config'] = RAGConfig(**config_dict['rag_config'])
    
    if 'mcp_config' in config_dict and isinstance(config_dict['mcp_config'], dict):
        config_dict['mcp_config'] = MCPConfig(**config_dict['mcp_config'])
    
    return AgentConfig(**config_dict)