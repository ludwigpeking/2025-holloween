let ghosts = [];
let ghostImages = [];
const numGhosts = 40;
const maxSpeed = 5;
const maxForce = 0.6;
const perceptionRadius = 150;
const separationDistance = 100;

// --- Raw Audio Buffers ---
// We will load the sound data directly into these buffers.
let bumpBuffer, whistlingBuffer;
let darkSound; // This can remain a p5.SoundFile since it's a long loop.

let isSketchStarted = false;

// --- Web Audio API Context ---
let audioCtx;

// --- Kinect & Annotation Variables ---
let annotationsOn = false;
let ws; // WebSocket for Kinect data
let latestDepthFrame = null; // Store the latest depth frame
let enableKinectConnection = true; 

// Helper function to load sound data into a raw AudioBuffer
// We use a callback because this process is asynchronous.
function loadAudioBuffer(path, callback) {
  let request = new XMLHttpRequest(); // Create a new XMLHttpRequest, which is leak-proof
  request.open('GET', path, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    audioCtx.decodeAudioData(request.response, function(buffer) {
      callback(buffer);
    });
  };
  request.send();
}

function preload() {
  ghostImages[0] = loadImage("images/ghost_0.png"); // normal forward
  ghostImages[1] = loadImage("images/ghost_1.png"); // right tilt 1
  ghostImages[2] = loadImage("images/ghost_2.png"); // right tilt 2
  ghostImages[3] = loadImage("images/ghost_3.png"); // right tilt 3
  ghostImages[4] = loadImage("images/ghost_4.png"); // dive down 1
  ghostImages[5] = loadImage("images/ghost_5.png"); // dive down 2
  ghostImages[6] = loadImage("images/ghost_6.png"); // dash forward
  ghostImages[7] = loadImage("images/ghost_7.png"); // skid stop

  // Get the master audio context from p5.js
  audioCtx = getAudioContext();
  
  // Load the short, rapid sounds as raw buffers
  loadAudioBuffer('sounds/impactWood.wav', (buffer) => {
    bumpBuffer = buffer;
  });
  loadAudioBuffer('sounds/whistling.wav', (buffer) => {
    whistlingBuffer = buffer;
  });
  
  // Long-running sounds are still fine as p5.SoundFile
  darkSound = loadSound('sounds/dark.wav');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  for (let i = 0; i < numGhosts; i++) {
    ghosts.push(new Ghost());
  }
  if (enableKinectConnection) {
    setupKinectConnection();
  }
}




// --- The rest of the file is largely unchanged ---

function draw() {
  if (!isSketchStarted) {
    background(255);
    fill(0);
    textAlign(CENTER, CENTER);`
    3`
    textSize(32);
    textFont('Copperplate, Papyrus, fantasy');
    text('Click on the mouse to endure!', width / 2, height / 2);
    return;
  }
  frameRate(60);
  background(0, 15);
  for (let ghost of ghosts) {
    ghost.flock(ghosts);
    ghost.update();
    ghost.display();
  }
  if (frameCount % 600 > 100) { annotationsOn = false; } else { annotationsOn = true; }
  //add a count console.log for the ghosts,type of image index count
  // let imgIndexCount = {};
  // for (let ghost of ghosts) {
  //   imgIndexCount[ghost.imgIndex] = (imgIndexCount[ghost.imgIndex] || 0) + 1;
  // }
  // console.log('Ghost Image Index Counts:', imgIndexCount);

  if (annotationsOn) {
    background(0);
    for (let ghost of ghosts) {
      ghost.display();
      ghost.annotate();
    }
    textSize(16);
    textFont('helvetica, arial, sans-serif');
    textAlign(LEFT, TOP);
    fill(255);
    text('Richard Qian Li, q.li@nyu.edu', 10, 10);
  }
  // Visualize depth data
  for (let x = 0; x < width; x += 20) {
    for (let y = 0; y < height; y += 20) {
      let depthValue = kinectDepth(x, y);
      if (depthValue !== null && depthValue > 0) {
        fill(255, 20000/depthValue);
        noStroke();
        // ellipse(x, y, 50000 / depthValue, 50000 / depthValue);
        rect(x, y, 5,5);
      }
    }
  }

}

function mousePressed() {
  if (!isSketchStarted) {
    // We must resume the audio context on a user gesture
    audioCtx.resume().then(() => {
      console.log('Audio Context resumed successfully.');
      darkSound.loop();
      isSketchStarted = true;
    });
  }
}

function keyPressed() {
  if (key === 'a' || key === 'A') {
    annotationsOn = !annotationsOn;
  }
  // if (key === 'c' || key === 'C') {
  //   toggleKinectConnection();
  // }
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

// THIS IS THE NEW, LEAK-PROOF playSound FUNCTION
function playSound(buffer, volume = 1.0, pan = 0.0, rate = 1.0) {
  // If the buffer hasn't loaded yet, do nothing.
  if (!buffer) return;

  // Create a new "player" node. This is a fire-and-forget object.
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;

  // Create a gain node for volume control
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = constrain(volume, 0, 1);

  // Create a panner node for stereo panning
  const pannerNode = audioCtx.createStereoPanner();
  pannerNode.pan.value = constrain(pan, -1, 1);

  // Connect the nodes in a chain: source -> gain -> panner -> speakers
  source.connect(gainNode);
  gainNode.connect(pannerNode);
  pannerNode.connect(audioCtx.destination);
  
  // Play the sound immediately and let it be garbage collected.
  source.start(0);
}