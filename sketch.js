let ghosts = [];
let ghostImages = [];
const numGhosts = 60;
const maxSpeed = 5;
const maxForce = 0.6;
const perceptionRadius = 150;
const separationDistance = 100;
const viewAngle = Math.PI / 4;
let centerHistory = [];
let annotationsOn = false;
let ws;
let latestDepthFrame = null;
let enableKinectConnection = true;
let bumpSound, darkSound, supriseSound, whistlingSound;

function preload() {
  ghostImages[0] = loadImage("images/ghost_0.png");
  ghostImages[1] = loadImage("images/ghost_1.png");
  ghostImages[2] = loadImage("images/ghost_2.png");
  ghostImages[3] = loadImage("images/ghost_3.png");
  ghostImages[4] = loadImage("images/ghost_4.png");
  ghostImages[5] = loadImage("images/ghost_5.png");

  bumpSound = loadSound('sounds/bump.wav');
  darkSound = loadSound('sounds/dark.wav');
  supriseSound = loadSound('sounds/surprise.wav');
  whistlingSound = loadSound('sounds/whistling.wav');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  darkSound.loop();
  imageMode(CENTER);
  for (let i = 0; i < numGhosts; i++) {
    ghosts.push(new Ghost());
  }
  if (enableKinectConnection) {
    setupKinectConnection();
  }
}

function draw() {
  frameRate(60);
  background(0);
  
  for (let ghost of ghosts) {
    ghost.flock(ghosts);
    ghost.update();
    ghost.display();
  }
  for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
            let depthValue = kinectDepth(x, y); // depthValue in mm
            if (depthValue !== null && depthValue > 0) {
                // Map depth value to a grayscale color (closer = lighter).
                // let col = map(depthValue, 300, 2000, 0, 255); // Adjust range as needed
                fill(200,2);
                noStroke();
                ellipse(x, y, 50000/depthValue, 50000/depthValue); // Size inversely proportional to depth
            }
        }
    }
}

function keyPressed() {
  if (key === 'a' || key === 'A') {
    annotationsOn = !annotationsOn;
  }
  if (key === 'c' || key === 'C') {
    toggleKinectConnection();
  }
}

function setupKinectConnection() {
  try {
    ws = new WebSocket('ws://localhost:8765');
    ws.onopen = () => console.log('Connected to Kinect WebSocket server');
    ws.onmessage = (event) => {
      latestDepthFrame = JSON.parse(event.data);
    };
    ws.onclose = () => console.log('Disconnected from Kinect WebSocket server');
    ws.onerror = () => {};
  } catch (error) {}
}

function toggleKinectConnection() {
  enableKinectConnection = !enableKinectConnection;
  if (enableKinectConnection) {
    setupKinectConnection();
  } else {
    if (ws) ws.close();
    ws = null;
    latestDepthFrame = null;
  }
}

// function readDepth(i, j) {
//   if (latestDepthFrame?.depth_data && j >= 0 && j < latestDepthFrame.height && i >= 0 && i < latestDepthFrame.width) {
//     return latestDepthFrame.depth_data[j][i];
//   }
//   return null;
// }

function kinectDepth(x, y) {
  if (latestDepthFrame?.depth_data) {
    const depthHeight = latestDepthFrame.height;
    const depthWidth = latestDepthFrame.width;
    const cropX = 90, cropY = 50;
    let mappedX = floor(map(x, 0, width, depthWidth - cropX, cropX));
    let mappedY = floor(map(y, 0, height, cropY, depthHeight - cropY));
    if (mappedY >= 0 && mappedY < depthHeight && mappedX >= 0 && mappedX < depthWidth) {
      return latestDepthFrame.depth_data[mappedY][mappedX];
    }
  }
  return null;
}