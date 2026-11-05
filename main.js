import * as THREE from 'three';

const h = window.innerHeight;
const w = window.innerWidth;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    w / h,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const loader = new THREE.FileLoader();

const geometry = new THREE.PlaneGeometry();
const material = new THREE.ShaderMaterial({
    vertexShader: await loader.loadAsync("glsl/instanceTest.vs.glsl"),
    fragmentShader: await loader.loadAsync("glsl/instanceTest.fs.glsl")
});

const mesh = new THREE.InstancedMesh(geometry, material, 3);
mesh.setColorAt(0, new THREE.Color(1.0, 0.0, 0.0));
mesh.setColorAt(1, new THREE.Color(0.0, 1.0, 0.0));
mesh.setColorAt(2, new THREE.Color(0.0, 0.0, 1.0));
mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-1.0, 0.0, 0.0));
mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0.0, 0.0, 0.0));
mesh.setMatrixAt(2, new THREE.Matrix4().makeTranslation(1.0, 0.0, 0.0));

mesh.instanceColor.needsUpdate = true;
mesh.instanceMatrix.needsUpdate = true;

scene.add(mesh);

camera.position.z = 5;

function mainLoop(time) {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(mainLoop);