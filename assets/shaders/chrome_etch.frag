#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
in vec2 vNdc;
in vec2 vPixel;
in float vTime;

out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform vec2 uResolution;

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec3 src = texture(texture0, uv).rgb;
    float y = luma(src);
    float t = vTime;

    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    float r = luma(texture(texture0, uv + vec2(px.x, 0.0)).rgb);
    float l = luma(texture(texture0, uv - vec2(px.x, 0.0)).rgb);
    float u = luma(texture(texture0, uv + vec2(0.0, px.y)).rgb);
    float d = luma(texture(texture0, uv - vec2(0.0, px.y)).rgb);
    float e = abs(r - l) + abs(u - d);
    e = smoothstep(0.01, 0.16, e);

    vec3 steelDark = vec3(0.16, 0.18, 0.22);
    vec3 steelMid = vec3(0.48, 0.54, 0.62);
    vec3 steelHi = vec3(0.88, 0.93, 1.00);

    float sweep = 0.5 + 0.5 * sin(vNdc.x * 5.5 + vNdc.y * 2.0 + t * 0.7);
    vec3 metal = mix(steelDark, steelMid, smoothstep(0.10, 0.85, y));
    metal = mix(metal, steelHi, sweep * 0.18 + e * 0.22);

    float etch = abs(fract((vPixel.x + vPixel.y) * 0.018 + t * 0.09) - 0.5);
    float etchLine = 1.0 - smoothstep(0.46, 0.50, etch);
    metal += vec3(etchLine * 0.04);

    float spark = step(0.9993, hash12(floor(vPixel * 0.45 + vec2(t * 15.0, t * 9.0)))) * 0.18;
    metal += vec3(spark);

    vec3 col = mix(src * 0.42, metal, 0.72);
    vec3 accentA = vec3(0.30, 0.92, 1.00);
    vec3 accentB = vec3(1.00, 0.52, 0.86);
    float hueDrift = 0.5 + 0.5 * sin(t * 0.55 + vNdc.x * 2.4 - vNdc.y * 1.6);
    vec3 accent = mix(accentA, accentB, hueDrift);
    col += accent * (0.10 + 0.20 * y);

    float preserve = smoothstep(0.08, 0.26, e);
    col = mix(col, src, 0.12 + preserve * 0.22);
    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0) * fragColor * colDiffuse;
}
