#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
in vec2 vScreenUv;
in vec2 vPixel;
in float vTime;

out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform vec2 uResolution;

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec3 src = texture(texture0, uv).rgb;
    float y = luma(src);
    float t = vTime;

    vec3 bgA = vec3(0.04, 0.10, 0.22);
    vec3 bgB = vec3(0.02, 0.22, 0.34);
    vec3 lineC = vec3(0.44, 0.95, 1.00);
    vec3 warm = vec3(1.00, 0.78, 0.38);

    float wave = 0.5 + 0.5 * sin(vScreenUv.y * 8.0 + t * 0.8 + vScreenUv.x * 2.0);
    vec3 base = mix(bgA, bgB, wave);

    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    float r = luma(texture(texture0, uv + vec2(px.x, 0.0)).rgb);
    float l = luma(texture(texture0, uv - vec2(px.x, 0.0)).rgb);
    float u = luma(texture(texture0, uv + vec2(0.0, px.y)).rgb);
    float d = luma(texture(texture0, uv - vec2(0.0, px.y)).rgb);
    float edge = abs(r - l) + abs(u - d);
    edge = smoothstep(0.02, 0.18, edge);

    vec3 tint = mix(base, lineC, 0.45 + 0.30 * wave);
    vec3 chroma = mix(vec3(0.08, 0.30, 0.52), vec3(0.48, 0.96, 1.00), smoothstep(0.08, 0.90, y));
    vec3 col = mix(tint, chroma, 0.72);
    col = mix(col, src, 0.16);
    col += lineC * edge * 0.30;
    col += warm * smoothstep(0.66, 1.0, y) * 0.22;

    float preserve = smoothstep(0.10, 0.28, edge);
    col = mix(col, src, preserve * 0.28);

    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0) * fragColor * colDiffuse;
}
