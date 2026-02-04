# engine/browser/driver.py

class BrowserDriver:
    def __init__(self):
        print("Browser Driver initialized")

    async def start(self):
        print("Browser started")

    async def navigate(self, url: str):
        print(f"Navigating to {url}")
