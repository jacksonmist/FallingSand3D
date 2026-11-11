out vec3 iColor;

//in mat4 instanceMatrix;
//in vec3 instanceColor;

void main() {
    iColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0f);
}