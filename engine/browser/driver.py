import base64
import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext, Browser, Playwright

class BrowserController:
    def __init__(self):
        self.playwright: Playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        self._is_running = False

    async def start(self, headless=False):
        """Starts the browser instance."""
        if self._is_running:
            return
        
        print("Initializing Playwright...")
        self.playwright = await async_playwright().start()
        # Launch Chromium (can be configured)
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) DianDian/0.1.0"
        )
        self.page = await self.context.new_page()
        self._is_running = True
        print("Browser started successfully.")

    async def navigate(self, url: str):
        """Navigates to the specified URL."""
        if not self._is_running or not self.page:
            await self.start()
        
        # Ensure URL has schema
        if not url.startswith('http'):
            url = 'https://' + url
            
        print(f"Navigating to: {url}")
        try:
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            return True
        except Exception as e:
            print(f"Navigation failed: {e}")
            return False

    async def capture_screenshot(self) -> str:
        """Captures a screenshot/snapshot and returns base64 string."""
        if not self.page or not self._is_running:
            return None
        
        try:
            # Quality 50 for performance during streaming
            screenshot_bytes = await self.page.screenshot(type="jpeg", quality=50)
            return base64.b64encode(screenshot_bytes).decode("utf-8")
        except Exception as e:
            print(f"Screenshot failed: {e}")
            return None

    async def stop(self):
        """Stops the browser and cleanup."""
        self._is_running = False
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        print("Browser stopped.")

# Singleton instance can be used if needed, or instantiated in server
