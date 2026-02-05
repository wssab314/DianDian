from playwright.async_api import Page

class SetOfMark:
    def __init__(self, page: Page):
        self.page = page
        self.marked_elements = {}

    async def inject_style(self):
        """Inject CSS for SoM markers."""
        css = """
        .som-marker {
            position: absolute;
            background-color: rgba(239, 68, 68, 0.8); /* Red-500 with 80% opacity */
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 1px 3px;
            border-radius: 3px;
            z-index: 2147483647;
            pointer-events: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: 1px solid rgba(255, 255, 255, 0.8);
            transform: translate(-50%, -50%); /* Pin center to the coordinate */
            line-height: 1;
        }
        .som-element-highlight {
            outline: 1px solid rgba(239, 68, 68, 0.4) !important;
            outline-offset: -1px !important;
        }
        """
        await self.page.add_style_tag(content=css)

    async def add_markers(self):
        """
        Identify interactive elements and overlay markers.
        Returns a dictionary mapping ID -> ElementHandle.
        """
        await self.inject_style()
        
        # Identify interactive elements: buttons, inputs, links, textareas
        selector = "button, input, a, textarea, [role='button'], [role='link']"
        elements = await self.page.query_selector_all(selector)
        
        self.marked_elements = {}
        marker_script = """
        (el, id) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 || getComputedStyle(el).visibility === 'hidden') return false;
            
            // Add subtle border to the element itself
            el.classList.add('som-element-highlight');

            const marker = document.createElement('div');
            marker.className = 'som-marker';
            marker.textContent = id;
            // Position at top-left corner
            marker.style.left = (rect.left + window.scrollX) + 'px';
            marker.style.top = (rect.top + window.scrollY) + 'px';
            document.body.appendChild(marker);
            return true;
        }
        """

        # Cleanup old markers and highlights first
        await self.page.evaluate("""() => {
            document.querySelectorAll('.som-marker').forEach(el => el.remove());
            document.querySelectorAll('.som-element-highlight').forEach(el => el.classList.remove('som-element-highlight'));
        }""")

        visible_count = 0
        visible_count = 0
        for i, el in enumerate(elements):
            try:
                # Check visibility and add marker
                # Handle potential detached elements or JS errors gracefully
                is_visible = await self.page.evaluate(f"""
                ([el, id]) => {{
                    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
                    return ({marker_script})(el, id);
                }}
                """, [el, i])
                
                if is_visible:
                    self.marked_elements[i] = el
                    visible_count += 1
            except Exception as e:
                # Element likely detached or stale; ignore
                continue
                
        # Limit to top 50 elements to avoid cluttering specific views
        # (Optimization: could prioritize by visibility or viewport location)
        
        return self.marked_elements

    async def clear_markers(self):
        await self.page.evaluate("""() => {
            document.querySelectorAll('.som-marker').forEach(el => el.remove());
            document.querySelectorAll('.som-element-highlight').forEach(el => el.classList.remove('som-element-highlight'));
        }""")
        self.marked_elements = {}
