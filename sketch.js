//tu run this you need to make an http server so it can read all the files.
//then goto localhost:8000 to see the page. everything else should work.

let sketchRNN;
let currentStroke;
let x, y;
let nextPen = "down";
let seedPath = [];
let seedPoints = [];
let personDrawing = false;
var result;
let websocket = new WebSocket("wss://arch7210-fall2019.coditect.com/pablo");
let cWidth = 800;
let cHeight = 800;
let robotPenDown = true;
let outWidthHeight = 15;
function preload() {
  sketchRNN = ml5.sketchRNN("cat");
}

function startDrawing() {
  personDrawing = true;
  x = mouseX;
  y = mouseY;
}

function sketchRNNStart() {
  personDrawing = false;

  // Perform RDP Line Simplication
  const rdpPoints = [];
  const total = seedPoints.length;
  const start = seedPoints[0];
  const end = seedPoints[total - 1];
  rdpPoints.push(start);
  rdp(0, total - 1, seedPoints, rdpPoints);
  rdpPoints.push(end);

  // Drawing simplified path
  background(180);
  stroke(0);
  strokeWeight(4);
  beginShape();
  noFill();
  let i = 0;
  for (let v of rdpPoints) {
    if (i === 0) {
      let command = {
        method: "penup",
        id: "command_1"
      };
      websocket.send(JSON.stringify(command));
      robotPenDown = false;
    } else if (i === 1) {
      let command = {
        method: "pendown",
        id: "command_1"
      };
      websocket.send(JSON.stringify(command));
      robotPenDown = true;
    }
    vertex(v.x, v.y);
    let command = {
      method: "goto",
      params: pixToInch(
        [v.x, v.y],
        cWidth,
        cHeight,
        outWidthHeight,
        outWidthHeight
      ),
      id: "command_1"
    };
    websocket.send(JSON.stringify(command));
    i++;
  }
  endShape();

  x = rdpPoints[rdpPoints.length - 1].x;
  y = rdpPoints[rdpPoints.length - 1].y;

  seedPath = [];
  // Converting to SketchRNN states
  for (let i = 1; i < rdpPoints.length; i++) {
    let strokePath = {
      dx: rdpPoints[i].x - rdpPoints[i - 1].x,
      dy: rdpPoints[i].y - rdpPoints[i - 1].y,
      pen: "down"
    };
    //line(x, y, x + strokePath.dx, y + strokePath.dy);
    //x += strokePath.dx;
    //y += strokePath.dy;
    seedPath.push(strokePath);
  }

  sketchRNN.generate(seedPath, gotStrokePath);
}

function setup() {
  let canvas = createCanvas(cWidth, cHeight);
  canvas.mousePressed(startDrawing);
  canvas.mouseReleased(sketchRNNStart);
  // x = width / 2;
  // y = height / 2;
  clear();
  background(180);
  //sketchRNN.generate(gotStrokePath);
  console.log("model loaded");
}

function gotStrokePath(error, strokePath) {
  //console.error(error);
  //console.log(strokePath);
  currentStroke = strokePath;
}

function draw() {
  stroke(0);
  strokeWeight(4);

  if (personDrawing) {
    // let strokePath = {
    //   dx: mouseX - pmouseX,
    //   dy: mouseY - pmouseY,
    //   pen: 'down'
    // }
    // line(x, y, x + strokePath.dx, y + strokePath.dy);
    // x += strokePath.dx;
    // y += strokePath.dy;
    // seedPath.push(strokePath);

    line(mouseX, mouseY, pmouseX, pmouseY);
    seedPoints.push(createVector(mouseX, mouseY));
  }

  if (currentStroke) {
    if (nextPen == "end") {
      //   sketchRNN.reset();
      //   sketchRNNStart();
      //   currentStroke = null;
      noLoop();
      //   nextPen = "down";
      return;
    }

    if (nextPen == "down") {
      if (robotPenDown == false) {
        let command = {
          method: "pendown",
          id: "command_1"
        };
        websocket.send(JSON.stringify(command));
        robotPenDown = true;
      }
      line(x, y, x + currentStroke.dx, y + currentStroke.dy);
      let command = {
        method: "goto",
        params: pixToInch(
          [x, y],
          cWidth,
          cHeight,
          outWidthHeight,
          outWidthHeight
        ),
        id: "command_1"
      };
      websocket.send(JSON.stringify(command));
    } else if (nextPen == "up") {
      if (robotPenDown == true) {
        let command = {
          method: "penup",
          id: "command_1"
        };
        websocket.send(JSON.stringify(command));
        robotPenDown = false;
      }
      command = {
        method: "goto",
        params: pixToInch(
          [x, y],
          cWidth,
          cHeight,
          outWidthHeight,
          outWidthHeight
        ),
        id: "command_1"
      };
      websocket.send(JSON.stringify(command));
    }
    x += currentStroke.dx;
    y += currentStroke.dy;
    nextPen = currentStroke.pen;
    currentStroke = null;
    sketchRNN.generate(gotStrokePath);
  }
}

function pixToInch(point, cWidth, cHeight, outWidth, outHeight) {
  let px = ((point[0] - cWidth) / cWidth) * outWidth;
  let py = ((point[1] - cHeight) / cHeight) * outHeight;
  return [px, py];
}
