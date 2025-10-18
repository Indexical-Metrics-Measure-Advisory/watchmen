import dspy
import pandas as pd
import numpy as np
import re
from datetime import datetime
from typing import Dict, List, Any, Tuple
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score

from watchmen_ai.dspy.module.conclusion_hypothesis import ExplainDataHypothesisMetricModule
from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import HypothesisWithMetrics, AnalysisData, AnalysisMetric, AnalysisDataset, \
    BusinessChallengeWithProblems
from watchmen_ai.hypothesis.model.common import ChallengeAgentContext
from watchmen_ai.hypothesis.service.metric_service import get_metrics_value, MetricFlowResponse
from watchmen_ai.markdown.document import MarkdownDocument


class SimulationAnalysisStep(SimulationStepInterface):
    """
    This class is responsible for analyzing the simulation results.
    It can be extended to include more complex analysis methods.
    """
    
    def _compress_data_for_tokens(self, headers: List[str], rows: List[List[Any]], max_rows: int = 50) -> Tuple[List[str], List[List[Any]]]:
        """
        Token压缩算法：
        1. 针对第一列如果是时间维度，格式化为YYYY/MM/DD格式，去掉小时分钟
        2. 数据采样：限制最大行数
        3. 数值精度控制：浮点数保留2位小数
        4. 重复值压缩：连续重复值用省略号表示
        5. 长字符串截断：超长文本截断并添加省略号
        """
        if not headers or not rows:
            return headers, rows
        
        compressed_headers = headers.copy()
        
        # 1. 数据采样：如果行数过多，进行智能采样
        sampled_rows = self._sample_rows_intelligently(rows, max_rows)
        
        compressed_rows = []
        prev_row = None
        consecutive_count = 0
        
        for i, row in enumerate(sampled_rows):
            compressed_row = []
            
            for j, value in enumerate(row):
                compressed_value = value
                
                # 2. 时间维度压缩（第一列）
                if j == 0 and value is not None:
                    compressed_value = self._format_time_dimension(value)
                
                # 3. 数值精度控制
                elif isinstance(value, float):
                    compressed_value = round(value, 2)
                
                # 4. 长字符串截断
                elif isinstance(value, str) and len(value) > 30:
                    compressed_value = value[:27] + "..."
                
                compressed_row.append(compressed_value)
            
            # 5. 重复行检测和压缩
            if prev_row is not None and compressed_row == prev_row:
                consecutive_count += 1
                # 如果连续重复超过2行，用省略号表示
                if consecutive_count == 2:
                    compressed_rows.append(["..."] * len(compressed_row))
                elif consecutive_count > 2:
                    continue  # 跳过后续重复行
            else:
                consecutive_count = 0
                compressed_rows.append(compressed_row)
            
            prev_row = compressed_row
        
        return compressed_headers, compressed_rows
    
    def _sample_rows_intelligently(self, rows: List[List[Any]], max_rows: int) -> List[List[Any]]:
        """
        智能数据采样：保留头部、尾部和中间的代表性数据
        """
        if len(rows) <= max_rows:
            return rows
        
        # 保留前20%、中间10%、后20%的数据
        head_count = max(1, int(max_rows * 0.4))
        tail_count = max(1, int(max_rows * 0.4))
        middle_count = max_rows - head_count - tail_count
        
        sampled_rows = []
        
        # 头部数据
        sampled_rows.extend(rows[:head_count])
        
        # 中间数据（如果有空间）
        if middle_count > 0 and len(rows) > head_count + tail_count:
            middle_start = len(rows) // 2 - middle_count // 2
            middle_end = middle_start + middle_count
            sampled_rows.extend(rows[middle_start:middle_end])
        
        # 尾部数据
        if len(rows) > head_count:
            sampled_rows.extend(rows[-tail_count:])
        
        return sampled_rows
    
    def _format_time_dimension(self, value: Any) -> str:
        """
        格式化时间维度值为YYYY/MM/DD格式，去掉小时分钟
        """
        if value is None:
            return str(value)
        
        value_str = str(value)
        
        # 检测各种时间格式并转换为YYYY/MM/DD，去掉时分秒
        time_patterns = [
            # ISO格式: 2023-12-25T10:30:00.123 或 2023-12-25 10:30:00.123
            (r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]\d{1,2}:\d{1,2}(:\d{1,2})?(\.\d+)?', r'\1/\2/\3'),
            # 标准日期格式: 2023-12-25
            (r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})$', r'\1/\2/\3'),
            # 美式格式: 12/25/2023 10:30:00.123
            (r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})(\s+\d{1,2}:\d{1,2}(:\d{1,2})?(\.\d+)?)?', r'\3/\1/\2'),
        ]
        
        for pattern, replacement in time_patterns:
            if re.search(pattern, value_str):
                formatted = re.sub(pattern, replacement, value_str)
                # 确保月份和日期是两位数
                parts = formatted.split('/')
                if len(parts) == 3:
                    year, month, day = parts
                    return f"{year}/{month.zfill(2)}/{day.zfill(2)}"
        
        # 如果不匹配任何时间格式，尝试使用pandas解析
        try:
            parsed_date = pd.to_datetime(value_str)
            return parsed_date.strftime('%Y/%m/%d')
        except:
            # 如果无法解析为时间，返回原值
            return value_str
    
    def _is_likely_time_column(self, column_name: str, sample_values: List[Any]) -> bool:
        """
        判断列是否可能是时间列
        """
        # 检查列名是否包含时间相关关键词
        time_keywords = ['date', 'time', 'year', 'month', 'day', '日期', '时间', '年', '月', '日']
        column_lower = column_name.lower()
        
        if any(keyword in column_lower for keyword in time_keywords):
            return True
        
        # 检查样本值是否看起来像时间
        time_like_count = 0
        for value in sample_values[:5]:  # 只检查前5个值
            if value is not None:
                value_str = str(value)
                # 简单的时间格式检测
                if re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', value_str) or \
                   re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{4}', value_str):
                    time_like_count += 1
        
        return time_like_count >= 2  # 如果至少有2个值看起来像时间，则认为是时间列
    
    def build_data_profile(self, metric_flow_response: MetricFlowResponse) -> Dict[str, Any]:
        """
        构建数据的profile，包括基本统计信息、分布特征和数据质量分析
        """
        try:
            # 将数据转换为DataFrame
            df = pd.DataFrame(metric_flow_response.data, columns=metric_flow_response.column_names)
            
            profile = {
                'basic_info': {
                    'total_rows': len(df),
                    'total_columns': len(df.columns),
                    'column_names': list(df.columns),
                    'memory_usage': df.memory_usage(deep=True).sum()
                },
                'data_quality': {
                    'missing_values': df.isnull().sum().to_dict(),
                    'missing_percentage': (df.isnull().sum() / len(df) * 100).to_dict(),
                    'duplicate_rows': df.duplicated().sum(),
                    'unique_values_per_column': df.nunique().to_dict()
                },
                'statistical_summary': {},
                'data_types': df.dtypes.astype(str).to_dict(),
                'distribution_analysis': {}
            }
            
            # 数值列的统计分析
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            if len(numeric_columns) > 0:
                numeric_stats = df[numeric_columns].describe().to_dict()
                profile['statistical_summary']['numeric'] = numeric_stats
                
                # 分布分析
                for col in numeric_columns:
                    profile['distribution_analysis'][col] = {
                        'skewness': float(df[col].skew()) if not df[col].isnull().all() else None,
                        'kurtosis': float(df[col].kurtosis()) if not df[col].isnull().all() else None,
                        'outliers_iqr': self._detect_outliers_iqr(df[col]),
                        'zero_values': int((df[col] == 0).sum()),
                        'negative_values': int((df[col] < 0).sum())
                    }
            
            # 分类列的统计分析
            categorical_columns = df.select_dtypes(include=['object', 'category']).columns
            if len(categorical_columns) > 0:
                categorical_stats = {}
                for col in categorical_columns:
                    value_counts = df[col].value_counts()
                    categorical_stats[col] = {
                        'unique_count': len(value_counts),
                        'most_frequent': value_counts.index[0] if len(value_counts) > 0 else None,
                        'most_frequent_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                        'top_5_values': value_counts.head(5).to_dict()
                    }
                profile['statistical_summary']['categorical'] = categorical_stats
            
            # 相关性分析（仅数值列）
            if len(numeric_columns) > 1:
                correlation_matrix = df[numeric_columns].corr()
                profile['correlation_analysis'] = {
                    'correlation_matrix': correlation_matrix.to_dict(),
                    'high_correlations': self._find_high_correlations(correlation_matrix)
                }
            
            return profile
            
        except Exception as e:
            return {
                'error': f"数据profiling失败: {str(e)}",
                'basic_info': {
                    'total_rows': len(metric_flow_response.data) if metric_flow_response.data else 0,
                    'total_columns': len(metric_flow_response.column_names) if metric_flow_response.column_names else 0
                }
            }
    
    def _detect_outliers_iqr(self, series: pd.Series) -> Dict[str, Any]:
        """
        使用IQR方法检测异常值
        """
        try:
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = series[(series < lower_bound) | (series > upper_bound)]
            
            return {
                'count': len(outliers),
                'percentage': len(outliers) / len(series) * 100 if len(series) > 0 else 0,
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound)
            }
        except:
            return {'count': 0, 'percentage': 0, 'lower_bound': None, 'upper_bound': None}
    
    def _find_high_correlations(self, corr_matrix: pd.DataFrame, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        找出高相关性的变量对
        """
        high_corrs = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) >= threshold:
                    high_corrs.append({
                        'variable1': corr_matrix.columns[i],
                        'variable2': corr_matrix.columns[j],
                        'correlation': float(corr_value)
                    })
        return high_corrs
    
    def calculate_feature_importance(self, metric_flow_response: MetricFlowResponse, target_column: str = None) -> Dict[str, Any]:
        """
        计算特征重要性，使用随机森林算法
        """
        try:
            # 将数据转换为DataFrame
            df = pd.DataFrame(metric_flow_response.data, columns=metric_flow_response.column_names)
            
            if len(df) < 2:
                return {'error': '数据量不足，无法计算特征重要性'}
            
            # 如果没有指定目标列，选择第一个数值列作为目标
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            if not target_column:
                if len(numeric_columns) == 0:
                    return {'error': '没有数值列可用于特征重要性分析'}
                target_column = numeric_columns[0]
            
            if target_column not in df.columns:
                return {'error': f'目标列 {target_column} 不存在'}
            
            # 准备特征和目标变量
            feature_columns = [col for col in df.columns if col != target_column]
            
            if len(feature_columns) == 0:
                return {'error': '没有特征列可用于分析'}
            
            X = df[feature_columns].copy()
            y = df[target_column].copy()
            
            # 处理缺失值
            X = X.fillna(X.mean() if X.select_dtypes(include=[np.number]).shape[1] > 0 else X.mode().iloc[0] if len(X.mode()) > 0 else 0)
            y = y.fillna(y.mean() if pd.api.types.is_numeric_dtype(y) else y.mode().iloc[0] if len(y.mode()) > 0 else 0)
            
            # 编码分类变量
            label_encoders = {}
            categorical_columns = X.select_dtypes(include=['object', 'category']).columns
            
            for col in categorical_columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
            
            # 确定问题类型（回归或分类）
            is_classification = False
            if pd.api.types.is_numeric_dtype(y):
                # 如果目标变量的唯一值少于10个，视为分类问题
                unique_values = y.nunique()
                if unique_values <= 10 and unique_values > 1:
                    is_classification = True
            else:
                is_classification = True
                le_target = LabelEncoder()
                y = le_target.fit_transform(y.astype(str))
            
            # 分割数据
            if len(X) > 4:  # 只有在数据量足够时才分割
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
            else:
                X_train, X_test, y_train, y_test = X, X, y, y
            
            # 选择模型
            if is_classification:
                model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
                model.fit(X_train, y_train)
                
                if len(X_test) > 0:
                    y_pred = model.predict(X_test)
                    score = accuracy_score(y_test, y_pred)
                    score_name = 'accuracy'
                else:
                    score = 0
                    score_name = 'accuracy'
            else:
                model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=5)
                model.fit(X_train, y_train)
                
                if len(X_test) > 0:
                    y_pred = model.predict(X_test)
                    score = 1 - (mean_squared_error(y_test, y_pred) / np.var(y_test)) if np.var(y_test) > 0 else 0
                    score_name = 'r2_score'
                else:
                    score = 0
                    score_name = 'r2_score'
            
            # 获取特征重要性
            feature_importance = model.feature_importances_
            
            # 创建特征重要性结果
            importance_results = []
            for i, feature in enumerate(feature_columns):
                importance_results.append({
                    'feature': feature,
                    'importance': float(feature_importance[i]),
                    'rank': i + 1
                })
            
            # 按重要性排序
            importance_results.sort(key=lambda x: x['importance'], reverse=True)
            
            # 重新分配排名
            for i, result in enumerate(importance_results):
                result['rank'] = i + 1
            
            return {
                'target_column': target_column,
                'problem_type': 'classification' if is_classification else 'regression',
                'model_performance': {
                    score_name: float(score)
                },
                'feature_importance': importance_results,
                'top_5_features': importance_results[:5],
                'model_info': {
                    'n_estimators': 100,
                    'max_depth': 5,
                    'training_samples': len(X_train),
                    'test_samples': len(X_test)
                },
                'data_preprocessing': {
                    'categorical_columns_encoded': list(categorical_columns),
                    'missing_values_handled': True
                }
            }
            
        except Exception as e:
            return {
                'error': f"特征重要性计算失败: {str(e)}",
                'target_column': target_column
            }
    
    def build_comprehensive_analysis(self, metric_flow_response: MetricFlowResponse, target_column: str = None) -> str:
        """
        构建包含数据profile和特征重要性的综合分析报告
        """
        profile = self.build_data_profile(metric_flow_response)
        feature_importance = self.calculate_feature_importance(metric_flow_response, target_column)
        
        # 构建分析报告
        report_parts = []
        
        # 数据概览
        report_parts.append("## 数据概览")
        if 'basic_info' in profile:
            basic_info = profile['basic_info']
            report_parts.append(f"- 总行数: {basic_info.get('total_rows', 0)}")
            report_parts.append(f"- 总列数: {basic_info.get('total_columns', 0)}")
            report_parts.append(f"- 列名: {', '.join(basic_info.get('column_names', []))}")
        
        # 数据质量
        if 'data_quality' in profile:
            report_parts.append("\n## 数据质量分析")
            data_quality = profile['data_quality']
            missing_values = data_quality.get('missing_values', {})
            if any(v > 0 for v in missing_values.values()):
                report_parts.append("### 缺失值情况:")
                for col, count in missing_values.items():
                    if count > 0:
                        percentage = data_quality.get('missing_percentage', {}).get(col, 0)
                        report_parts.append(f"- {col}: {count} ({percentage:.1f}%)")
            else:
                report_parts.append("- 无缺失值")
            
            duplicate_rows = data_quality.get('duplicate_rows', 0)
            report_parts.append(f"- 重复行数: {duplicate_rows}")
        
        # 统计摘要
        if 'statistical_summary' in profile:
            report_parts.append("\n## 统计摘要")
            
            # 数值列统计
            if 'numeric' in profile['statistical_summary']:
                report_parts.append("### 数值列统计:")
                numeric_stats = profile['statistical_summary']['numeric']
                for col, stats in numeric_stats.items():
                    if isinstance(stats, dict) and 'mean' in stats:
                        report_parts.append(f"- {col}: 均值={stats['mean']:.2f}, 标准差={stats.get('std', 0):.2f}, 最小值={stats.get('min', 0):.2f}, 最大值={stats.get('max', 0):.2f}")
            
            # 分类列统计
            if 'categorical' in profile['statistical_summary']:
                report_parts.append("### 分类列统计:")
                categorical_stats = profile['statistical_summary']['categorical']
                for col, stats in categorical_stats.items():
                    unique_count = stats.get('unique_count', 0)
                    most_frequent = stats.get('most_frequent', 'N/A')
                    report_parts.append(f"- {col}: {unique_count}个唯一值, 最频繁值='{most_frequent}'")
        
        # 特征重要性
        if 'error' not in feature_importance:
            report_parts.append("\n## 特征重要性分析")
            report_parts.append(f"- 目标变量: {feature_importance.get('target_column', 'N/A')}")
            report_parts.append(f"- 问题类型: {feature_importance.get('problem_type', 'N/A')}")
            
            model_performance = feature_importance.get('model_performance', {})
            for metric, value in model_performance.items():
                report_parts.append(f"- 模型性能 ({metric}): {value:.3f}")
            
            top_features = feature_importance.get('top_5_features', [])
            if top_features:
                report_parts.append("### Top 5 重要特征:")
                for i, feature_info in enumerate(top_features, 1):
                    feature_name = feature_info.get('feature', 'N/A')
                    importance = feature_info.get('importance', 0)
                    report_parts.append(f"{i}. {feature_name}: {importance:.4f}")
        else:
            report_parts.append("\n## 特征重要性分析")
            report_parts.append(f"- 错误: {feature_importance['error']}")
        
        # 相关性分析
        if 'correlation_analysis' in profile:
            high_corrs = profile['correlation_analysis'].get('high_correlations', [])
            if high_corrs:
                report_parts.append("\n## 高相关性变量对")
                for corr_info in high_corrs[:5]:  # 只显示前5个
                    var1 = corr_info.get('variable1', 'N/A')
                    var2 = corr_info.get('variable2', 'N/A')
                    corr_value = corr_info.get('correlation', 0)
                    report_parts.append(f"- {var1} ↔ {var2}: {corr_value:.3f}")
        
        return "\n".join(report_parts)
    
    def _build_enhanced_analysis_input(self, analysis_data: AnalysisData) -> str:
        """
        构建增强的分析输入，包含原始markdown、数据profile和特征重要性分析
        """
        # 原始markdown
        original_markdown = self.build_metrics_markdown(analysis_data)
        
        # 为每个指标添加数据profile和特征重要性分析
        enhanced_parts = [original_markdown]
        enhanced_parts.append("\n\n# 数据深度分析")
        
        for i, analysis_metric in enumerate(analysis_data.analysis_metrics):
            if analysis_metric.dataset and analysis_metric.dataset.dataset:
                metric_flow_res = analysis_metric.dataset.dataset
                
                enhanced_parts.append(f"\n## {analysis_metric.name} - 数据分析")
                
                # 添加综合分析报告
                comprehensive_analysis = self.build_comprehensive_analysis(metric_flow_res)
                enhanced_parts.append(comprehensive_analysis)
                
                # 添加原始数据profile（JSON格式，供LLM参考）
                data_profile = self.build_data_profile(metric_flow_res)
                if 'error' not in data_profile:
                    enhanced_parts.append("\n### 详细数据Profile（供AI分析参考）")
                    # 只包含关键信息，避免过于冗长
                    key_profile_info = {
                        'basic_info': data_profile.get('basic_info', {}),
                        'data_quality': data_profile.get('data_quality', {}),
                        'data_types': data_profile.get('data_types', {})
                    }
                    enhanced_parts.append(f"```json\n{key_profile_info}\n```")
                
                # 添加特征重要性分析（JSON格式）
                feature_importance = self.calculate_feature_importance(metric_flow_res)
                if 'error' not in feature_importance:
                    enhanced_parts.append("\n### 特征重要性分析（供AI分析参考）")
                    # 只包含关键信息
                    key_importance_info = {
                        'target_column': feature_importance.get('target_column'),
                        'problem_type': feature_importance.get('problem_type'),
                        'model_performance': feature_importance.get('model_performance', {}),
                        'top_5_features': feature_importance.get('top_5_features', [])
                    }
                    enhanced_parts.append(f"```json\n{key_importance_info}\n```")
        
        enhanced_input = "\n".join(enhanced_parts)
        
        # 计算token数量（用于监控）
        try:
            from litellm import token_counter
            messages = [{"role": "user", "content": enhanced_input}]
            token_count = token_counter(model="gpt-4o", messages=messages)
            print(f"Enhanced analysis token count: {token_count}")
        except Exception as e:
            print(f"Token counting failed: {e}")
        
        return enhanced_input
    
    def get_metric_analysis_summary(self, analysis_metric: AnalysisMetric) -> Dict[str, Any]:
        """
        获取单个指标的完整分析摘要，包括数据profile和特征重要性
        """
        if not analysis_metric.dataset or not analysis_metric.dataset.dataset:
            return {'error': '指标数据不可用'}
        
        metric_flow_res = analysis_metric.dataset.dataset
        
        # 获取数据profile
        data_profile = self.build_data_profile(metric_flow_res)
        
        # 获取特征重要性
        feature_importance = self.calculate_feature_importance(metric_flow_res)
        
        # 获取综合分析报告
        comprehensive_report = self.build_comprehensive_analysis(metric_flow_res)
        
        return {
            'metric_name': analysis_metric.name,
            'metric_category': analysis_metric.category,
            'dimensions': analysis_metric.dimensions,
            'data_profile': data_profile,
            'feature_importance': feature_importance,
            'comprehensive_report': comprehensive_report,
            'raw_data_info': {
                'total_rows': len(metric_flow_res.data) if metric_flow_res.data else 0,
                'column_count': len(metric_flow_res.column_names) if metric_flow_res.column_names else 0,
                'columns': metric_flow_res.column_names
            }
        }
    
    def get_all_metrics_analysis_summary(self, analysis_data: AnalysisData) -> Dict[str, Any]:
        """
        获取所有指标的分析摘要
        """
        summaries = {}
        
        for analysis_metric in analysis_data.analysis_metrics:
            metric_summary = self.get_metric_analysis_summary(analysis_metric)
            summaries[analysis_metric.name] = metric_summary
        
        # 计算整体统计
        total_rows = sum(summary.get('raw_data_info', {}).get('total_rows', 0) for summary in summaries.values())
        total_features = sum(len(summary.get('feature_importance', {}).get('feature_importance', [])) for summary in summaries.values())
        
        return {
            'individual_metrics': summaries,
            'overall_statistics': {
                'total_metrics': len(analysis_data.analysis_metrics),
                'total_data_rows': total_rows,
                'total_features_analyzed': total_features
            },
            'hypothesis_id': analysis_data.hypothesis_id
        }

    def build_metrics_markdown(self,analysis_data:AnalysisData):
        # build a markdown for the analysis metrics dataset with token compression
        markdown_document = MarkdownDocument()
        
        for analysis_metric in analysis_data.analysis_metrics:
            markdown_document.append_heading(analysis_metric.name)
            
            if analysis_metric.dataset and analysis_metric.dataset.dataset:
                # Assuming dataset is of type MetricFlowResponse
                dataset: MetricFlowResponse = analysis_metric.dataset.dataset
                
                # 应用token压缩算法
                compressed_headers, compressed_rows = self._compress_data_for_tokens(
                    dataset.column_names, dataset.data
                )
                
                # 检查第一列是否是时间列，如果是则应用时间格式化
                if compressed_headers and compressed_rows:
                    first_column_name = compressed_headers[0]
                    sample_values = [row[0] if row else None for row in compressed_rows[:5]]
                    
                    if self._is_likely_time_column(first_column_name, sample_values):
                        print(f"检测到时间列: {first_column_name}，应用时间格式压缩")
                        # 时间列压缩已在 _compress_data_for_tokens 中处理
                
                # 进一步优化markdown表格格式
                optimized_headers, optimized_rows = self._optimize_table_for_markdown(compressed_headers, compressed_rows)
                
                markdown_document.append_table(headers=optimized_headers, rows=optimized_rows)
                
                # 添加压缩信息到markdown
                original_size = len(str(dataset.data))
                compressed_size = len(str(optimized_rows))
                compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
                
                if compression_ratio > 0:
                    markdown_document.append_text(f"\n*数据压缩率: {compression_ratio:.1f}%, 行数: {len(optimized_rows)}*\n")

        result = markdown_document.contents()

        from litellm import token_counter

        messages = [{"role": "user", "content": result}]
        token_count = token_counter(model="gpt-4o", messages=messages)
        print(f"压缩后token数量: {token_count}")
        
        return result
    
    def _optimize_table_for_markdown(self, headers: List[str], rows: List[List[Any]]) -> Tuple[List[str], List[List[Any]]]:
        """
        针对markdown表格的进一步优化，包括列宽优化、空值压缩、数据类型优化等
        """
        if not headers or not rows:
            return headers, rows
        
        # 1. 压缩列名
        optimized_headers = self._compress_column_names(headers)
        
        # 2. 优化数据值
        optimized_rows = []
        for row in rows:
            optimized_row = []
            for i, value in enumerate(row):
                optimized_value = self._optimize_cell_value(value, i, headers)
                optimized_row.append(optimized_value)
            optimized_rows.append(optimized_row)
        
        # 3. 移除完全空的列
        non_empty_columns = []
        for i, header in enumerate(optimized_headers):
            has_data = any(row[i] not in [None, "", "-", "null", "N/A"] for row in optimized_rows if i < len(row))
            if has_data:
                non_empty_columns.append(i)
        
        if non_empty_columns:
            filtered_headers = [optimized_headers[i] for i in non_empty_columns]
            filtered_rows = [[row[i] if i < len(row) else "-" for i in non_empty_columns] for row in optimized_rows]
            return filtered_headers, filtered_rows
        
        return optimized_headers, optimized_rows
    
    def _compress_column_names(self, headers: List[str]) -> List[str]:
        """
        压缩列名以减少token使用
        """
        compressed = []
        for header in headers:
            # 移除常见的冗余词汇
            compressed_header = str(header)
            
            # 替换常见的长词汇
            replacements = {
                "timestamp": "time",
                "datetime": "time", 
                "created_at": "created",
                "updated_at": "updated",
                "percentage": "pct",
                "percent": "pct",
                "amount": "amt",
                "quantity": "qty",
                "number": "num",
                "average": "avg",
                "maximum": "max",
                "minimum": "min",
                "total": "tot",
                "count": "cnt",
                "value": "val",
                "description": "desc",
                "category": "cat",
                "status": "stat"
            }
            
            compressed_lower = compressed_header.lower()
            for long_word, short_word in replacements.items():
                compressed_lower = compressed_lower.replace(long_word, short_word)
            
            # 保持原始大小写结构
            if compressed_lower != compressed_header.lower():
                compressed_header = compressed_lower
            
            # 限制列名长度
            if len(compressed_header) > 12:
                compressed_header = compressed_header[:9] + "..."
            
            compressed.append(compressed_header)
        
        return compressed
    
    def _optimize_cell_value(self, value: Any, column_index: int, headers: List[str]) -> str:
        """
        优化单元格值以减少token使用
        """
        # 处理空值
        if value is None or pd.isna(value):
            return "-"
        
        # 转换为字符串
        str_value = str(value).strip()
        
        # 处理空字符串
        if str_value == "" or str_value.lower() in ["null", "none", "n/a", "na"]:
            return "-"
        
        # 数值优化
        if isinstance(value, (int, float)):
            if isinstance(value, float):
                # 浮点数精度控制
                if abs(value) >= 1000000:
                    return f"{value/1000000:.1f}M"
                elif abs(value) >= 1000:
                    return f"{value/1000:.1f}K"
                elif abs(value) < 0.01 and value != 0:
                    return f"{value:.2e}"
                else:
                    return f"{value:.2f}"
            else:
                # 整数压缩
                if abs(value) >= 1000000:
                    return f"{value//1000000}M"
                elif abs(value) >= 1000:
                    return f"{value//1000}K"
                else:
                    return str(value)
        
        # 字符串长度限制
        if len(str_value) > 20:
            return str_value[:17] + "..."
        
        # 布尔值简化
        if str_value.lower() in ["true", "false"]:
            return "T" if str_value.lower() == "true" else "F"
        
        return str_value

    def execute(self, challenge:BusinessChallengeWithProblems, context:ChallengeAgentContext, *args, **kwargs):



        explain_hypothesis = ExplainDataHypothesisMetricModule()

        analysis_result ={}
        for problem in challenge.problems:

            for hypothesis in problem.hypotheses:
                analysis_data = AnalysisData()
                # print("hypothesis",hypothesis)
                # analysis_data.hypotheses = [hypothesis]
                analysis_data.hypothesis_id = hypothesis.id

                # print(f"Analyzing hypothesis: {hypothesis}")
                hypothesis_with_metrics:HypothesisWithMetrics = hypothesis
                for metric_detail in hypothesis_with_metrics.metrics_details:
                    analysis_metric = AnalysisMetric(name=metric_detail.metric.name,category=metric_detail.metric.category)

                    result_json =  get_metrics_value(metric_detail.metric.name,hypothesis_with_metrics.dimensions)

                    metric_flow_res =  MetricFlowResponse(data= result_json['data'], column_names=result_json['column_names'])

                    analysis_metric.dataset = AnalysisDataset(dataset=metric_flow_res)
                    analysis_metric.dimensions = hypothesis_with_metrics.dimensions

                    analysis_data.analysis_metrics.append(analysis_metric)

                # 构建增强的分析输入，包含数据profile和特征重要性
                enhanced_analysis_input = self.build_metrics_markdown(analysis_data)
                
                # 获取完整的分析摘要并保存到context中
                analysis_summary = self.get_all_metrics_analysis_summary(analysis_data)

                print("enhanced_analysis_input",enhanced_analysis_input)
                
                result = explain_hypothesis(challenge=challenge.title, question=problem.title,
                                       hypothesis=hypothesis_with_metrics.title,
                                       analysis_method=hypothesis_with_metrics.analysisMethod,
                                       metrics_markdown=enhanced_analysis_input)

                # dspy.inspect_history(1)

                analysis_data.data_explain_dict.append(result.dataExplain)
                
                # 将分析摘要添加到analysis_data中，供后续使用
                if not hasattr(analysis_data, 'analysis_summary'):
                    analysis_data.analysis_summary = analysis_summary
                
                analysis_result[hypothesis.id]=analysis_data

                context.challenge_result.hypothesisResultDict[hypothesis.id] = analysis_data
                
                # 打印分析摘要的关键信息（用于调试）
                print(f"分析摘要 - 假设ID: {hypothesis.id}")
                print(f"指标数量: {analysis_summary['overall_statistics']['total_metrics']}")
                print(f"总数据行数: {analysis_summary['overall_statistics']['total_data_rows']}")
                print(f"总特征数: {analysis_summary['overall_statistics']['total_features_analyzed']}")

        context.result_data = analysis_result
        # sent to trigger for save
        return challenge











    def reset(self):
        pass

