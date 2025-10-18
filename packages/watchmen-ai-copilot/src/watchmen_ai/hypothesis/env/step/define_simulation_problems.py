import uuid
from datetime import datetime

from watchmen_ai.dspy.module.generate_problem_with_current_problems import GenerateProblemWithCurrentProblemsModule
from watchmen_ai.hypothesis.env.step.step_interface import SimulationStepInterface
from watchmen_ai.hypothesis.model.analysis import BusinessProblemWithHypotheses, BusinessChallengeWithProblems
from watchmen_ai.hypothesis.model.data_story import BusinessProblemForDspy
from watchmen_ai.hypothesis.service.ai_service import generate_markdown_table_for_problem


class DefineSimulationProblemsStep(SimulationStepInterface):
    """
    This class defines the simulation problems for the hypothesis environment.
    It is used to set up the problems that will be simulated in the environment.
    """
    def __init__(self, problem_limit: int = 2):
        """
        Initialize the DefineSimulationProblemsStep with a problem limit.
        :param problem_limit: The maximum number of problems to generate for the challenge.
        """
        self.problem_limit = problem_limit
        self.challenge = None


    def generate_problems(self, challenge: BusinessChallengeWithProblems):
        """
        Generate new problems for the business challenge.
        This method should implement the logic to generate new problems based on the challenge.
        """
        # Placeholder for problem generation logic
        generate_problem = GenerateProblemWithCurrentProblemsModule()

        markdown = generate_markdown_table_for_problem(challenge.problems)

        # Generate new hypothesis using AI

        result = generate_problem(challenge=challenge.title, challenge_description=challenge.description,
                                  current_problem_list=markdown)
        return result.response

    def execute(self, challenge:BusinessChallengeWithProblems,context,*args, **kwargs):

        if challenge.problems and len(challenge.problems)>= self.problem_limit:
            # If the number of problems is already at the limit, do nothing
            return challenge
        else:
            # If the number of problems is less than the limit, generate new problems
            # This is where you would implement the logic to generate new problems
            # For now, we will just return the challenge as is
            # In a real implementation, you would call a method to generate problems
            loop_number  = self.problem_limit - len(challenge.problems)
            for _ in range(loop_number):
                # Generate new problems until the limit is reached
                problem:BusinessProblemForDspy = self.generate_problems(challenge)
                # convert to businessProblem
                new_problem = BusinessProblemWithHypotheses(
                    id=str(uuid.uuid4()),
                    title=problem.title,
                    description=problem.description,
                    createAt = datetime.now().replace(tzinfo=None, microsecond=0),
                    lastModifiedAt = datetime.now().replace(tzinfo=None, microsecond=0),
                    tenantId=challenge.tenantId,
                )

                challenge.problems.append(new_problem)

        return challenge

    def reset(self):
        self.challenge = None



