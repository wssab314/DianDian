import asyncio
from browser.driver import BrowserController

class DiandianAgent:
    def __init__(self, browser: BrowserController):
        self.browser = browser
        self.history = []

    async def process_command(self, user_input: str, emit_func=None):
        """
        Process a user command.
        In the future, this will use an LLM to decide actions.
        For now, it uses simple heuristics.
        """
        print(f"[Agent] Thinking about: {user_input}")
        
        # Fake "Thinking" delay
        if emit_func:
            await emit_func('agent_thought', {'step': 'planning', 'detail': f'Analyzing request: "{user_input}"...'})
            await asyncio.sleep(0.5)

        # Simple Rule-based Router (The "Brain" Skeleton)
        if "http" in user_input or ".com" in user_input:
            action = "navigate"
            target = user_input
            if not target.startswith("http"):
                target = "https://" + target
        elif "back" in user_input.lower():
            action = "go_back"
            target = None
        elif "click" in user_input.lower():
            action = "click"
            # Extract target from string (very naive for now)
            target = user_input.replace("click", "").strip() 
        else:
            action = "unknown"
            target = None

        # Execute Action
        if emit_func:
            await emit_func('agent_thought', {'step': 'action', 'detail': f'Decided to {action} {target if target else ""}'})
        
        result = await self._execute_action(action, target)
        
        if emit_func and result.get('screenshot'):
             await emit_func('browser_snapshot', {'image': result['screenshot']})

        return result

    async def _execute_action(self, action, target):
        result = {"success": False, "screenshot": None}
        
        if action == "navigate":
            success = await self.browser.navigate(target)
            result["success"] = success
            result["screenshot"] = await self.browser.capture_screenshot()
        elif action == "unknown":
            result["error"] = "I don't understand that command yet."
            
        return result
