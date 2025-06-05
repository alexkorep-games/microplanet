import * as THREE from 'three';

let scene, camera, renderer, clock;
let planet, ship, shipPivot;
let stars;
let balls = [];

const numBalls = 20;

const skyColorNear = new THREE.Color(0x87ceeb); // light blue
const spaceColor = new THREE.Color(0x000000); // black
const skyTransitionStart = 20; // altitude where sky starts fading
const skyTransitionEnd = 50; // altitude where space is fully visible

const planetRadius = 50;
let currentAltitude = 15; // Altitude above planet surface
const shipSize = 2;

const keys = {}; // To store key states
let leftJoystick, rightJoystick;
let leftTouch = null;
let rightTouch = null;

// --- INITIALIZATION ---
function init() {
  // Scene
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  // Initial camera position will be set relative to the ship later

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(spaceColor);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);
  // const helper = new THREE.CameraHelper( directionalLight.shadow.camera );
  // scene.add( helper );

  // Planet
  createPlanet();

  // Ship
  createShip();

  // Balls
  createBalls();

  // Stars
  createStars();

  // Event Listeners
  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  setupTouchControls();

  // Start animation loop
  animate();
}

// --- OBJECT CREATION ---
function createPlanet() {
  const planetGeometry = new THREE.SphereGeometry(planetRadius, 64, 64);
  const planetMaterial = new THREE.MeshStandardMaterial({
    color: 0x6688aa, // Bluish-grey
    roughness: 0.8,
    metalness: 0.2,
    // wireframe: true
  });

  // Deform geometry for mountains
  const positions = planetGeometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const originalLength = vertex.length();

    // Simple noise - can be improved with Perlin/Simplex noise
    let displacement = 0;
    // Adjust these multipliers for different mountain patterns
    displacement +=
      Math.sin(vertex.x * 0.1) * Math.cos(vertex.y * 0.15) * 3;
    displacement +=
      Math.sin(vertex.z * 0.12) * Math.cos(vertex.x * 0.08) * 2.5;
    displacement = Math.max(0, displacement); // Mountains only go up

    vertex
      .normalize()
      .multiplyScalar(originalLength + displacement * 0.3); // Scale displacement
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  planetGeometry.computeVertexNormals(); // Important for correct lighting after deformation

  planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planet.receiveShadow = true;
  scene.add(planet);
}

function createShip() {
  // Ship Pivot - This object will be at the ship's position and orientation
  // The ship model and camera will be children of this or positioned relative to it.
  shipPivot = new THREE.Object3D();
  shipPivot.position.set(0, planetRadius + currentAltitude, 0); // Start above north pole
  scene.add(shipPivot);

  // Ship Model (simple cone)
  const shipGeometry = new THREE.ConeGeometry(
    shipSize * 0.5,
    shipSize * 2,
    8
  );
  const shipMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    roughness: 0.5,
    metalness: 0.5,
  });
  ship = new THREE.Mesh(shipGeometry, shipMaterial);
  ship.castShadow = true;
  ship.rotation.x = Math.PI / 2; // Point cone forward (along its local Z)

  // Attach ship model to the pivot, slightly offset if needed (not needed here)
  shipPivot.add(ship);
}

function createBalls() {
  for (let i = 0; i < numBalls; i++) {
    const ballRadius = Math.random() * 1 + 0.5;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 16, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;

    const phi = Math.random() * (Math.PI / 6); // near the north pole
    const theta = Math.random() * Math.PI * 2;
    const r = planetRadius + ballRadius;
    ball.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );

    balls.push(ball);
    scene.add(ball);
  }
}

function createStars() {
  const starGeometry = new THREE.SphereGeometry(1000, 64, 64);
  const starMaterial = new THREE.MeshBasicMaterial({
    map: createStarTexture(),
    side: THREE.BackSide,
    transparent: true,
    opacity: 1,
  });
  stars = new THREE.Mesh(starGeometry, starMaterial);
  scene.add(stars);
}

function createStarTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 1.5;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

// --- EVENT HANDLERS ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  keys[event.key.toLowerCase()] = true;
  keys[event.code] = true; // For arrow keys etc.
}

function onKeyUp(event) {
  keys[event.key.toLowerCase()] = false;
  keys[event.code] = false;
}

// Touch controls
function setupTouchControls() {
  leftJoystick = document.getElementById("joystick-left");
  rightJoystick = document.getElementById("joystick-right");
  if (!leftJoystick || !rightJoystick) return;

  leftJoystick.addEventListener("touchstart", handleLeftStart);
  leftJoystick.addEventListener("touchmove", handleLeftMove);
  leftJoystick.addEventListener("touchend", handleLeftEnd);
  leftJoystick.addEventListener("touchcancel", handleLeftEnd);

  rightJoystick.addEventListener("touchstart", handleRightStart);
  rightJoystick.addEventListener("touchmove", handleRightMove);
  rightJoystick.addEventListener("touchend", handleRightEnd);
  rightJoystick.addEventListener("touchcancel", handleRightEnd);
}

function handleLeftStart(e) {
  const t = e.changedTouches[0];
  leftTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY };
}

function handleLeftMove(e) {
  if (!leftTouch) return;
  for (const t of e.changedTouches) {
    if (t.identifier === leftTouch.id) {
      const dx = t.clientX - leftTouch.startX;
      const dy = t.clientY - leftTouch.startY;
      const threshold = 15;
      keys["a"] = dx < -threshold;
      keys["s"] = dx > threshold;
      keys["w"] = dy < -threshold;
      break;
    }
  }
}

function handleLeftEnd(e) {
  for (const t of e.changedTouches) {
    if (leftTouch && t.identifier === leftTouch.id) {
      keys["a"] = keys["s"] = keys["w"] = false;
      leftTouch = null;
      break;
    }
  }
}

function handleRightStart(e) {
  const t = e.changedTouches[0];
  rightTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY };
}

function handleRightMove(e) {
  if (!rightTouch) return;
  for (const t of e.changedTouches) {
    if (t.identifier === rightTouch.id) {
      const dx = t.clientX - rightTouch.startX;
      const dy = t.clientY - rightTouch.startY;
      // right joystick unused in simplified controls
      break;
    }
  }
}

function handleRightEnd(e) {
  for (const t of e.changedTouches) {
    if (rightTouch && t.identifier === rightTouch.id) {
      // no keys to reset for right joystick
      rightTouch = null;
      break;
    }
  }
}

// --- UPDATE & ANIMATION ---
function handleControls(deltaTime) {
  const turnSpeed = 1.0 * deltaTime; // radians per second
  const forwardSpeed = 10.0 * deltaTime; // units per second

  // --- Ship Orientation relative to its current position and planet center ---
  const shipUpVector = shipPivot.position.clone().normalize();

  // Turning (A/S or ArrowLeft/ArrowRight)
  let yawAngle = 0;
  if (keys["a"] || keys["ArrowLeft"]) yawAngle = turnSpeed;
  if (keys["s"] || keys["ArrowRight"]) yawAngle = -turnSpeed;
  if (yawAngle !== 0) {
    shipPivot.rotateOnWorldAxis(shipUpVector, yawAngle);
  }

  // Move forward (W)
  if (keys["w"]) {
    const forward = new THREE.Vector3();
    shipPivot.getWorldDirection(forward);
    // remove vertical component to keep motion along the surface
    forward.sub(shipUpVector.clone().multiplyScalar(forward.dot(shipUpVector)));
    forward.normalize();
    shipPivot.position.add(forward.multiplyScalar(forwardSpeed));
  }

  // Altitude (R/F)
  if (keys["r"]) currentAltitude += altitudeSpeed * deltaTime * 25; // Faster altitude change
  if (keys["f"]) currentAltitude -= altitudeSpeed * deltaTime * 25;
  currentAltitude = Math.max(shipSize * 0.5, currentAltitude); // Don't go below surface (approx)

  shipPivot.position
    .normalize()
    .multiplyScalar(planetRadius + currentAltitude);

  shipPivot.up.copy(shipUpVector); // keep ship upright
}

function updateCamera() {
  // Camera follows shipPivot
  // Desired position: behind and slightly above the ship model
  const offset = new THREE.Vector3(0, shipSize * 1.5, shipSize * 4); // Local offset from ship
  const desiredCameraPosition = ship.localToWorld(offset.clone()); // ship model's local space

  // Smoothly interpolate camera position
  camera.position.lerp(desiredCameraPosition, 0.1);

  // Camera lookAt target: slightly in front of the ship model
  const lookAtOffset = new THREE.Vector3(
    0,
    shipSize * 0.5,
    -shipSize * 5
  ); // look slightly ahead
  const desiredLookAt = ship.localToWorld(lookAtOffset.clone());

  // Store the current orientation
  const currentCamQuat = camera.quaternion.clone();

  // Compute the target orientation by looking at the desired point
  camera.lookAt(desiredLookAt);
  const targetQuat = camera.quaternion.clone();

  // Restore the previous orientation and slerp toward the target
  camera.quaternion.copy(currentCamQuat);
  camera.quaternion.slerp(targetQuat, 0.1);

  // A simpler lookAt, less prone to issues if the above is jumpy:
  // camera.lookAt(shipPivot.position); // Look at the pivot point (center of ship)
}

function updateCameraStable() {
  // More stable camera
  const relativeCameraOffset = new THREE.Vector3(0, 2.5, 7); // x, y, z offset in ship's local space

  // Transform offset to world space based on shipPivot's orientation
  const cameraOffset = relativeCameraOffset
    .clone()
    .applyQuaternion(shipPivot.quaternion);
  const cameraPosition = shipPivot.position.clone().add(cameraOffset);

  camera.position.lerp(cameraPosition, 0.1); // Smooth transition

  // Look at a point slightly in front of the shipPivot's center
  const lookAtTarget = new THREE.Vector3(0, 0, -10); // Point in front of ship in its local space
  lookAtTarget.applyQuaternion(shipPivot.quaternion); // Transform to world space
  lookAtTarget.add(shipPivot.position); // Add ship's position

  camera.lookAt(lookAtTarget);
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  handleControls(deltaTime);

  // Ensure shipPivot's "up" is always pointing away from the planet center
  // This corrects any drift from rotations
  const newUp = shipPivot.position.clone().normalize();
  const forward = new THREE.Vector3();
  shipPivot.getWorldDirection(forward); // Get current forward direction

  // Create a target lookAt point based on current forward, but aligned with newUp
  const lookAtPoint = shipPivot.position.clone().add(forward);
  shipPivot.up.copy(newUp);
  shipPivot.lookAt(lookAtPoint); // This reorients the pivot correctly

  // Collision with planet (simple height check for now, not terrain height)
  const terrainHeightAtShip = getTerrainHeight(shipPivot.position);
  if (
    currentAltitude <
    terrainHeightAtShip - planetRadius + shipSize * 0.2
  ) {
    // shipSize*0.2 is a small buffer
    currentAltitude = terrainHeightAtShip - planetRadius + shipSize * 0.2;
    shipPivot.position
      .normalize()
      .multiplyScalar(planetRadius + currentAltitude);
    // Optionally add a small bounce or stop effect
  }

  // updateCamera();
  updateCameraStable();

  // Adjust sky color based on altitude
  const t = THREE.MathUtils.clamp(
    (currentAltitude - skyTransitionStart) /
      (skyTransitionEnd - skyTransitionStart),
    0,
    1
  );
  const newColor = skyColorNear.clone().lerp(spaceColor, t);
  renderer.setClearColor(newColor, 1);
  if (stars && stars.material) {
    stars.material.opacity = t;
    stars.material.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// --- UTILITY ---
function getTerrainHeight(worldPosition) {
  // For a perfectly spherical planet without deformation, this would be planetRadius.
  // With deformation, we need to find the actual surface height at this point.
  // This is a simplified estimation by "sampling" the noise function again.
  // A more accurate way would be raycasting from ship to planet center.

  const localPoint = worldPosition.clone().normalize(); // Direction from planet center

  let displacement = 0;
  displacement +=
    Math.sin(localPoint.x * planetRadius * 0.1) *
    Math.cos(localPoint.y * planetRadius * 0.15) *
    3;
  displacement +=
    Math.sin(localPoint.z * planetRadius * 0.12) *
    Math.cos(localPoint.x * planetRadius * 0.08) *
    2.5;
  displacement = Math.max(0, displacement);

  return planetRadius + displacement * 0.3;
}

export default init;
