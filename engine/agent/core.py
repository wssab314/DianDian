# engine/agent/core.py

class Agent:
    def __init__(self):
        print("Agent initialized")

    def run(self, input_text: str):
        return f"Agent received: {input_text}"
