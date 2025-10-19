import asyncio
import json
import websockets
import numpy as np
from pyk4a import Config, PyK4A, FPS, DepthMode
import signal
import sys

# --- Configuration ---
HOST = '0.0.0.0'
PORT = 8765

# --- Global Kinect Object ---
# By initializing the Kinect outside the connection handler, we ensure it only starts once.
# This is a much more stable approach, thank you for the reference code!
kinect = PyK4A(
    Config(
        depth_mode=DepthMode.NFOV_UNBINNED,
        camera_fps=FPS.FPS_30,
        synchronized_images_only=False,
    )
)

# --- Graceful Shutdown Handler ---
# This function will be called when you press Ctrl+C
def signal_handler(sig, frame):
    print("\nCtrl+C detected. Shutting down...")
    if kinect.is_running:
        kinect.stop()
        print("[KINECT LOG] Kinect device stopped safely.")
    sys.exit(0)

# Register the signal handler
signal.signal(signal.SIGINT, signal_handler)


async def stream_depth_data(websocket):
    """
    This function is called for each new client. It streams data from the
    already-running global Kinect object.
    """
    print(f"Client connected...")
    try:
        while True:
            capture = kinect.get_capture()

            if capture.depth is not None:
                depth_frame = capture.depth
                depth_data_list = depth_frame.tolist()

                # Create a JSON payload. The data is human-readable in the browser console.
                payload = json.dumps({
                    # --- FIX ---
                    # Corrected a typo here. It was 'a.shape[1]', now it's 'depth_frame.shape[1]'.
                    'width': depth_frame.shape[1],
                    'height': depth_frame.shape[0],
                    'depth_data': depth_data_list
                })

                await websocket.send(payload)

            await asyncio.sleep(0.03) # Roughly 30 FPS

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected.")
    except Exception as e:
        print(f"An error occurred during streaming: {e}")


async def main():
    """Starts the WebSocket server and runs it forever."""
    print(f"Starting WebSocket server on ws://{HOST}:{PORT}")
    async with websockets.serve(stream_depth_data, HOST, PORT):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    print("------------------------------------")
    print("Azure Kinect Depth Streaming Server")
    print("------------------------------------")
    try:
        # --- Start the Kinect Device ---
        print("[KINECT LOG] Attempting to start Kinect device...")
        kinect.start()
        print("[KINECT LOG] SUCCESS: Kinect device started. The white LED should now be on.")
        print("------------------------------------")

        # --- Start the Server ---
        # This will run the main async function and block until the script is stopped.
        asyncio.run(main())

    except Exception as e:
        print(f"\n--- FAILED TO START KINECT ---")
        print(f"[ERROR] {e}")
        print("\nTroubleshooting:")
        print("1. Is the Kinect plugged into power and a USB3 port?")
        print("2. Is another program (like Azure Kinect Viewer) using the camera?")
        print("3. Try running the 'Azure Kinect Viewer' app from the SDK to confirm the device works.")
    finally:
        # This ensures the kinect is stopped even if the server crashes
        if kinect.is_running:
            kinect.stop()
            print("[KINECT LOG] Kinect device stopped.")

