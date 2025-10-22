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
    this.depthHistory = [];
    this.maxDepthHistory = 15;
    this.isPlayingSound = 0;
  }

  flock(allGhosts) {
    this.acc.mult(0);
    let cohesion = this.computeCohesion(allGhosts);
    let alignment = this.computeAlignment(allGhosts);
    let separation = this.computeSeparation(allGhosts);
    let boundary = this.computeBoundary();
    cohesion.mult(0.01);
    alignment.mult(0.02);
    separation.mult(0.05);
    boundary.mult(1);
    this.acc.add(cohesion).add(alignment).add(separation).add(boundary);
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
    this.pos.add(this.vel);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading() + PI / 2);

    if (!this.isLeftSteering && this.imgIndex !== 0) {
      scale(-1, 1);
    }

    let depth = kinectDepth(this.pos.x, this.pos.y);
    if (depth && depth > 0) {
      this.depthHistory.push(depth);
      if (this.depthHistory.length > this.maxDepthHistory) {
        this.depthHistory.shift();
      }
      let avgDepth = this.depthHistory.reduce((sum, val) => sum + val, 0) / this.depthHistory.length;
      let lastScale = this.scale;
      this.scale = 2000 / avgDepth;

      if (this.scale / lastScale > 1.01 || this.scale > 1.3) {
        this.imgIndex = 6;
        if (this.scale / lastScale > 1.03 || this.scale > 1.5) {
          this.imgIndex = 5;
        }
        if (this.isPlayingSound === 0) {
          // Call the new leak-proof function, passing the audio buffer
          let pan = constrain((this.pos.x / width) * 2 - 1, -1, 1);
          let volume = constrain(this.scale / 8, 0, 0.5);
          let rate = random(0.9, 1.1);
          playSound(whistlingBuffer, volume, pan, rate);
          this.isPlayingSound = 120;
        }
      }
    }

    this.colorization.r = constrain(this.scale * this.opacity * 3, 220, 255);
    this.colorization.g = constrain(this.scale * this.opacity * 3.5, 220, 255);
    tint(this.colorization.r, this.colorization.g, this.colorization.b, this.opacity);
    if (annotationsOn) {
      tint(this.imgIndex * 40, 255 - this.imgIndex * 40, 100+ this.imgIndex * 30, 255);
    }
    this.opacity += random(-3, 3);
    this.opacity = constrain(this.opacity, 3, 160);

    image(ghostImages[this.imgIndex], 0, 0, 160 * this.scale * (this.age / 13) ** 0.2, 240 * this.scale * sqrt(this.age / 13));
    pop();
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
      // Call the new leak-proof function, passing the audio buffer
      let pan = constrain((this.pos.x / width) * 2 - 1, -1, 1);
      let volume = constrain(this.scale/20, 0, 1);
      let rate = random(0.9, 1.1);
      playSound(bumpBuffer, volume, pan, rate);
      this.isPlayingSound = 20;
    }
    return turnForce;
  }

  // --- Other Flocking & Steering Methods (Unchanged) ---
  
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
  
  calculateSteering() {
    let perpVel = createVector(-this.vel.y, this.vel.x);
    let steerProjection = this.acc.dot(perpVel.normalize());
    let steerMag = abs(steerProjection);
    this.isLeftSteering = steerProjection > 0;
    if (steerMag < 0.05) {
      this.imgIndex = 0;
    } else if (steerMag < 0.1) {
      this.imgIndex = 1;
    } else if (steerMag < 0.2) {
      this.imgIndex = 2;
    } else {
      this.imgIndex = 3;
    }
    if (steerMag < 0.1) {
      let velDir = this.vel.copy().normalize();
      let accDir = this.acc.copy().normalize();
      let dotProduct = velDir.dot(accDir);
      if (dotProduct < -0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 7; // skid stop
      } else if (dotProduct > 0.7 && this.acc.mag() > 0.1) {
        this.imgIndex = 6; // dash
      }
    }
  }
  
  annotate() {
    push();
    translate(this.pos.x, this.pos.y);
    stroke(255, 0, 0);
    strokeWeight(2);
    line(0, 0, this.vel.x * 10, this.vel.y * 10);
    fill(255, 255, 0);
    noStroke();
    textSize(12);
    text(round(this.age), 0, 0);
    stroke(0, 255, 0);
    strokeWeight(2);
    line(0, 0, this.acc.x * 100, this.acc.y * 100);
    pop();
  }
}