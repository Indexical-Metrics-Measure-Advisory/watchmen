from typing import List

from watchmen_ai.hypothesis.env.step.challenge_conclusions import ChallengeConclusionStep
from watchmen_ai.hypothesis.env.step.define_simulation_problems import DefineSimulationProblemsStep
from watchmen_ai.hypothesis.env.step.hypothesis_simulation import HypothesisSimulationStep
from watchmen_ai.hypothesis.env.step.metric_simulation import MetricSimulationStep
from watchmen_ai.hypothesis.env.step.simulation_analysis import SimulationAnalysisStep
from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.common import ChallengeAgentContext


class SimulateEnvStepExecutor:
    """
    A class representing a step in a simulation environment.
    This class is designed to encapsulate the logic for executing a step in the simulation.
    """

    def __init__(self, step):
        self.step:SimulationStepInterface = step

    def execute(self, challenge, context=None, *args, **kwargs):
        """
        Execute the step in the simulation environment.
        This method should be overridden by subclasses to provide specific execution logic.
        """
        return self.step.execute(challenge, context, *args, **kwargs)



class ChallengeSimulateEnv:
    """
    A class to simulate a challenge environment for hypothesis testing.
    This class is designed to initialize the environment with a given challenge and context,
    and to generate problems if necessary.
    """

    def __init__(self, challenge, context:ChallengeAgentContext=None):
        self.current_challenge = challenge
        self.context = context

    def get_result(self):
        """
        Get the result of the challenge simulation.
        This method should be overridden by subclasses to provide specific result retrieval logic.
        """
        return self.context

    def get_current_challenge(self):
        """
        Get the current challenge being simulated.
        This method returns the current challenge object.
        """
        return self.current_challenge

    def load_steps(self):
        """
        Load the steps for the challenge simulation.
        This method should be overridden by subclasses to provide specific step loading logic.
        """
        steps:List = [DefineSimulationProblemsStep(),HypothesisSimulationStep(),MetricSimulationStep(),SimulationAnalysisStep(),ChallengeConclusionStep()]
        return steps


    def execute_steps(self):
        """
        Execute the steps in the challenge simulation.
        This method iterates through the loaded steps and executes each one.
        """
        steps = self.load_steps()
        for step in steps:
            step_executor = SimulateEnvStepExecutor(step)
            step_executor.execute(self.current_challenge, self.context)

        return self.get_result()




