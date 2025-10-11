from pydantic import BaseModel, Field
from typing import List, Dict, Any


class DBTProjectConfig(BaseModel):
    """Pydantic model for dbt_project.yml configuration"""
    
    name: str = Field(..., description="Project name")
    version: str = Field("1.0.0", description="Project version")

    profile: str = Field(..., description="dbt profile name")
    


    

    
    models: Dict[str, Any] = Field(default_factory=dict, description="Model configuration")
    seeds: Dict[str, Any] = Field(default_factory=dict, description="Seed configuration")
    snapshots: Dict[str, Any] = Field(default_factory=dict, description="Snapshot configuration")
    sources: Dict[str, Any] = Field(default_factory=dict, description="Source configuration")
    
    vars: Dict[str, Any] = Field(default_factory=dict, description="Project variables")


    
    class Config:
        allow_population_by_field_name = True
        extra = "allow"


class ModelConfig(BaseModel):
    """Configuration for dbt models"""
    
    materialized: str = Field("view", description="Materialization strategy")
    quote: bool = Field(True, description="Whether to quote identifiers")
    enabled: bool = Field(True, description="Whether the model is enabled")
    tags: List[str] = Field(default_factory=list, description="Model tags")
    pre_hook: List[str] = Field(default_factory=list, alias="pre-hook")
    post_hook: List[str] = Field(default_factory=list, alias="post-hook")
    
    class Config:
        allow_population_by_field_name = True
        extra = "allow"


class ProjectModel(BaseModel):
    """Represents a complete dbt project configuration"""
    
    project: DBTProjectConfig
    model_configs: Dict[str, ModelConfig] = Field(default_factory=dict)
    
    @classmethod
    def from_file(cls, file_path: str) -> "ProjectModel":
        """Load configuration from dbt_project.yml file"""
        import yaml
        
        with open(file_path, 'r') as f:
            config_data = yaml.safe_load(f)
        
        # Extract project config
        project_config = DBTProjectConfig(**config_data)
        
        # Extract model configurations
        model_configs = {}
        if 'models' in config_data:
            for key, config in config_data['models'].items():
                if isinstance(config, dict):
                    model_configs[key] = ModelConfig(**config)
        
        return cls(
            project=project_config,
            model_configs=model_configs
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for YAML export"""
        result = self.project.dict(by_alias=True, exclude_none=True)
        
        # Add model configurations
        if self.model_configs:
            result['models'] = {}
            for key, config in self.model_configs.items():
                result['models'][key] = config.dict(by_alias=True, exclude_none=True)
        
        return result
    
    def save_to_file(self, file_path: str) -> None:
        """Save configuration to YAML file"""
        import yaml
        
        data = self.to_dict()
        with open(file_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)


class InsuranceModelProject(ProjectModel):
    """Specialized model for insurance metricflow project"""
    
    def __init__(self):
        super().__init__(
            project=DBTProjectConfig(
                name="mf_tutorial_project",
                version="1.0.0",
                config_version=2,
                profile="mf_tutorial"
            ),
            model_configs={
                "mf_tutorial_project": ModelConfig(
                    materialized="table",
                    quote=False,
                    enabled=True,
                    tags=["insurance", "metricflow"]
                )
            }
        )
    
    def add_insurance_models(self, model_names: List[str]) -> None:
        """Add insurance-specific model configurations"""
        for model_name in model_names:
            self.model_configs[model_name] = ModelConfig(
                materialized="table",
                quote=False,
                enabled=True,
                tags=["insurance", "business_model"]
            )
    
    def add_profile_config(self, profile_name: str, config: Dict[str, Any]) -> None:
        """Add configuration for a specific profile"""
        self.model_configs[profile_name] = ModelConfig(**config)


# Factory functions for creating common configurations
def create_default_insurance_project() -> InsuranceModelProject:
    """Create default insurance project configuration"""
    project = InsuranceModelProject()
    
    # Add common insurance models
    insurance_models = [
        "insurance_policy_info",
        "insurance_claim_case", 
        "insurance_product",
        "insurance_underwriting",
        "insurance_performance",
        "insurance_cs_info",
        "insurance_gl_interface",
        "insurance_ilp_trans_apply"
    ]
    
    project.add_insurance_models(insurance_models)
    return project


def create_project_from_insurance_model() -> InsuranceModelProject:
    """Create project configuration based on insurance_model folder structure"""
    from pathlib import Path
    
    project = InsuranceModelProject()
    
    # Get insurance model path
    base_path = Path(__file__).parent.parent / "insurance_model"
    
    if base_path.exists():
        # Add configurations for each business module
        business_modules = [
            d.name for d in base_path.iterdir() 
            if d.is_dir() and d.name != "shared"
        ]
        
        for module in business_modules:
            project.add_profile_config(
                f"insurance_{module}",
                {
                    "materialized": "table",
                    "quote": False,
                    "enabled": True,
                    "tags": ["insurance", module]
                }
            )
    
    return project


# Validation utilities
class ProjectValidator:
    """Utility class for validating dbt project configurations"""
    
    @staticmethod
    def validate_project_file(file_path: str) -> Dict[str, Any]:
        """Validate a dbt_project.yml file"""
        try:
            project = ProjectModel.from_file(file_path)
            return {
                "valid": True,
                "project_name": project.project.name,
                "profile": project.project.profile,
                "model_count": len(project.model_configs),
                "errors": []
            }
        except Exception as e:
            return {
                "valid": False,
                "errors": [str(e)]
            }
    
    @staticmethod
    def generate_insurance_project_template() -> Dict[str, Any]:
        """Generate template for insurance project"""
        project = create_default_insurance_project()
        return project.to_dict()

