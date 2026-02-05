import os
import sys
import subprocess
import shutil

def build_engine():
    # 1. Project paths
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    engine_dir = os.path.join(root_dir, "engine")
    dist_dir = os.path.join(root_dir, "dist-engine")
    
    # Target executable name
    exe_name = "diandian-engine"
    if sys.platform == "win32":
        exe_name += ".exe"

    print(f"Building engine from: {engine_dir}")
    print(f"Platform: {sys.platform}")

    # 2. Cleanup
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)

    # 3. Create command
    # Use 'python -m PyInstaller' for better robustness across environments
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", "diandian-engine",
        "--distpath", dist_dir,
        "--hidden-import", "sqlmodel",
        "--hidden-import", "engine",
        os.path.join(engine_dir, "server.py")
    ]

    # 4. Run PyInstaller
    try:
        subprocess.check_call(cmd, cwd=root_dir)
        print(f"\n✅ Build successful! Executable: {os.path.join(dist_dir, exe_name)}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Build failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    build_engine()
