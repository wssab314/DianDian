import os
import json
import time
import base64
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

class Reporter:
    def __init__(self, output_dir="reports"):
        self.start_time = datetime.now()
        self.run_id = self.start_time.strftime("%Y%m%d_%H%M%S")
        self.report_dir = os.path.join(output_dir, self.run_id)
        self.images_dir = os.path.join(self.report_dir, "images")
        
        # Ensure directories exist
        os.makedirs(self.images_dir, exist_ok=True)
        
        self.steps = []
        self.meta = {
            "task": "",
            "start_time": self.start_time.isoformat(),
            "duration": 0,
            "status": "pending"
        }
        
        # Setup Jinja
        self.env = Environment(loader=FileSystemLoader(os.path.dirname(__file__)))
        # We will assume a 'report_template.html' exists in the same folder

    def set_task(self, task_description):
        self.meta["task"] = task_description

    def _save_image(self, b64_str, prefix="step"):
        if not b64_str:
            return None
        
        # Clean header if present
        if "base64," in b64_str:
            b64_str = b64_str.split("base64,")[1]
            
        filename = f"{prefix}_{int(time.time()*1000)}.jpg"
        filepath = os.path.join(self.images_dir, filename)
        
        try:
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(b64_str))
            return os.path.join("images", filename) # Return relative path for HTML
        except Exception as e:
            print(f"[Reporter] Failed to save image: {e}")
            return None

    def log_step(self, step_name, thought, action, param, status, screenshot_before=None, screenshot_after=None):
        """
        Log a single execution step.
        """
        step_data = {
            "id": len(self.steps) + 1,
            "name": step_name,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "thought": thought,
            "action": f"{action} {param if param else ''}",
            "status": "success" if status else "failed",
            "img_before": self._save_image(screenshot_before, prefix="pre"),
            "img_after": self._save_image(screenshot_after, prefix="post")
        }
        self.steps.append(step_data)

    def finish(self, status="completed"):
        self.meta["status"] = status
        duration = datetime.now() - self.start_time
        self.meta["duration"] = f"{duration.seconds}s"
        
        return self.generate_html()

    def generate_html(self):
        # Define a simple embedded template if file doesn't exist, or specific one
        template_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DianDian Test Report - {{ meta.task }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .step-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    </style>
</head>
<body class="bg-gray-50 min-h-screen text-slate-800 font-sans">
    <div class="max-w-5xl mx-auto p-6">
        <!-- Header -->
        <header class="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-3xl font-bold text-indigo-600 mb-2">DianDian Automation Report</h1>
                    <p class="text-xl text-gray-700 font-medium">{{ meta.task }}</p>
                </div>
                <div class="text-right">
                    <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold 
                        {{ 'bg-green-100 text-green-700' if meta.status == 'completed' else 'bg-red-100 text-red-700' }}">
                        {{ meta.status | upper }}
                    </div>
                    <div class="text-sm text-gray-500 mt-2">{{ meta.start_time }}</div>
                    <div class="text-sm text-gray-500">Duration: {{ meta.duration }}</div>
                </div>
            </div>
        </header>

        <!-- Timeline -->
        <div class="space-y-6">
            {% for step in steps %}
            <div class="step-card bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all duration-200">
                <div class="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                    <div class="flex items-center gap-3">
                        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">
                            {{ step.id }}
                        </span>
                        <h3 class="font-semibold text-lg">{{ step.name }}</h3>
                    </div>
                    <span class="text-xs font-mono text-gray-400">{{ step.timestamp }}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Text Info -->
                    <div class="space-y-4">
                        <div class="bg-slate-50 p-4 rounded-lg">
                            <div class="text-xs uppercase tracking-wider text-gray-400 mb-1">Thought</div>
                            <p class="text-sm text-gray-600 leading-relaxed">{{ step.thought }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                             <div class="text-xs uppercase tracking-wider text-gray-400">Action:</div>
                             <code class="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-pink-600">{{ step.action }}</code>
                        </div>
                    </div>

                    <!-- Screenshots -->
                    <div class="grid grid-cols-2 gap-2">
                        {% if step.img_before %}
                        <div class="space-y-1">
                            <div class="text-[10px] text-center text-gray-400 uppercase">Before</div>
                            <img src="{{ step.img_before }}" class="w-full rounded border cursor-pointer hover:opacity-90" onclick="window.open(this.src)">
                        </div>
                        {% endif %}
                        {% if step.img_after %}
                        <div class="space-y-1">
                            <div class="text-[10px] text-center text-gray-400 uppercase">After</div>
                            <img src="{{ step.img_after }}" class="w-full rounded border cursor-pointer hover:opacity-90" onclick="window.open(this.src)">
                        </div>
                        {% endif %}
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
        
        <footer class="text-center text-gray-400 text-sm mt-12 mb-6">
            Generated by DianDian AI Agent
        </footer>
    </div>
</body>
</html>
"""
        try:
            report_path = os.path.join(self.report_dir, "index.html")
            template = self.env.from_string(template_content)
            rendered = template.render(meta=self.meta, steps=self.steps)
            
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(rendered)
                
            return os.path.abspath(report_path)
            
        except Exception as e:
            print(f"[Reporter] Failed to generate HTML: {e}")
            return None
