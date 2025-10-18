import dspy
from typing import List

from watchmen_ai.hypothesis.model.data_story import DataExplain


class MergeMetricsResultsSign(dspy.Signature):
    """
    As an insurance business analyst, merge multiple metric analysis results into a comprehensive conclusion.
    
    Synthesize multiple DataExplain results into one unified analysis:
    - conclusion: Integrated summary combining all metric insights
    - insight: Comprehensive business impact analysis
    - recommendation: Consolidated actionable recommendations
    
    Focus on identifying patterns, correlations, and overall business implications.
    """
    challenge = dspy.InputField(description="The overarching business challenge.")
    question = dspy.InputField(description="The specific question being investigated.")
    hypothesis = dspy.InputField(description="The hypothesis that was tested.")
    analysisMethod = dspy.InputField(description="The analytical method used.")
    metrics_results = dspy.InputField(description="Multiple metric analysis results to be merged.")
    mergedDataExplain: DataExplain = dspy.OutputField(description="A unified explanation combining all metric results.")


class MergeMetricsResultsModule(dspy.Module):
    """
    Module for merging multiple metric analysis results into a single comprehensive result.
    """

    def __init__(self):
        self.model = dspy.ChainOfThought(MergeMetricsResultsSign)

    def forward(self, challenge, question, hypothesis, analysis_method, results_list):
        # Convert results list to a formatted string for the model
        metrics_results_text = self._format_results_for_merge(results_list)
        
        return self.model(
            challenge=challenge,
            question=question, 
            hypothesis=hypothesis,
            analysisMethod=analysis_method,
            metrics_results=metrics_results_text
        )
    
    def _format_results_for_merge(self, results_list):
        """
        Format multiple DataExplain results into a structured text for merging.
        """
        formatted_results = []
        
        for i, result in enumerate(results_list, 1):
            if hasattr(result, 'dataExplain'):
                data_explain = result.dataExplain
                formatted_result = f"""Metric {i} Analysis:
- Conclusion: {data_explain.conclusion}
- Insight: {data_explain.insight}
- Recommendation: {data_explain.recommendation}
"""
                formatted_results.append(formatted_result)
        
        return "\n\n".join(formatted_results)