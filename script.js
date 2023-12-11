/**
 * Variables
 */

// Main Settings
const settings = {
  xThreshold: 20,
  yThreshold: 35,
  strength: 0.17,
  originalImagePath: 'img1'
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
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


/**
 * Camera
 */

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 0.7
scene.add(camera)

let fovY = camera.position.z * camera.getFilmHeight() / camera.getFocalLength();


/**
* Images
*/

const textureLoader = new THREE.TextureLoader()

const loadImages = () => {

  if(originalImage !== null || depthImage !== null)
  {
    originalImage.dispose()
    depthImage.dispose()
  }
  depthImage = textureLoader.load("img/" + settings.originalImagePath + "_depth.jpg")

  originalImage = textureLoader.load( "img/" + settings.originalImagePath + ".jpg", function ( tex ) {
    originalImageDetails.width = tex.image.width;
    originalImageDetails.height = tex.image.height;
    originalImageDetails.aspectRatio = tex.image.height / tex.image.width;

    create3dImage();
    resize();
  } );
  
}

loadImages()


/**
 * Create 3D Image
 */

const create3dImage = () => {
  
  // Cleanup Geometry for GUI
  if(plane !== null)
  {
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
 * Add Settings to GUI
 */

gui.add(settings, 'originalImagePath', { 
  Image1: 'img1',
  Image2: 'img2',
  Image3: 'img3',
  Image4: 'img4',
  Image5: 'img5',
  Image6: 'img6',
  Image7: 'img7',
  Image8: 'img8',
  Image9: 'img9',
}).onFinishChange(loadImages).name('Image')
gui.add(settings, 'xThreshold').min(0).max(50).step(1).onFinishChange(loadImages).name('X Threshold')
gui.add(settings, 'yThreshold').min(0).max(50).step(1).onFinishChange(loadImages).name('Y Threshold')
gui.add(settings, 'strength').min(0).max(3).step(0.1).onFinishChange(loadImages).name('Strength')


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
  if(sizes.height/sizes.width < originalImageDetails.aspectRatio) {
    plane.scale.set( (fovY * camera.aspect), ((sizes.width / sizes.height) * originalImageDetails.aspectRatio), 1 );
  } else {
    plane.scale.set( (fovY / originalImageDetails.aspectRatio), fovY, 1 );
  }

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

window.addEventListener('resize', () =>
{
  resize()
})


/**
 * Cursor
 */

Parallax.init( view => {
  view.x *= 10;
  view.y *= 10;
  cursor.x = view.x;
  cursor.y = view.y;
});

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

const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Set Cursor Variables
  const parallaxX = cursor.x * settings.strength
  const parallaxY = cursor.y * settings.strength

  cursor.lerpX  += (parallaxX - cursor.lerpX ) * 5 * deltaTime;
  cursor.lerpY += (parallaxY - cursor.lerpY) * 5 * deltaTime;

  // Mouse Positioning Uniform Values
  planeMaterial.uniforms.uMouse.value = new THREE.Vector2(cursor.lerpX , cursor.lerpY)

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()