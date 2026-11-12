out vec3 norm;

void main() {
    norm = instanceNormal;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0f);
}