from typing import List, Optional

import pandas as pd
from pandas import DataFrame

from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.model.metrics import MetricType, EmulativeAnalysisMethod, MetricDetailType
from watchmen_ai.hypothesis.service.analysis_method_service import process_dataset_for_trend_analysis, \
    process_dataset_for_composition_analysis, process_dataset_for_distribution_analysis, \
    process_dataset_for_correlation_analysis, process_dataset_for_feature_importance_analysis, \
    process_dataset_for_comparison_analysis
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService, IndicatorService
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import SubjectService
from watchmen_model.indicator import ObjectiveTarget, Objective
from watchmen_ai.hypothesis.model.common import SimulationResult
from watchmen_utilities import get_current_time_in_seconds
from datetime import datetime
import logging
import json
import os
from pathlib import Path

# File-based storage configuration
STORAGE_DIR = os.path.join(os.path.expanduser("~"), ".watchmen", "temp_storage")
logger = logging.getLogger(__name__)

def _ensure_storage_dir():
    """Ensure the storage directory exists"""
    Path(STORAGE_DIR).mkdir(parents=True, exist_ok=True)

def _get_storage_file_path(storage_key: str) -> str:
    """Get the file path for a storage key"""
    return os.path.join(STORAGE_DIR, f"{storage_key}.json")

def _save_to_file(storage_key: str, data: dict):
    """Save data to file"""
    _ensure_storage_dir()
    file_path = _get_storage_file_path(storage_key)
    
    # Convert SimulationResult to dict for JSON serialization
    simulation_result = data["simulation_result"]
    try:
        if hasattr(simulation_result, 'dict'):
            serialized_result = simulation_result.dict()
        elif hasattr(simulation_result, '__dict__'):
            serialized_result = simulation_result.__dict__
        else:
            serialized_result = str(simulation_result)
    except Exception as e:
        logger.warning(f"Failed to serialize simulation_result, using string representation: {e}")
        serialized_result = str(simulation_result)
    
    serializable_data = {
        "simulation_result": serialized_result,
        "user_id": data["user_id"],
        "tenant_id": data["tenant_id"],
        "timestamp": data["timestamp"]
    }
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(serializable_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save data to file {file_path}: {e}")
        raise

def _load_from_file(storage_key: str) -> dict:
    """Load data from file"""
    file_path = _get_storage_file_path(storage_key)
    if not os.path.exists(file_path):
        raise ValueError(f"Storage file not found: {storage_key}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _list_storage_files() -> List[str]:
    """List all storage files"""
    _ensure_storage_dir()
    storage_files = []
    for filename in os.listdir(STORAGE_DIR):
        if filename.endswith('.json'):
            storage_files.append(filename[:-5])  # Remove .json extension
    return storage_files

def _delete_storage_file(storage_key: str):
    """Delete a storage file"""
    file_path = _get_storage_file_path(storage_key)
    if os.path.exists(file_path):
        os.remove(file_path)

def cleanup_old_storage_files(days_old: int = 30):
    """Clean up storage files older than specified days"""
    _ensure_storage_dir()
    current_time = datetime.now()
    
    for filename in os.listdir(STORAGE_DIR):
        if filename.endswith('.json'):
            file_path = os.path.join(STORAGE_DIR, filename)
            try:
                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                if (current_time - file_mtime).days > days_old:
                    os.remove(file_path)
                    logger.info(f"Cleaned up old storage file: {filename}")
            except Exception as e:
                logger.warning(f"Failed to process file {filename} during cleanup: {e}")

def delete_simulation_result(storage_key: str, principal_service: PrincipalService) -> bool:
    """Delete a simulation result with permission check"""
    try:
        # Check if user has permission to delete
        get_simulation_result(storage_key, principal_service)
        _delete_storage_file(storage_key)
        logger.info(f"Deleted simulation result with key: {storage_key}")
        return True
    except (ValueError, PermissionError) as e:
        logger.warning(f"Failed to delete simulation result {storage_key}: {e}")
        return False

def save_simulation_result(simulation_result: SimulationResult, principal_service: PrincipalService) -> str:
    user_id = principal_service.get_user_id()
    tenant_id = principal_service.get_tenant_id()
    current_time = get_current_time_in_seconds()
    storage_key = f"{tenant_id}_{user_id}_{current_time}"
    data = {
        "simulation_result": simulation_result,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "timestamp": datetime.now().isoformat()
    }
    _save_to_file(storage_key, data)
    logger.info(f"Saved simulation result to file with key: {storage_key}")
    return storage_key

def list_simulation_results(principal_service: PrincipalService) -> dict:
    user_id = principal_service.get_user_id()
    tenant_id = principal_service.get_tenant_id()
    user_results = {}
    
    for storage_key in _list_storage_files():
        try:
            data = _load_from_file(storage_key)
            if data.get("user_id") == user_id and data.get("tenant_id") == tenant_id:
                user_results[storage_key] = data
        except Exception as e:
            logger.warning(f"Failed to load storage file {storage_key}: {e}")
            continue
    
    return user_results

def get_simulation_result(storage_key: str, principal_service: PrincipalService) -> dict:
    try:
        result = _load_from_file(storage_key)
    except ValueError:
        raise ValueError("未找到指定的分析结果")
    
    user_id = principal_service.get_user_id()
    tenant_id = principal_service.get_tenant_id()
    if result.get("user_id") != user_id or result.get("tenant_id") != tenant_id:
        raise PermissionError("无权限访问该分析结果")
    return result

def load_simulation_result_by_challenge_id(challenge_id: str) -> dict:

    matching_results = []
    
    for storage_key in _list_storage_files():
        try:
            stored_data = _load_from_file(storage_key)
            # Check user permissions

                
            simulation_result = stored_data.get("simulation_result")
            # Handle both dict and object formats
            if isinstance(simulation_result, dict):
                challenge = simulation_result.get("challenge")
                if challenge and challenge.get("id") == challenge_id:
                    matching_results.append({
                        "storage_key": storage_key,
                        "simulation_result": simulation_result,
                        "timestamp": stored_data.get("timestamp")
                    })
            elif (simulation_result and 
                  hasattr(simulation_result, 'challenge') and 
                  simulation_result.challenge and 
                  simulation_result.challenge.id == challenge_id):
                matching_results.append({
                    "storage_key": storage_key,
                    "simulation_result": simulation_result,
                    "timestamp": stored_data.get("timestamp")
                })
        except Exception as e:
            logger.warning(f"Failed to process storage file {storage_key}: {e}")
            continue
            
    if not matching_results:
        raise ValueError(f"未找到 challenge_id 为 {challenge_id} 的分析结果")
    matching_results.sort(key=lambda x: x["timestamp"], reverse=True)
    latest_result = matching_results[0]
    return {
        "storage_key": latest_result["storage_key"],
        "simulation_result": latest_result["simulation_result"],
        "timestamp": latest_result["timestamp"]
    }

def load_simulate_result_by_simulation_id(simulation_id: str) -> dict:
    matching_results = []
    
    for storage_key in _list_storage_files():
        try:
            stored_data = _load_from_file(storage_key)
            simulation_result = stored_data.get("simulation_result")


            
            # Handle both dict and object formats
            if isinstance(simulation_result, dict):
                if simulation_result.get("simulationId") == simulation_id:
                    matching_results.append({
                        "storage_key": storage_key,
                        "simulation_result": simulation_result,
                        "timestamp": stored_data.get("timestamp")
                    })
            elif (simulation_result and
                  hasattr(simulation_result, 'challenge') and
                  simulation_result.challenge and
                  simulation_result.simulationId == simulation_id):
                matching_results.append({
                    "storage_key": storage_key,
                    "simulation_result": simulation_result,
                    "timestamp": stored_data.get("timestamp")
                })
        except Exception as e:
            logger.warning(f"Failed to process storage file {storage_key}: {e}")
            continue
            
    if not matching_results:
        raise ValueError(f"未找到 simulation_id 为 {simulation_id} 的分析结果")
    matching_results.sort(key=lambda x: x["timestamp"], reverse=True)
    latest_result = matching_results[0]
    return {
        "storage_key": latest_result["storage_key"],
        "simulation_result": latest_result["simulation_result"],
        "timestamp": latest_result["timestamp"]
    }




## subject service

## objective service


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
    return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
    return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)





async def find_all_target_in_objective_list(
        objective_list: List[Objective]) -> List[ObjectiveTarget]:
    """

    :param objective_list:
    :return:
    """
    objective_target_list: List[ObjectiveTarget] = []
    for objective in objective_list:
        if objective.targets is not None and len(objective.targets) > 0:
            for objective_target in objective.targets:
                objective_target_list.append(objective_target)
    return objective_target_list



async def find_objective_target_by_hypothesis(hypothesis: Hypothesis,objective_target_list:List[ObjectiveTarget]):
    """
    find objective target by hypothesis
    :param objective_target_list:
    :param hypothesis:
    :return:
    """
    objective_target_in_hypothesis:List[ObjectiveTarget] = []
    for metric in hypothesis.metrics:
        for objective_target in objective_target_list:
            if metric == objective_target.name:
                objective_target_in_hypothesis.append(objective_target)

    return objective_target_in_hypothesis



async def metric_analysis(
        metric_detail: MetricDetailType,
        principal_service: PrincipalService) -> DataFrame:
    """

    """

    metric:MetricType = metric_detail.metric
    # print("metric",metric)



    # Get the objective target ID from the metric
    objective_target_id = metric.targetId
    if not objective_target_id:
        raise ValueError("Metric must have a target ID")

    # Get the objective service
    objective_service = get_objective_service(principal_service)
    if not objective_service:
        raise RuntimeError("Failed to get objective service")

    # Get the indicator service
    indicator_service = get_indicator_service(principal_service)
    if not indicator_service:
        raise RuntimeError("Failed to get indicator service")

    # Get the dataset for analysis
    # TODO: Implement dataset retrieval logic here
    dataset = await find_dataset_by_metric_details(metric_detail)
    # find data from watchmen

    # get topic and get data

    dimensions = []
    # todo


    # Process the dataset based on the analysis method
    try:
        analysis_method: EmulativeAnalysisMethod = metric.emulativeAnalysisMethod
        if analysis_method == EmulativeAnalysisMethod.TREND_ANALYSIS:
            return await process_dataset_for_trend_analysis(dataset, metric, dimensions, principal_service)
        elif analysis_method == EmulativeAnalysisMethod.COMPARISON_ANALYSIS:
            return await process_dataset_for_composition_analysis(dataset, metric, dimensions, principal_service)
        elif analysis_method == EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS:
            return await process_dataset_for_distribution_analysis(dataset, metric, dimensions, principal_service)
        elif analysis_method == EmulativeAnalysisMethod.CORRELATION_ANALYSIS:
            return await process_dataset_for_correlation_analysis(dataset, metric, dimensions, principal_service)
        # elif analysis_method == EmulativeAnalysisMethod.COMPARISON:
        #     return await process_dataset_for_comparison_analysis(dataset, metric, dimensions, principal_service)
        elif analysis_method == EmulativeAnalysisMethod.FEATURES_IMPORTANCE:
            return await process_dataset_for_feature_importance_analysis(dataset, metric, dimensions, principal_service)
        else:
            raise ValueError(f"Unsupported analysis method: {analysis_method}")
    except Exception as e:
        raise RuntimeError(f"Error during {analysis_method} analysis: {str(e)}")



async def find_dataset_by_metric_details(
    metric_detail: MetricDetailType) -> DataFrame:
    """
    Find dataset by metric details and generate mock data for testing/development
    :param metric_detail: Metric details containing metric info and dimensions
    :return: DataFrame containing mock data with metric and dimensions
    """
    import numpy as np
    from datetime import datetime, timedelta

    metric = metric_detail.metric
    n_rows = 100  # Number of sample rows
    data = {}

    # Add metric values
    data[metric.name] = np.random.normal(100, 20, n_rows)  # Random normal distribution

    # Generate date range for time dimension
    base_date = datetime.now()
    dates = [base_date - timedelta(days=x) for x in range(n_rows)]
    data['date'] = dates

    # Add categorical dimension
    categories = ['A', 'B', 'C', 'D']
    data['category'] = np.random.choice(categories, n_rows)

    # Add numerical dimension
    data['value'] = np.random.uniform(0, 1000, n_rows)

    return pd.DataFrame(data)






async def build_dataframe_base_on_dataset_and_analysis_method(
        dataset: DataFrame, metric: MetricType,
        analysis_method: EmulativeAnalysisMethod, dimensions: List[str],
        principal_service: PrincipalService) -> DataFrame:
    """
    build a dataframe base on dataset and analysis method
    :param dataset: Input DataFrame to analyze
    :param analysis_method: Analysis method to apply
    :param principal_service: Principal service for authorization
    :return: Processed DataFrame
    """

    if dataset.empty:
        return dataset

    if analysis_method == EmulativeAnalysisMethod.TREND_ANALYSIS:
        # find metric in dataset
        return await process_dataset_for_trend_analysis(dataset, metric, dimensions, principal_service)

    elif analysis_method == EmulativeAnalysisMethod.COMPARISON_ANALYSIS:
        # Implement comparison analysis logic
        return await process_dataset_for_comparison_analysis(dataset, metric, dimensions, principal_service)

    elif analysis_method == EmulativeAnalysisMethod.DISTRIBUTION_ANALYSIS:
        # Implement distribution analysis logic
        return await process_dataset_for_distribution_analysis(dataset, metric, dimensions, principal_service)
    # Implement distribution analysis logic

    elif analysis_method == EmulativeAnalysisMethod.CORRELATION_ANALYSIS:
        # Implement correlation analysis logic
        return await process_dataset_for_correlation_analysis(dataset, metric, dimensions, principal_service)

    elif analysis_method == EmulativeAnalysisMethod.COMPOSITION_ANALYSIS:
        # Implement composition analysis logic
        return await process_dataset_for_composition_analysis(dataset, metric, dimensions, principal_service)


    elif analysis_method == EmulativeAnalysisMethod.FEATURES_IMPORTANCE:
        # Prepare data for feature importance analysis
        return await process_dataset_for_feature_importance_analysis(dataset, metric, dimensions, principal_service)

    # elif analysis_method in [EmulativeAnalysisMethod.T_TEST, EmulativeAnalysisMethod.ANOVA]:
    #     # Prepare data for statistical tests by removing NaN values
    #     return dataset.dropna()

    # Default case: return original dataset
    return dataset

async def load_objective_by_metric(
        metric: MetricType,
        principal_service) -> Optional[Objective]:
    """
    load objective by metric
    :param metric:
    :param principal_service:
    :return:
    """
    objective_service = get_objective_service(principal_service)

    def action():
        # noinspection PyTypeChecker
        return objective_service.find_by_id(metric.objectiveId)

    return  trans_readonly(objective_service,action)