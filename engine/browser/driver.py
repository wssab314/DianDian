from playwright.async_api import async_playwright
import base64

# Device Presets
DEVICE_PRESETS = {
    "desktop": {
        "viewport": {"width": 1280, "height": 800},
        "user_agent": None,
        "device_scale_factor": 1,
        "is_mobile": False,
        "has_touch": False
    },
    "iphone-14-pro": {
        "viewport": {"width": 393, "height": 852},
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True
    },
    "pixel-7": {
        "viewport": {"width": 412, "height": 915},
        "user_agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
        "device_scale_factor": 2.625,
        "is_mobile": True,
        "has_touch": True
    },
    "ipad-pro": {
        "viewport": {"width": 1024, "height": 1366},
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True
    }
}

class BrowserController:
    def __init__(self):
        self.playwright: Playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        self._is_running = False
        self.current_config = DEVICE_PRESETS["desktop"]

    async def start(self, headless=False):
        """Starts the browser instance."""
        if self._is_running:
            return
        
        print("Initializing Playwright...")
        self.playwright = await async_playwright().start()
        # Launch Chromium (can be configured)
        self.browser = await self.playwright.chromium.launch(headless=headless)
        
        await self._create_context()
        
        self._is_running = True
        print("Browser started successfully.")

    async def _create_context(self):
        """Creates a new browser context with the current config."""
        if self.context:
            await self.context.close()

        print(f"Creating context with config: {self.current_config['viewport']}")
        self.context = await self.browser.new_context(
            viewport=self.current_config.get("viewport"),
            user_agent=self.current_config.get("user_agent"),
            device_scale_factor=self.current_config.get("device_scale_factor", 1),
            is_mobile=self.current_config.get("is_mobile", False),
            has_touch=self.current_config.get("has_touch", False)
        )
        self.page = await self.context.new_page()

    async def restart_with_config(self, preset_name: str):
        """Restarts the browser context with a new preset."""
        if preset_name not in DEVICE_PRESETS:
            print(f"Unknown preset: {preset_name}, falling back to desktop.")
            preset_name = "desktop"
        
        print(f"Switching to device: {preset_name}")
        self.current_config = DEVICE_PRESETS[preset_name]
        
        if self._is_running:
            await self._create_context()
            print("Browser context re-initialized.")

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
