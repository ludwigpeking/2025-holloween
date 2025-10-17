// Richard Qian Li, for ITP 2025, instructors: Shawn Van Every, Danny Rosin
// Boid Algorithm was invented by Craig Reynolds in 1986
// This implementation is inspired by Daniel Shiffman's "Flocking" example
// https://thecodingtrain.com/CodingChallenges/122-flocking.html
// Ghost images by Richard Qian Li

// ================================================================
// Forces of Boid Algorithm:
// 1. Cohesion: Steer towards the average position of local flock mates
// 2. Alignment: Steer towards the average heading of local flock mates
// 3. Separation: Steer to avoid crowding local flock mates
// 4. (Optional) Boundary: Steer to stay within the canvas boundaries
// ================================================================

// Global variables and constants
let ghosts = []; // Array to hold all ghost objects
let ghostImages = []; // Array to hold ghost images
const numGhosts = 100; // Number of ghosts in the animation
const maxSpeed = 5; // Constant speed for all ghosts
const maxForce = 0.6; // Maximum steering force, avoiding abrupt movements
const perceptionRadius = 150; // Radius to detect the flock mates
const separationDistance = 100; // Desired minimum distance to maintain from neighbors
const viewAngle = Math.PI / 4; // Angle of vision of the ghosts (45 degrees)
let centerHistory = []; // Track center of mass over time
let annotationsOn = false; // Toggle for displaying annotations

// Kinect scaling variables
let ws; // WebSocket connection
let kinectImage; // Kinect image for depth sampling
let showKinectOverlay = false; // Toggle for Kinect overlay (for debugging)
let kinectOpacity = 128; // Opacity for the Kinect overlay (0-255)

function preload() {
  ghostImages[0] = loadImage("ghost_0.png"); // No/mild steering
  ghostImages[1] = loadImage("ghost_1.png"); // Moderate steering
  ghostImages[2] = loadImage("ghost_2.png"); // Strong steering
  ghostImages[3] = loadImage("ghost_3.png"); // bumping into wall
  ghostImages[4] = loadImage("ghost_4.png"); // stretching out
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER); // Center images on ghost position
  for (let i = 0; i < numGhosts; i++) {
    ghosts.push(new Ghost());
  }
  
  // Initialize WebSocket connection for Kinect data
  setupKinectConnection();
}

function draw() {
  frameRate(60);
  // background(0, 30); //smoky effect
  background(0)
  
  // Update all ghosts with Kinect depth data
  for (let ghost of ghosts) {
    ghost.flock(ghosts); // Calculate flocking forces, check neighbors
    ghost.update(); // Update position and velocity
    
    // Sample Kinect depth at ghost position if image is available
    if (kinectImage) {
      ghost.updateKinectScale(kinectImage);
    }
    
    ghost.display(); // Draw the ghost
  }
  
  // Draw Kinect overlay if enabled (for debugging)
  if (showKinectOverlay && kinectImage) {
    drawKinectOverlay();
  }
}

// Toggle annotations with 'a' key
// Toggle Kinect overlay with 'k' key
function keyPressed() {
  if (key === 'a' || key === 'A') {
    annotationsOn = !annotationsOn;
  }
  if (key === 'k' || key === 'K') {
    showKinectOverlay = !showKinectOverlay;
    console.log('Kinect overlay:', showKinectOverlay ? 'ON' : 'OFF');
  }
  // Adjust Kinect overlay opacity with + and - keys
  if (key === '+' || key === '=') {
    kinectOpacity = min(255, kinectOpacity + 25);
    console.log('Kinect opacity:', kinectOpacity);
  }
  if (key === '-' || key === '_') {
    kinectOpacity = max(0, kinectOpacity - 25);
    console.log('Kinect opacity:', kinectOpacity);
  }
}

// Setup WebSocket connection to receive Kinect data
function setupKinectConnection() {
  try {
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = function(event) {
      console.log('Connected to Kinect WebSocket server');
    };
    
    ws.onmessage = function(event) {
      // Load the base64 image data from Kinect
      kinectImage = loadImage(event.data);
    };
    
    ws.onclose = function(event) {
      console.log('Disconnected from Kinect WebSocket server');
    };
    
    ws.onerror = function(error) {
      console.log('WebSocket error:', error);
    };
  } catch (error) {
    console.log('Failed to connect to Kinect WebSocket:', error);
  }
}

// Draw the Kinect image overlay
function drawKinectOverlay() {
  push();
  imageMode(CENTER); // Center the kinect image
  
  // Map Kinect image center to canvas center, but scale down to crop dark corners
  // This will show only the useful central portion of the kinect image
  image(kinectImage, width/2, height/2, width * 1.2, height * 1.2);
  
  // Draw overlay information
  fill(255, 200);
  textAlign(LEFT);
  textSize(16);
  text('Kinect Overlay (Press K to toggle)', 10, 30);
  
  pop();
}

  // ws = new WebSocket('ws://localhost:8080');
  // ws.onmessage = function(event) {
  //   img = loadImage(event.data); // Load base64 image
  // };

//   import pyk4a
// from pyk4a import PyK4A, Config, DepthMode
// import numpy as np
// from websocket_server import WebsocketServer
// import base64
// from PIL import Image
// import io

// def hsv_to_rgb(h, s, v):
//     h = h / 60.0
//     i = np.floor(h).astype(int)
//     f = h - i
//     p = v * (1 - s)
//     q = v * (1 - f * s)
//     t = v * (1 - (1 - f) * s)
//     r = np.zeros_like(h)
//     g = np.zeros_like(h)
//     b = np.zeros_like(h)
//     mask = (i == 0)
//     r[mask] = v[mask]
//     g[mask] = t[mask]
//     b[mask] = p[mask]
//     mask = (i == 1)
//     r[mask] = q[mask]
//     g[mask] = v[mask]
//     b[mask] = p[mask]
//     mask = (i == 2)
//     r[mask] = p[mask]
//     g[mask] = v[mask]
//     b[mask] = t[mask]
//     mask = (i == 3)
//     r[mask] = p[mask]
//     g[mask] = q[mask]
//     b[mask] = v[mask]
//     mask = (i == 4)
//     r[mask] = t[mask]
//     g[mask] = p[mask]
//     b[mask] = v[mask]
//     mask = (i == 5)
//     r[mask] = v[mask]
//     g[mask] = p[mask]
//     b[mask] = q[mask]
//     return (r * 255).astype(np.uint8), (g * 255).astype(np.uint8), (b * 255).astype(np.uint8)

// def new_client(client, server):
//     print(f"New client connected: {client['id']}")

// server = WebsocketServer(host='127.0.0.1', port=8080)
// server.set_fn_new_client(new_client)
// print("Starting WebSocket server on ws://127.0.0.1:8080")
// server.run_forever(threaded=True)

// kinect = PyK4A(Config(depth_mode=DepthMode.NFOV_UNBINNED))
// try:
//     kinect.start()
//     print("Kinect started successfully")
//     while True:
//         capture = kinect.get_capture()
//         if capture.depth is not None:
//             depth_data = capture.depth.astype(np.float32)
//             height, width = depth_data.shape
//             mask = (depth_data >= 300) & (depth_data <= 3000)
//             normalized_depth = (depth_data - 600) / 2400.0
//             normalized_depth = np.clip(normalized_depth, 0, 1)
//             hues = normalized_depth * 240
//             s = np.ones_like(hues)
//             v = np.ones_like(hues)
//             hues[~mask] = 0
//             s[~mask] = 0
//             v[~mask] = 0
//             r, g, b = hsv_to_rgb(hues, s, v)
//             rgb_data = np.stack([r, g, b], axis=-1)
//             rgb_image = Image.fromarray(rgb_data, mode='RGB')
//             buffered = io.BytesIO()
//             rgb_image.save(buffered, format="JPEG", quality=80)
//             base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
//             server.send_message_to_all(f"data:image/jpeg;base64,{base64_image}")
// except KeyboardInterrupt:
//     print("Stopping Kinect and server...")
//     kinect.stop()
//     server.shutdown()
// except Exception as e:
//     print(f"Error: {e}")
//     kinect.stop()
//     server.shutdown()

