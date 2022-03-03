
let player = {
    x: 250,
    y: 250,
    keys: {
    },
    speed: 3,
    angle: 0,
    fov: 90
}

let pillars = {};

const CAN = {
    WIDTH: 540,
    HEIGHT: 540
}

const showRaymarching = false;

let firstPersonView = {
    list: new Array(player.fov),
};

function setup() {
    let cvs = createCanvas(CAN.WIDTH,CAN.HEIGHT)

    for (let i = 0; i < 6; i++) {
        let x = Math.cos(2 * Math.PI * i / 6) * 200 + CAN.WIDTH / 2
        let y = Math.sin(2 * Math.PI * i / 6) * 200 + CAN.HEIGHT / 2

        pillars["pillar_" + i] = new Pillar(x, y, 20);
    }

    document.getElementById("canvas-block").appendChild(cvs.canvas)
}

function draw() {
    background(0)
    fill(255)
    ellipse(player.x, player.y, 10, 10)

    let newPos = {
        x: player.x,
        y: player.y
    }

    if (player.keys["w"]) {
        newPos.y -= player.speed
    }
    if (player.keys["a"]) {
        newPos.x -= player.speed
    }
    if (player.keys["s"]) {
        newPos.y += player.speed
    }
    if (player.keys["d"]) {
        newPos.x += player.speed
    }

    let pinsideCircle = false;

    for (let key of Object.keys(pillars)) {
        if (insideCircle(newPos.x, newPos.y, pillars[key].x, pillars[key].y, pillars[key].radius)) {
            pinsideCircle = true;
        }
        pillars[key].draw()
    }

    if (!pinsideCircle) {
        player.x = newPos.x
        player.y = newPos.y
    }

    player.angle = toDeg(Math.atan2(mouseY - player.y, mouseX - player.x));

    let fovStart = {
        x: player.x + Math.cos(toRad(player.angle - 45)) * 100,
        y: player.y + Math.sin(toRad(player.angle - 45)) * 100,
        angle: -(player.fov / 2)
    }

    let fovEnd = {
        x: player.x + Math.cos(toRad(player.angle + 45)) * 100,
        y: player.y + Math.sin(toRad(player.angle + 45)) * 100,
        angle: player.fov / 2
    }

    stroke(0,255,0)
    line(player.x, player.y, mouseX, mouseY)
    line(mouseX, mouseY, Math.cos(toRad(player.angle)) * CAN.WIDTH + mouseX, Math.sin(toRad(player.angle)) * CAN.HEIGHT + mouseY);
    line(fovStart.x, fovStart.y, fovEnd.x, fovEnd.y)
    line(fovStart.x, fovStart.y, player.x, player.y)
    line(fovEnd.x, fovEnd.y, player.x, player.y)
    noStroke();

    let pillarsInFOV = [];

    for (let key of Object.keys(pillars)) {
        let pillar = pillars[key]
        let pangle = normalizeDegree(toDeg(Math.atan2(pillar.y - player.y, pillar.x - player.x)));

        let np = normalizeDegree(player.angle);

        let lowerLim = np - Math.abs(fovStart.angle);
        let upperLim = np + fovEnd.angle;

        if (upperLim > 360 && pangle < lowerLim) {
            lowerLim -= 360
            upperLim -= 360
        }

        if (pangle >= lowerLim && pangle <= upperLim) {
            pillarsInFOV.push(pillar)
        }
    }

    textSize(20)
    text("inview: " + pillarsInFOV.length, 20, 20)

    let angleFromFOVStartToFOVEnd = Math.atan2(fovEnd.y - fovStart.y, fovEnd.x - fovStart.x)
    let distanceForFOV = dist(fovStart.x, fovStart.y, fovEnd.x, fovEnd.y);

    const amountOfRays = 20;
    const rayMarchingTimes = 40;

    for (let i = 0; i < amountOfRays + 1; i++) {
        let percent = i / amountOfRays;

        let rayBeginning = {
            x: Math.cos(angleFromFOVStartToFOVEnd) * percent * distanceForFOV + fovStart.x,
            y: Math.sin(angleFromFOVStartToFOVEnd) * percent * distanceForFOV + fovStart.y
        }

        fill(0,0,255)
        ellipse(rayBeginning.x, rayBeginning.y, 5, 5);
    }

    for (let i = 0; i < Math.abs(fovStart.angle) + Math.abs(fovEnd.angle); i++) {
        let theta = toRad((player.angle - Math.abs(fovStart.angle)) + i);

        noFill();
        stroke(0,0,255);

        let raySize = 0;
        let lastRad = 0;
        for (let j = 0; j < rayMarchingTimes; j++) {
            let step = lastRad;

            let x = player.x + Math.cos(theta) * step;
            let y = player.y + Math.sin(theta) * step;

            let closePillar = getClosestPillar(x, y);
            let sdist = Math.abs(distanceSigned(closePillar.x, closePillar.y, x, y, closePillar.radius));

            let distFromPlayer = dist(player.x, player.y, x, y);

            lastRad = distFromPlayer + sdist;

            if (sdist < 0.001) {
                raySize = distFromPlayer;
                break;
            }

            if (insideCircle(x, y, closePillar.x, closePillar.y, closePillar.radius)) {
                raySize = distFromPlayer;
                break;
            }
            
            if (i == 20 && showRaymarching) {
                ellipse(x, y, sdist * 2, sdist * 2);
            }
        }

        if (raySize <= 0) {
            raySize = 1000;
        } 

        firstPersonView.list[i] = raySize;

        let linex = player.x + Math.cos(theta) * raySize;
        let liney = player.y + Math.sin(theta) * raySize;

        stroke(255,0,0)
        line(player.x, player.y, linex, liney)

        noStroke();
        fill(0);
    }

    if (mouseDown && grabbedPillar != "") {
        let pillar = pillars[grabbedPillar]
        pillar.x = mouseX
        pillar.y = mouseY
    }

    afterDraw();
}

const firstPersonCanvas = document.getElementById("first-person");
const ctx = firstPersonCanvas.getContext("2d");

const fpc = {
    width: firstPersonCanvas.width,
    height: firstPersonCanvas.height,
}

function afterDraw() {
    ctx.clearRect(0, 0, fpc.width, fpc.height);
    //black rect over the canvas
    ctx.fillStyle = "#21a3ff";
    ctx.fillRect(0, 0, fpc.height, fpc.height);

    let pixelPerRay = fpc.width / firstPersonView.list.length;

    let lastValue = 0;
    let maxValue = 0;
    for (let x = 0; x < firstPersonView.list.length; x++) {
        let ray = firstPersonView.list[x];

        let center = { x: x * pixelPerRay, y: fpc.height / 2 };

        let grd = ctx.createLinearGradient(center.x, center.y, center.x, fpc.height);
        grd.addColorStop(0, "#a8ffa8");
        grd.addColorStop(1, "green");

        if (ray <= 0 || ray >= 999) {
            //Draw a gradient from the center to the edge of the canvas
            ctx.fillStyle = grd;
            ctx.fillRect(center.x, center.y, pixelPerRay, fpc.height / 2);

            lastValue = 0;
            maxValue = 0;
            continue;
        }
        
        let heightPercent = clamp(ray / 1000, 0, 1);
        let height = fpc.height * (1 - heightPercent);
        let y = heightPercent * fpc.height;

        if (height - y < 0) {
            ctx.fillStyle = grd;
            ctx.fillRect(center.x, center.y, pixelPerRay, fpc.height / 2);
            lastValue = 0;
            maxValue = 0;
            continue;
        }

        let scaledColor = scaleColor(255, 255, 255, (1 - heightPercent) / 2 + 0.5);

        if (lastValue == 0) {
            lastValue = scaledColor.r;
        }

        if (maxValue == 0) {
            maxValue = scaledColor.r + 0.01;
        }

        let percentFromLast = (scaledColor.r - lastValue) / (maxValue - lastValue);
        let col = lastValue + (percentFromLast * 255);

        if (col < lastValue) col = lastValue;

        ctx.fillStyle = `rgb(${col}, ${col}, ${col})`;
        ctx.fillRect(x * pixelPerRay, y, pixelPerRay, height - y);

        ctx.fillStyle = grd;
        ctx.fillRect(x * pixelPerRay, y + (height - y), pixelPerRay, fpc.height - y);
    }
}

window.addEventListener("keypress", (e) => {
    player.keys[e.key] = true;
})

window.addEventListener("keyup", (e) => {
    player.keys[e.key] = false;
})

let grabbedPillar = "";
let mouseDown = false;

function mousePressed() {
    for (let key of Object.keys(pillars)) {
        if (mouseX > pillars[key].x - pillars[key].radius && mouseX < pillars[key].x + pillars[key].radius && mouseY > pillars[key].y - pillars[key].radius && mouseY < pillars[key].y + pillars[key].radius) {
            grabbedPillar = key;
            mouseDown = true;
            pillars[key].grabbed = true;
        }
    }
}

function mouseReleased() {
    if (grabbedPillar != "") pillars[grabbedPillar].grabbed = false;
    mouseDown = false;
    grabbedPillar = "";
}


class Pillar {
    constructor(x, y, radius) {
        this.x = x
        this.y = y
        this.radius = radius;
        this.grabbed = false;
    }
    draw() {
        fill(this.grabbed ? 0 : 255, 255, this.grabbed ? 0 : 255);
        ellipse(this.x, this.y, this.radius * 2, this.radius * 2)
        noStroke();
    }
}

function toDeg(rad) {
    return rad * 180 / Math.PI
}

function toRad(deg) {
    return deg * Math.PI / 180
}

function normalizeDegree(deg) {
    if (deg < 0) {
        return deg + 360;
    }

    if (deg > 360) {
        return deg - 360;
    }

    return deg;
}

function distanceSigned(x1, y1, x2, y2, radius) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) - radius;
}

function getClosestPillar(x, y) {
    let closestDistance = 0;
    let closestPillar = null;

    for (let key of Object.keys(pillars)) {
        let pillar = pillars[key];
        let distance = dist(x, y, pillar.x, pillar.y);

        if (closestPillar == null || distance < closestDistance) {
            closestDistance = distance;
            closestPillar = pillar;
        }
    }

    return closestPillar;
}

function insideCircle(x, y, cx, cy, radius) {
    return Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) < radius;
}

function scaleColor(r, g, b, scale) {
    return {
        r: r * scale,
        g: g * scale,
        b: b * scale
    }
}

function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
}

function addPillar() {
    let key = "p" + Object.keys(pillars).length;
    pillars[key] = new Pillar(CAN.WIDTH / 2, CAN.HEIGHT / 2, Math.random() * 30 + 10);
}