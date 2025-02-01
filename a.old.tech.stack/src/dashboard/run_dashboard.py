import os
import sys
import subprocess

def run_dashboard():
    """Run the Streamlit dashboard with proper configuration"""
    try:
        # Get the directory of the current script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Get the parent directory (project root)
        project_root = os.path.dirname(current_dir)
        
        # Add project root to Python path
        sys.path.append(project_root)
        
        # Construct the path to the email_monitor.py file
        dashboard_path = os.path.join(current_dir, 'email_monitor.py')
        
        # Run the Streamlit app with the correct command
        streamlit_port = 9092
        cmd = [
            'streamlit', 'run',
            '--server.port', str(streamlit_port),
            '--server.address', 'localhost',
            dashboard_path
        ]
        
        print(f"\nDashboard is running at: http://localhost:{streamlit_port}")
        print("Press Ctrl+C to stop the application\n")
        
        # Run the Streamlit process
        process = subprocess.Popen(cmd)
        process.wait()
        
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Error running dashboard: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_dashboard() 