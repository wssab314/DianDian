import asyncio
import json
from browser.driver import BrowserController
from agent.planner import QwenPlanner
from agent.executor import QwenExecutor
from agent.som import SetOfMark

class DiandianAgent:
    def __init__(self, browser: BrowserController):
        self.browser = browser
        self.planner = QwenPlanner()
        self.executor = QwenExecutor()
        self.som = SetOfMark(browser.page) # Note: page might be None initially, need handling
        
        self.history = []

    async def process_command(self, user_input: str, emit_func=None):
        """
        Full Agent Loop: Plan -> Execute -> Verify
        """
        # 1. Update SoM page reference just in case page changed
        if self.browser.page:
            self.som.page = self.browser.page

        # 2. Planning Phase
        plan_result = await self.planner.plan_task(user_input)
        steps = plan_result.get("steps", [])
        
        if emit_func:
            formatted_steps = "\n".join([f"- {s}" for s in steps])
            await emit_func('agent_thought', {'step': 'planning', 'detail': f'Plan:\n{formatted_steps}'})

        if not steps:
            return {"error": "Failed to generate plan"}

        # Ensure browser is running before execution
        if not self.browser.page:
            print("[Agent] Browser not running, starting it now...")
            await self.browser.start(headless=False)
            self.som.page = self.browser.page

        # 3. Execution Phase
        try:
            for i, step in enumerate(steps):
                print(f"--- Executing Step {i+1}: {step} ---")
                # ... (existing loop content) ...
                # (Keep existing logic, just wrapping indentation)
                
                if emit_func:
                    await emit_func('agent_thought', {'step': 'executing', 'detail': f'Current Step: {step}'})

                # Retry loop
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        markers = await self.som.add_markers()
                    except Exception as e:
                        print(f"SoM Error (ignoring): {e}")
                        markers = {}

                    await asyncio.sleep(0.5)
                    screenshot = await self.browser.capture_screenshot()
                    
                    if not screenshot:
                         print("[Agent] Failed to capture screenshot. Retrying...")
                         if attempt < max_retries - 1:
                             continue
                         else:
                             break

                    if emit_func and screenshot:
                         await emit_func('browser_snapshot', {'image': screenshot})
                    
                    history_str = json.dumps(self.history[-3:])
                    action_data = await self.executor.decide_action(
                        screenshot, step, user_input, history_str
                    )
                    
                    action = action_data.get("action")
                    target_id = action_data.get("target_id")
                    param = action_data.get("param")
                    thought = action_data.get("thought", "")

                    if emit_func:
                        await emit_func('agent_thought', {'step': 'action', 'detail': f'{thought} -> {action} {param}'})

                    success = False
                    if action == "navigate":
                        success = await self.browser.navigate(param or target_id) 
                    elif action == "click":
                        if target_id is not None:
                            try:
                                tid = int(target_id)
                                if tid in markers:
                                    await markers[tid].click()
                                    success = True
                                else:
                                    print(f"Marker {tid} not found in valid keys")
                            except Exception as e:
                                print(f"Click failed: {e}")
                    elif action == "type":
                        if target_id is not None:
                            try:
                                tid = int(target_id)
                                if tid in markers:
                                    el = markers[tid]
                                    await el.scroll_into_view_if_needed()
                                    await el.click()
                                    await asyncio.sleep(0.2)
                                    try:
                                        await el.fill("") 
                                    except Exception as e:
                                        print(f"[Agent] Clear/Fill failed (non-fatal): {e}")

                                    await el.type(str(param), delay=100)
                                    success = True
                                else:
                                    print(f"[Agent] Type Error: Marker {tid} not found")
                            except Exception as e:
                                print(f"[Agent] Type failed: {e}")
                    elif action == "scroll":
                        try:
                            # param can be "up", "down", or None
                            direction = param if param in ["up", "down"] else "down"
                            if direction == "down":
                                await self.browser.page.evaluate("window.scrollBy(0, 500)")
                            else:
                                await self.browser.page.evaluate("window.scrollBy(0, -500)")
                            success = True
                        except Exception as e:
                            print(f"[Agent] Scroll failed: {e}")
                    elif action == "back":
                        try:
                            await self.browser.page.go_back()
                            success = True
                        except Exception as e:
                            print(f"[Agent] Back failed: {e}")
                    elif action == "hover":
                        if target_id is not None:
                            try:
                                tid = int(target_id)
                                if tid in markers:
                                    await markers[tid].hover()
                                    success = True
                                else:
                                    print(f"Marker {tid} not found for hover")
                            except Exception as e:
                                print(f"[Agent] Hover failed: {e}")

                    elif action == "done":
                        success = True
                        break 
                    elif action == "fail":
                        print("Agent gave up on this step.")
                        break
                    
                    # Clean markers 
                    await self.som.clear_markers()
                    
                    # Post screenshot
                    if success:
                        await asyncio.sleep(1) 
                        post_screenshot = await self.browser.capture_screenshot()
                        if emit_func and post_screenshot:
                             await emit_func('browser_snapshot', {'image': post_screenshot})

                    self.history.append({"step": step, "action": action, "success": success})

                    if success:
                        break  
                    else:
                        print(f"Action failed, retrying ({attempt+1}/{max_retries})...")
                        await asyncio.sleep(2)
        except asyncio.CancelledError:
            print("[Agent] Task Cancelled")
            raise
        finally:
            # Ensure markers are cleared if cancelled/finished
            await self.som.clear_markers()

        return {"status": "finished"}
