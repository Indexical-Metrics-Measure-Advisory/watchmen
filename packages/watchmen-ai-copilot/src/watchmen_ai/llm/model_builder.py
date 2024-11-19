from watchmen_ai.llm.azure_model_loader import AzureModelLoader
from watchmen_ai.llm.base_model_loader import BaseModelLoader

ai_model_loaders = {
    "Microsoft": AzureModelLoader()
}


def load_model_loader_by_type(model_loader_type)->BaseModelLoader:
    return ai_model_loaders[model_loader_type]






