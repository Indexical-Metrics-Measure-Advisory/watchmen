from abc import ABC, abstractmethod


class SimulationStepInterface(ABC):
    """
    Interface for simulation steps in the hypothesis environment.
    """

    # def __init__(self, step_name: str):
    #     self.step_name = step_name

    @abstractmethod
    def execute(self,challenge,context, *args, **kwargs):
        """
        Execute the simulation step with the provided arguments.
        """
        raise NotImplementedError("Subclasses should implement this method.")

    @abstractmethod
    def reset(self):
        """
        Reset the state of the simulation step.
        """
        raise NotImplementedError("Subclasses should implement this method.")