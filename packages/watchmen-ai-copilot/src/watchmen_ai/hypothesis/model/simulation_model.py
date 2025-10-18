from pydantic import BaseModel


class SimulationProblem(BaseModel):
    """
    Represents a problem identified during the simulation of a business challenge.
    """
    count_new_problems: int = 0
    count_existing_problems: int = 0
    count_total_problems: int = 0


class SimulationHypothesisResult(BaseModel):
    count_new_hypotheses: int = 0
    count_existing_hypotheses: int = 0
    count_total_hypotheses: int = 0


class SimulationMetricResult(BaseModel):
    """
    Represents the result of a simulation metric.
    """
    linked_metrics: int = 0
    linked_dimensions: int = 0


class SimulationAnalysis(BaseModel):

    validate_hypothesis_count: int = 0
    rejected_hypothesis_count: int = 0


class ChallengeSimulationResult(BaseModel):
    """
    Represents the result of simulating a business challenge.
    """
    answer_result : str = ""

