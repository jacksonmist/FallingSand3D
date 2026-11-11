import * as THREE from 'three';
import {OrbitControls} from "three/addons";
import {VoxelChunk} from "./js/VoxelChunk";

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
const material = new THREE.ShaderMaterial({
    vertexShader: await loader.loadAsync("glsl/instanceTest.vs.glsl"),
    fragmentShader: await loader.loadAsync("glsl/instanceTest.fs.glsl")
});

const chunk = new VoxelChunk(material, 2, 2, 2);
const red = new THREE.Color(1.0, 0.0, 0.0);
function color(id) { return red; }

chunk.setVoxel(0, 0, 0, 1);
chunk.computeVisibleFaces();
chunk.constructMesh(color);

scene.add(chunk.mesh);

camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);
function mainLoop(time) {
    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(mainLoop);