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

//TODO: 
// 1) Ghost age, proportion
// 2) sounds
// 3) velocity variation, dashing frame
class Ghost {
  constructor() {
    this.pos = createVector(random(width), random(height)); //random initial position
    this.vel = p5.Vector.random2D().setMag(maxSpeed * random(0.5, 1)); // Random initial velocity with constant speed
    this.acc = createVector(0, 0); // Start with no acceleration
    this.age = random(3,20);

    // Visual properties
    this.baseScale = 0.5 * sqrt(random(1, 6)); // Base scale (original random scale)
    this.scale = this.baseScale; // Current scale (will be modified by Kinect)
    this.opacity = random(5, 100); // Random initial opacity
    this.colorization = { r: 255, g: 255, b: 255 };
    this.imgIndex = 0; // Start with the no/mild steering image
    this.isLeftSteering = true; // the handedness of the ghost image will be determined by the steering direction
    
    // Kinect depth sampling
    this.depthHistory = []; // Store last 6 depth samples
    this.maxDepthHistory = 6;
  }

  flock(allGhosts) {
    // Calculate forces from flocking behaviors
    let cohesion = this.computeCohesion(allGhosts); // an acceleration vector towards the average position of neighbors
    let alignment = this.computeAlignment(allGhosts); // the average velocity vector of neighbors
    let separation = this.computeSeparation(allGhosts); // a repulsion acceleration vector away from too-close neighbors
    let boundary = this.computeBoundary();

    // Hard Coded Weights
    cohesion.mult(0.01);
    alignment.mult(0.02);
    separation.mult(0.05);
    boundary.mult(1);
    this.acc.add(cohesion).add(alignment).add(separation).add(boundary); // Add all forces to the acceleration
    //draw a vector representing the acceleration

    if (annotationsOn) {
    push();
    translate(this.pos.x, this.pos.y);
    stroke(0, 255, 0);
    strokeWeight(2);
    line(0, 0, this.acc.x * 100, this.acc.y * 100);
    pop();
    }
  }

  update() {  
    //loop routine for each ghost
    this.calculateSteering(); // Calculate steering direction to select the correct image
    this.vel.add(this.acc); // Update velocity with acceleration
    // this.vel.setMag(maxSpeed); // Enforce constant speed
    // constrain speed between 0.5*maxSpeed and maxSpeed, find out the scaler of the velocity
    let speed = this.vel.mag();
    speed = constrain(speed, 0.3 * maxSpeed, 1.2 * maxSpeed);
    this.vel.setMag(speed);
    //show the speed value with a line
    if (annotationsOn) {
    push();
    translate(this.pos.x, this.pos.y);
    stroke(255, 0, 0);
    strokeWeight(2);
    line(0, 0, this.vel.x * 10, this.vel.y * 10);
    fill(255, 255, 0);
    noStroke();
    text (round(this.age),0,0);
    pop();
    }
    this.pos.add(this.vel); // Update position with velocity
    this.acc.mult(0); // Reset acceleration for the next frame
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + PI / 2); // default heading left
    // Mirror the image for right turns (if not the straight-ahead image)
    if (!this.isLeftSteering && this.imgIndex !== 0) {
      scale(-1, 1);
    }
    // Apply in and out scaling effect of individual ghosts
    this.scale *= random(0.948, 1.052);
    this.scale = constrain(this.scale, 0.2, 4);
    this.colorization.r = constrain(this.scale * this.opacity * 3, 220, 255);
    this.colorization.g = constrain(this.scale * this.opacity * 3.5, 220, 255);

    // Apply flickering opacity
    tint(
      this.colorization.r,
      this.colorization.g,
      this.colorization.b,
      this.opacity
    ); //tint function applies transparency to images
    this.opacity += random(-1, 1);
    this.opacity = constrain(this.opacity, 3, 160);
    // if annotationsOn, this.imageIndex = 3, tint is red, if this.imageIndex =4, tint is blue, if this.imageIndex is 1, tint is pinkish, if this.imageIndex is 2, tint is orangish
    if (annotationsOn) {
      if (this.imgIndex === 3) {
        tint(255, 0, 0);
      } else if (this.imgIndex === 4) {
        tint(0, 0, 255);
      } else if (this.imgIndex === 1) {
        tint(255, 255, 0); //moderate steering, yellowish
      } else if (this.imgIndex === 2) {
        tint(0, 255, 255); //strong steering, tealish
      } else {
        tint(255, 255, 255);
      }
      this.opacity = 100;
      this.scale = 0.5;
    }
    // Draw the selected ghost image
    image(ghostImages[this.imgIndex], 0, 0, 80 * this.scale * (this.age/13)**0.2 , 240 * this.scale * sqrt(this.age/13));
    pop();
  }

  computeCohesion(allGhosts) {
    // Steer towards average position of neighbors,
    let steerForce = createVector(0, 0); //so called steerForce, but its a desired velocity actually
    let count = 0;
    for (let other of allGhosts) {
      //perceptionRadius
      let d = p5.Vector.dist(this.pos, other.pos);
      if (this !== other && d > 0 && d < perceptionRadius) {
        let toOther = p5.Vector.sub(other.pos, this.pos);
        steerForce.add(toOther);
        count++;
      }
    }
    if (count > 0) {
      // steerForce.div(count).normalize(); // Average direction to neighbors
      steerForce.setMag(maxSpeed);
    }
    return steerForce;
  }

  computeAlignment(allGhosts) {
    let avgVel = createVector(0, 0);
    let count = 0;
    for (let other of allGhosts) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (this !== other && d > 0 && d < perceptionRadius) {
        avgVel.add(other.vel); // Sum up the velocities of neighbors
        count++;
      }
    }
    if (count > 0) {
      // avgVel.div(count); // Average velocity of neighbors
      avgVel.setMag(maxSpeed);
    }
    return avgVel; // steer() method handles the vel subtraction
  }

  computeSeparation(allGhosts) {
    let steerForce = createVector(0, 0);
    let count = 0;
    for (let other of allGhosts) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (this !== other && d > 0 && d < separationDistance) {
        //condistion for repulsion
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d); //replusion proportional to 1/d
        steerForce.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steerForce.div(count); //does not really required if magnitude is set later
      steerForce.setMag(maxSpeed);
    }
    return steerForce;
  }

  computeBoundary() {
    let margin = 150;
    let turnForce = createVector(0, 0);
    let turnStrength = 0.8;

    // Left boundary
    if (this.pos.x < margin) {
      turnForce.x = (turnStrength * (margin - this.pos.x)) / margin;
    }
    // Right boundary
    else if (this.pos.x > width - margin) {
      turnForce.x = (-turnStrength * (this.pos.x - (width - margin))) / margin;
    }

    // Top boundary
    if (this.pos.y < margin) {
      turnForce.y = (turnStrength * (margin - this.pos.y)) / margin;
    }
    // Bottom boundary
    else if (this.pos.y > height - margin) {
      turnForce.y = (-turnStrength * (this.pos.y - (height - margin))) / margin;
    }

    return turnForce;
  }
  calculateSteering() {
    // Project acceleration onto the perpendicular of velocity to find turn amount
    let perpVel = createVector(-this.vel.y, this.vel.x);
    let steerProjection = this.acc.dot(perpVel.normalize());
    let steerMag = abs(steerProjection);

    this.isLeftSteering = steerProjection > 0;

    // Select image based on steering magnitude
    if (steerMag < 0.15) {
      this.imgIndex = 0; // No/mild steering
    } else if (steerMag < 0.3) {
      this.imgIndex = 1; // Moderate steering
    } else {
      this.imgIndex = 2; // Strong steering
    }
    // if steerMeg <0.05 and acc's direction opposite to vel direction and larger than 0.1, then use the bumping into wall image, if steerMeg <0.05 and acc's direction same as vel direction and larger than 0.1, then use the stretching out image
    if (steerMag < 0.1) {
      let velDir = this.vel.copy().normalize();
      let accDir = this.acc.copy().normalize();
      let dotProduct = velDir.dot(accDir);
      if (dotProduct < -0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 3; // bumping into wall
      } else if (dotProduct > 0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 4; // stretching out
      }
    }

  }

  // Update ghost scale based on Kinect depth data
  updateKinectScale(kinectImg) {
    // Map ghost position to Kinect image coordinates
    let kinectX = map(this.pos.x, 0, width, 0, kinectImg.width);
    let kinectY = map(this.pos.y, 0, height, 0, kinectImg.height);
    
    // Ensure coordinates are within image bounds
    kinectX = constrain(kinectX, 0, kinectImg.width - 1);
    kinectY = constrain(kinectY, 0, kinectImg.height - 1);
    
    // Sample the pixel color at ghost position
    let pixelColor = kinectImg.get(kinectX, kinectY);
    
    // Check if any color channel is zero (invalid depth)
    if (pixelColor[0] === 0 || pixelColor[1] === 0 || pixelColor[2] === 0) {
      // Don't change scale if any channel is zero
      return;
    }
    
    // Add current depth sample to history
    let depthValue = (pixelColor[0] + pixelColor[1] + pixelColor[2]) / 3; // Average RGB as depth
    this.depthHistory.push(depthValue);
    
    // Keep only last 6 frames
    if (this.depthHistory.length > this.maxDepthHistory) {
      this.depthHistory.shift();
    }
    
    // Calculate smoothed depth from history
    if (this.depthHistory.length > 0) {
      let smoothedDepth = this.depthHistory.reduce((sum, val) => sum + val, 0) / this.depthHistory.length;
      
      // Map depth to scale factor (adjust these values based on your Kinect depth range)
      // Assuming depth values range from 0-255, map to scale multiplier 0.5-2.0
      let scaleMultiplier = map(smoothedDepth, 0, 255, 0.5, 2.0);
      
      // Apply the scale multiplier to base scale
      this.scale = this.baseScale * scaleMultiplier;
      this.scale = constrain(this.scale, 0.1, 3.0); // Prevent extreme scales
    }
  }
}
