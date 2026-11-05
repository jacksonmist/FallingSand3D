out vec3 iColor;

void main() {
    iColor = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * instanceMatrix * modelMatrix * vec4(position, 1.0f);
}