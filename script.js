/**
 * Variables
 */

// Main Settings
const settings = {
  xThreshold: 160,
  yThreshold: 160,
  strength: 0.2,
  originalImagePath: '1'
}

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Image Details
let originalImage = null
let depthImage = null
const originalImageDetails = {
  width: 0,
  height: 0,
  aspectRatio: 0,
}

// Geometries and Material
let planeGeometry = null
let planeMaterial = null
let plane = null

// Cursor Settings
const cursor = {
  x: 0,
  y: 0,
  lerpX: 0,
  lerpY: 0,
}

/**
 * Base
 */

// Debug
// const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


/**
 * Camera
 */

const camera = new THREE.PerspectiveCamera(120, sizes.height / sizes.width, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 0
scene.add(camera)

let fovY = 1.15;


/**
* Images
*/

const textureLoader = new THREE.TextureLoader()

const loadImages = () => {

  if (originalImage !== null || depthImage !== null) {
    originalImage.dispose()
    depthImage.dispose()
  }
  depthImage = textureLoader.load("img/1.jpg")

  originalImage = textureLoader.load("img/h/" + settings.originalImagePath + ".png", function (tex) {
    originalImageDetails.width = tex.image.width;
    originalImageDetails.height = tex.image.height;
    originalImageDetails.aspectRatio = tex.image.height / tex.image.width;

    create3dImage();
    resize();
  });

}
loadImages()


/**
 * Create 3D Image
 */

const create3dImage = () => {

  // Cleanup Geometry for GUI
  if (plane !== null) {
    planeGeometry.dispose()
    planeMaterial.dispose()
    scene.remove(plane)
  }

  planeGeometry = new THREE.PlaneBufferGeometry(1, 1);

  planeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      originalTexture: { value: originalImage },
      depthTexture: { value: depthImage },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uThreshold: { value: new THREE.Vector2(settings.xThreshold, settings.yThreshold) },
    },
    fragmentShader: `
      precision mediump float;
      uniform sampler2D originalTexture; 
      uniform sampler2D depthTexture; 
      uniform vec2 uMouse;
      uniform vec2 uThreshold;

      varying vec2 vUv;

      vec2 mirrored(vec2 v) {
        vec2 m = mod(v,2.);
        return mix(m,2.0 - m, step(1.0 ,m));
      }

      void main() {
        vec4 depthMap = texture2D(depthTexture, mirrored(vUv));
        vec2 fake3d = vec2(vUv.x + (depthMap.r - 0.5) * uMouse.x / uThreshold.x, vUv.y + (depthMap.r - 0.5) * uMouse.y / uThreshold.y);

        gl_FragColor = texture2D(originalTexture,mirrored(fake3d));
      }
    `,
    vertexShader: `
      varying vec2 vUv; 

      void main() {
        vUv = uv; 

        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewPosition; 
      }
    `
  });

  plane = new THREE.Mesh(planeGeometry, planeMaterial);

  scene.add(plane);
}
create3dImage();


/**
//  * Add Settings to GUI
//  */

// gui.add(settings, 'originalImagePath', { 
//   Image1: '1',
//   Image2: '2'
// }).onFinishChange(loadImages).name('Image')
// gui.add(settings, 'xThreshold').min(0).max(50).step(1).onFinishChange(loadImages).name('X Threshold')
// gui.add(settings, 'yThreshold').min(0).max(50).step(1).onFinishChange(loadImages).name('Y Threshold')
// gui.add(settings, 'strength').min(0).max(3).step(0.1).onFinishChange(loadImages).name('Strength')


/**
 * Resize
 */

const resize = () => {

  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update Image Size
  if (sizes.height / sizes.width < originalImageDetails.aspectRatio) {
    plane.scale.set((fovY * camera.aspect), ((sizes.width / sizes.height) * originalImageDetails.aspectRatio), 1);
  } else {
    plane.scale.set((fovY / originalImageDetails.aspectRatio), fovY, 1);
  }

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

window.addEventListener('resize', () => {
  resize()
})


/**
 * Cursor Parallax load the web camera and track the users head position  
 */


Parallax.init(view => {
  view.x *= 20;
  view.y *= 10;
  view.z *= 2.2;
  cursor.x = view.x;
  cursor.y = view.y;
  cursor.z = view.z;
}, {
  // smoothEye: 0.1, // smoothing eye (x, y)
  smoothDist: 0.15, // smoothing distance (z)
  defautDist: 0.12, // parameter for distance estimation
  threshold: 0.85 // blazeface detection probability
}
)

/**
 * Renderer
 */

const renderer = new THREE.WebGLRenderer({
  canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

const clock = new THREE.Clock();
let previousTime = 0;
let lastLerpXChangeTime = 0;
let lastLerpXValue = 0;

// Function to lerp camera position
const lerpCameraPosition = (targetPosition, alpha) => {
  camera.position.lerp(targetPosition, alpha);
};

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Set Cursor Variables
  const parallaxX = cursor.x * settings.strength;
  const parallaxY = cursor.y * settings.strength;
  const parallaxZ = cursor.z * settings.strength;

  // Check if cursor.lerpX has changed
  if (cursor.lerpX !== lastLerpXValue) {
    lastLerpXValue = cursor.lerpX;
    lastLerpXChangeTime = elapsedTime;
  }

  cursor.lerpX += (parallaxX - cursor.lerpX) * 5 * deltaTime;
  cursor.lerpY += (parallaxY - cursor.lerpY) * 5 * deltaTime;

  // Mouse Positioning Uniform Values
   planeMaterial.uniforms.uMouse.value = new THREE.Vector2(1,1);

  // Render
  renderer.render(scene, camera);

  const timeThreshold = 1.5; // seconds
  if (elapsedTime - lastLerpXChangeTime > timeThreshold) {
    // Change image every 5 seconds
    changeImageEvery5Seconds();

    // Gradual and eased camera position change
    const targetCameraPosition = new THREE.Vector3(0, 0, 0.27);
    const alpha = Math.min(deltaTime * 2, 1); // Gradual change over 0.5 seconds
    lerpCameraPosition(targetCameraPosition, alpha);
  } else {
    loadImages();

    // Gradual and eased camera position change
    const targetCameraPosition = new THREE.Vector3(
      cursor.x * 0.02,
      cursor.y * 0.02,
      parallaxZ * 0.03 + 0.2
    );
    const alpha = Math.min(deltaTime * 4, 1); // Gradual change over 0.5 seconds
    lerpCameraPosition(targetCameraPosition, alpha);
  }

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
