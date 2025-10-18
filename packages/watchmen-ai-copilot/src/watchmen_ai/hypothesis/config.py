from typing import List, Optional
from pydantic import BaseSettings, Field
import os


class APIConfig(BaseSettings):
    """API配置类"""
    
    # 基本配置
    app_name: str = Field(default="Watchmen AI Hypothesis Analysis API", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    
    # 服务器配置
    host: str = Field(default="127.0.0.1", env="HOST")
    port: int = Field(default=8000, env="PORT")
    workers: int = Field(default=1, env="WORKERS")
    
    # CORS配置
    cors_origins: List[str] = Field(
        default=["*"], 
        env="CORS_ORIGINS",
        description="允许的CORS源，用逗号分隔"
    )
    cors_methods: List[str] = Field(default=["*"], env="CORS_METHODS")
    cors_headers: List[str] = Field(default=["*"], env="CORS_HEADERS")
    
    # 数据库配置
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    
    # 检索配置
    default_similarity_threshold: float = Field(default=0.58, env="DEFAULT_SIMILARITY_THRESHOLD")
    default_vector_weight: float = Field(default=0.47, env="DEFAULT_VECTOR_WEIGHT")
    max_retrieval_results: int = Field(default=100, env="MAX_RETRIEVAL_RESULTS")
    
    # 缓存配置
    cache_ttl: int = Field(default=3600, env="CACHE_TTL", description="缓存过期时间(秒)")
    
    # 日志配置
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    
    # 安全配置
    secret_key: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # API限制配置
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW", description="限制窗口(秒)")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
    def get_cors_origins(self) -> List[str]:
        """获取CORS源列表"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins


# 全局配置实例
config = APIConfig()


# 环境相关的配置函数
def is_development() -> bool:
    """检查是否为开发环境"""
    return config.debug or os.getenv("ENVIRONMENT", "development").lower() == "development"


def is_production() -> bool:
    """检查是否为生产环境"""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def get_database_url() -> str:
    """获取数据库URL"""
    if config.database_url:
        return config.database_url
    
    # 如果没有配置数据库URL，返回默认的SQLite URL
    return "sqlite:///./hypothesis_analysis.db"


def get_log_config() -> dict:
    """获取日志配置"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": config.log_format,
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "file": {
                "formatter": "detailed",
                "class": "logging.FileHandler",
                "filename": "api.log",
            },
        },
        "root": {
            "level": config.log_level,
            "handlers": ["default"] if is_development() else ["default", "file"],
        },
    }