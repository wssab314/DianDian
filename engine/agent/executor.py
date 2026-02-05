import os
import json
from .strategies.text import TextPerceptionStrategy
from .strategies.vision import VisionPerceptionStrategy

# Load Env
from dotenv import load_dotenv
load_dotenv()

class HybridExecutor:
    """
    Perception Router:
    - Step 1: L1 Text Strategy (Fast, Cheap) -> Qwen-Max + Aria Snapshot
    - Step 2: L2 Vision Strategy (Slow, Robust) -> Qwen-VL-Max + Screenshot + SoM
    """
    def __init__(self):
        self.text_strategy = TextPerceptionStrategy()
        self.vision_strategy = VisionPerceptionStrategy()

    async def decide_action(self, screenshot_base64, aria_snapshot, current_step, goal, history_str):
        """
        Routing Logic:
        1. Try Text Strategy first.
        2. If Confidence < 0.7 or Action is 'fail', fallback to Vision Strategy.
        """
        
        # --- Attempt L1 (Text) ---
        print("[HybridExecutor] Attempting L1: Text Strategy...")
        try:
            l1_result = await self.text_strategy.perceive(
                step=current_step,
                goal=goal,
                history_str=history_str,
                aria_snapshot=aria_snapshot
            )
            
            confidence = l1_result.get("confidence", 0.0)
            action = l1_result.get("action")
            
            print(f"[HybridExecutor] L1 Result: Action={action}, Confidence={confidence}")

            # Criteria to accept L1:
            # 1. Action is not 'fail'
            # 2. Confidence is high enough (e.g. >= 0.7)
            # 3. Action is not 'pass' (my custom skip signal)
            if action not in ["fail", "pass"] and confidence >= 0.7:
                print("[HybridExecutor] L1 Accepted ✅")
                l1_result["strategy"] = "text"
                return l1_result
            else:
                print(f"[HybridExecutor] L1 Rejected (Conf: {confidence}). Switching to L2...")

        except Exception as e:
            print(f"[HybridExecutor] L1 Exception: {e}. Switching to L2...")

        # --- Attempt L2 (Vision) ---
        print("[HybridExecutor] Attempting L2: Vision Strategy...")
        l2_result = await self.vision_strategy.perceive(
            step=current_step,
            goal=goal,
            history_str=history_str,
            screenshot=screenshot_base64
        )
        l2_result["strategy"] = "vision"
        print(f"[HybridExecutor] L2 Result: {l2_result.get('action')}")
        
        return l2_result
