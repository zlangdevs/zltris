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

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec4 tex = texture(texture0, uv);
    vec3 src = tex.rgb;
    float brightness = dot(src, vec3(0.299, 0.587, 0.114));
    float gameMask = step(0.01, brightness);
    vec2 p = vNdc;
    p.x *= vPixel.x / vPixel.y; 
    vec3 bg = vec3(0.02, 0.0, 0.05); 
    float t = vTime * 0.5; 
    for(float i = 1.0; i < 4.0; i++) {
        vec2 uv2 = p * (i * 0.8);
        float a = atan(uv2.y, uv2.x);
        float r = length(uv2);
        vec2 st = vec2(a / 6.28 + t * 0.1, 1.0 / r + t);
        float stars = texture(texture0, fract(st)).r; 
        stars = pow(stars, 10.0) * smoothstep(0.1, 0.5, r);
        bg += stars * vec3(0.6, 0.4, 0.9) * (1.0 / i);
    }
    vec3 gameColor = src;
    gameColor += vec3(0.1, 0.0, 0.2) * (1.0 - brightness); 
    float glass = sin(vNdc.y * 2.0 + vNdc.x + vTime) * 0.05;
    gameColor += glass * vec3(0.5, 0.2, 0.8) * gameMask;
    vec3 finalOut = mix(bg, gameColor, gameMask);
    float vignette = smoothstep(1.8, 0.5, length(vNdc));
    finalOut *= vignette;
    finalColor = vec4(finalOut, 1.0) * fragColor * colDiffuse;
}
