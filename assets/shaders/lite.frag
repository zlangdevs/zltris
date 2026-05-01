#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
in vec2 vUv;
in vec2 vScreenUv;
in vec2 vPixel;
in vec2 vNdc;
in float vTime;
in vec4 vTint;

out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform vec2 uResolution;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec4 tex = texture(texture0, uv);
    vec3 src = tex.rgb;
    float brightness = dot(src, vec3(0.299, 0.587, 0.114));
    float gameMask = step(0.01, brightness);
    vec2 p = vNdc;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    vec3 bg = vec3(0.02, 0.0, 0.05);
    float t = vTime * 0.5;
    vec3 gameColor = src;
    gameColor += vec3(0.1, 0.0, 0.2) * (1.0 - brightness);
    float glass = sin(vNdc.y * 2.0 + vNdc.x + vTime) * 0.05;
    gameColor += glass * vec3(0.5, 0.2, 0.8) * gameMask;
    //vec3 finalOut = mix(bg, gameColor, gameMask);
    vec3 finalOut = gameColor;
    float vignette = smoothstep(1.8, 0.5, length(vNdc));
    finalOut *= vignette;
    finalColor = vec4(finalOut, 1.0) * fragColor * colDiffuse;
}
