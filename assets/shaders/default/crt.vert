#version 330

in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec4 vertexColor;

out vec2 fragTexCoord;
out vec4 fragColor;
out vec2 vUv;
out vec2 vScreenUv;
out vec2 vPixel;
out vec2 vNdc;
out float vTime;
out vec4 vTint;

uniform mat4 mvp;
uniform vec2 uResolution;
uniform float uTime;

void main() {
    fragTexCoord = vertexTexCoord;
    fragColor = vertexColor;
    vUv = vertexTexCoord;
    vTime = uTime;
    vTint = vertexColor;

    vec4 clip = mvp * vec4(vertexPosition, 1.0);
    gl_Position = clip;

    vec2 su = vec2(vertexTexCoord.x, 1.0 - vertexTexCoord.y);
    vScreenUv = su;
    vNdc = su * 2.0 - 1.0;
    vec2 safeRes = max(uResolution, vec2(1.0));
    vPixel = su * safeRes;
}
