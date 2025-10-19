class Ghost {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().setMag(maxSpeed * random(0.5, 1));
    this.acc = createVector(0, 0);
    this.age = random(3, 20);
    this.baseScale = 0.5 * sqrt(random(1, 6));
    this.scale = this.baseScale;
    this.opacity = random(5, 100);
    this.colorization = { r: 255, g: 255, b: 255 };
    this.imgIndex = 0;
    this.isLeftSteering = true;
    this.depthHistory = []; // Store recent valid depth values
    this.maxDepthHistory = 15; // Number of frames to average
    this.isPlayingSound = 0;
  }

  flock(allGhosts) {
    let cohesion = this.computeCohesion(allGhosts);
    let alignment = this.computeAlignment(allGhosts);
    let separation = this.computeSeparation(allGhosts);
    let boundary = this.computeBoundary();
    cohesion.mult(0.01);
    alignment.mult(0.02);
    separation.mult(0.05);
    boundary.mult(1);
    this.acc.add(cohesion).add(alignment).add(separation).add(boundary);
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
    this.calculateSteering();
    if (this.isPlayingSound > 0) {
      this.isPlayingSound--;
    }
    this.vel.add(this.acc);
    let speed = this.vel.mag();
    speed = constrain(speed, 0.3 * maxSpeed, 1.2 * maxSpeed);
    this.vel.setMag(speed);
    if (annotationsOn) {
      push();
      translate(this.pos.x, this.pos.y);
      stroke(255, 0, 0);
      strokeWeight(2);
      line(0, 0, this.vel.x * 10, this.vel.y * 10);
      fill(255, 255, 0);
      noStroke();
      text(round(this.age), 0, 0);
      pop();
    }
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + PI / 2);
    if (!this.isLeftSteering && this.imgIndex !== 0) {
      scale(-1, 1);
    }
    // Smooth scale using depth history, only for valid non-zero depths
    let depth = kinectDepth(this.pos.x, this.pos.y);
    if (depth && depth > 0) {
      this.depthHistory.push(depth);
      if (this.depthHistory.length > this.maxDepthHistory) {
        this.depthHistory.shift();
      }
      let avgDepth = this.depthHistory.reduce((sum, val) => sum + val, 0) / this.depthHistory.length;
      let lastScale = this.scale;
      this.scale = 2000 / avgDepth; // Update scale only for valid depths
      if (this.scale / lastScale > 1.01 || this.scale>1.5) {
        this.imgIndex = 5;
        if (!this.isPlayingSound) {
          whistlingSound.play();
          whistlingSound.setVolume(constrain(this.scale/6,0,0.5));
          whistlingSound.pan(constrain((this.pos.x / width) * 2 - 1, -1, 1));
          this.isPlayingSound = 120;
          console.log("Playing whistling sound");
        }
        // console.log("Sudden jump when depth changes" );
      }
    }
    // If depth is 0 or null, scale remains unchanged (no fallback to baseScale)
    this.colorization.r = constrain(this.scale * this.opacity * 3, 220, 255);
    this.colorization.g = constrain(this.scale * this.opacity * 3.5, 220, 255);
    tint(this.colorization.r, this.colorization.g, this.colorization.b, this.opacity);
    this.opacity += random(-1, 1);
    this.opacity = constrain(this.opacity, 3, 160);
    if (annotationsOn) {
      if (this.imgIndex === 5) {
        tint(0, 255, 0); 
      } else if (this.imgIndex === 3) {
        tint(255, 0, 0);
      } else if (this.imgIndex === 4) {
        tint(0, 0, 255);
      } else if (this.imgIndex === 1) {
        tint(255, 255, 0);
      } else if (this.imgIndex === 2) {
        tint(0, 255, 255);
      } else {
        tint(255, 255, 255);
      }
      this.opacity = 100;
      this.scale = 0.5;
    }
    // if (this.imgIndex === 5) {console.log("SHOULD DRAW 5");}
    image(ghostImages[this.imgIndex], 0, 0, 80 * this.scale * (this.age / 13) ** 0.2, 240 * this.scale * sqrt(this.age / 13));
    pop();
  }

  computeCohesion(allGhosts) {
    let steerForce = createVector(0, 0);
    let count = 0;
    for (let other of allGhosts) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (this !== other && d > 0 && d < perceptionRadius) {
        let toOther = p5.Vector.sub(other.pos, this.pos);
        steerForce.add(toOther);
        count++;
      }
    }
    if (count > 0) {
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
        avgVel.add(other.vel);
        count++;
      }
    }
    if (count > 0) {
      avgVel.setMag(maxSpeed);
    }
    return avgVel;
  }

  computeSeparation(allGhosts) {
    let steerForce = createVector(0, 0);
    let count = 0;
    for (let other of allGhosts) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (this !== other && d > 0 && d < separationDistance) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);
        steerForce.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steerForce.div(count);
      steerForce.setMag(maxSpeed);
    }
    return steerForce;
  }

  computeBoundary() {
    let margin = 50;
    let turnForce = createVector(0, 0);
    let turnStrength = 0.8;
    if (this.pos.x < margin) {
      turnForce.x = (turnStrength * (margin - this.pos.x)) / margin;
    } else if (this.pos.x > width - margin) {
      turnForce.x = (-turnStrength * (this.pos.x - (width - margin))) / margin;
    }
    if (this.pos.y < margin) {
      turnForce.y = (turnStrength * (margin - this.pos.y)) / margin;
    } else if (this.pos.y > height - margin) {
      turnForce.y = (-turnStrength * (this.pos.y - (height - margin))) / margin;
    }
    if (turnForce.mag() > 0 && this.isPlayingSound === 0) {
      bumpSound.play();
      bumpSound.setVolume(constrain(this.scale,0,1));
      bumpSound.pan(constrain((this.pos.x / width) * 2 - 1, -1, 1));
      console.log("Playing boundary sound at position:", this.pos.x, this.pos.y);
      this.isPlayingSound = 120;
      
    }
    return turnForce;
  }

  calculateSteering() {
    let perpVel = createVector(-this.vel.y, this.vel.x);
    let steerProjection = this.acc.dot(perpVel.normalize());
    let steerMag = abs(steerProjection);
    this.isLeftSteering = steerProjection > 0;
    if (steerMag < 0.15) {
      this.imgIndex = 0;
    } else if (steerMag < 0.3) {
      this.imgIndex = 1;
    } else {
      this.imgIndex = 2;
    }
    if (steerMag < 0.1) {
      let velDir = this.vel.copy().normalize();
      let accDir = this.acc.copy().normalize();
      let dotProduct = velDir.dot(accDir);
      if (dotProduct < -0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 3;
        // if (!this.isPlayingSound) {
        //   bumpSound.play();
        //   this.isPlayingSound = 120;
        // }
      } else if (dotProduct > 0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 4;
      }
    }
  }
}