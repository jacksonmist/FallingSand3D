in vec3 norm;

void main() {
    gl_FragColor = vec4((norm + 1.0) / 2.0, 1.0);
}