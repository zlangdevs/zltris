#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform float uTime;
uniform float uWave;
uniform float uDamage;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    float t = uTime;
    float wave_amt = clamp(uWave, 0.0, 1.5);
    float damage = clamp(uDamage, 0.0, 1.6);

    float band = sin((uv.y * 120.0) + t * 2.7);
    float band2 = sin((uv.y * 42.0) - t * 4.3);
    float warp = (band * 0.0009 + band2 * 0.0007) * wave_amt;

    float tear_gate = step(0.88, fract(t * 0.43)) * damage;
    float tear_pos = fract(t * 0.17);
    float tear_zone = smoothstep(tear_pos - 0.015, tear_pos, uv.y) - smoothstep(tear_pos, tear_pos + 0.06, uv.y);
    warp += tear_gate * tear_zone * (0.020 * (0.35 + 0.65 * wave_amt));

    vec2 uvr = uv + vec2(warp + 0.0016, 0.0);
    vec2 uvg = uv + vec2(warp, 0.0);
    vec2 uvb = uv + vec2(warp - 0.0016, 0.0);

    vec3 col;
    col.r = texture(texture0, uvr).r;
    col.g = texture(texture0, uvg).g;
    col.b = texture(texture0, uvb).b;

    vec3 bleed = (
        texture(texture0, uvg + vec2(0.0018, 0.0)).rgb +
        texture(texture0, uvg - vec2(0.0018, 0.0)).rgb
    ) * 0.5;
    col = mix(col, bleed, 0.20 * (0.35 + 0.65 * damage));

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.12);

    float scan = 0.90 + (0.10 * (0.35 + 0.65 * damage)) * sin((uv.y * 900.0 + t * 8.0) * 3.14159265);
    col *= scan;

    float grain = hash12(gl_FragCoord.xy + vec2(t * 61.0, t * 23.0)) - 0.5;
    col += grain * (0.085 * damage);

    float speckle = step(0.9965 - 0.0015 * damage, hash12(vec2(floor(uv.y * 480.0), floor(t * 40.0))));
    col += speckle * vec3(0.11, 0.10, 0.08);

    float vignette = 1.0 - 0.18 * dot(uv * 2.0 - 1.0, uv * 2.0 - 1.0);
    col *= clamp(vignette, 0.0, 1.0);

    col *= 1.10;
    col = clamp(col, 0.0, 1.0);

    finalColor = vec4(col, 1.0) * fragColor * colDiffuse;
}
