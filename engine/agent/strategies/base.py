from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class PerceptionStrategy(ABC):
    """
    Abstract base class for perception strategies (L1/L2).
    """

    @abstractmethod
    async def perceive(self, step: str, goal: str, history_str: str, **kwargs) -> Dict[str, Any]:
        """
        Analyze the current state and return an action.
        
        Args:
            step: Current micro-step description.
            goal: Overall user goal.
            history_str: Stringified history of actions.
            **kwargs: Additional context (page, screenshot, etc.)
            
        Returns:
            Dict containing:
            - action: str
            - target_id: Optional[int]
            - param: Optional[str]
            - thought: str
            - confidence: float (0.0 - 1.0)
        """
        pass
