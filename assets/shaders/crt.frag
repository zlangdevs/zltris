#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform float uCurvature;
uniform float uBrightness;

vec3 sampleTube(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec3(0.0, 0.0, 0.0);
    }

    vec2 ca = vec2(0.0012, 0.0008);
    float r = texture(texture0, uv + ca).r;
    float g = texture(texture0, uv).g;
    float b = texture(texture0, uv - ca).b;
    vec3 base = vec3(r, g, b);

    vec3 glow = (
        texture(texture0, uv + vec2(0.0014, 0.0)).rgb +
        texture(texture0, uv - vec2(0.0014, 0.0)).rgb +
        texture(texture0, uv + vec2(0.0, 0.0014)).rgb +
        texture(texture0, uv - vec2(0.0, 0.0014)).rgb
    ) * 0.25;

    return mix(base, glow, 0.22);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec2 centered = uv * 2.0 - 1.0;

    float r2 = dot(centered, centered);
    float c = clamp(uCurvature, 0.0, 2.0);
    vec2 warped = uv + centered * ((0.028 * c) * r2 + (0.006 * c) * r2 * r2);

    vec3 crt = sampleTube(warped);

    float line = 0.80 + 0.20 * cos(warped.y * 900.0 * 3.14159265);
    float beam = 0.92 + 0.08 * sin(warped.y * 1800.0 * 3.14159265 + warped.x * 1.5);

    float slot = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(0.88);
    if (slot < 1.0) {
        mask = vec3(1.00, 0.82, 0.82);
    } else if (slot < 2.0) {
        mask = vec3(0.82, 1.00, 0.82);
    } else {
        mask = vec3(0.82, 0.82, 1.00);
    }

    float vignette = 1.0 - 0.30 * pow(clamp(dot(centered, centered), 0.0, 1.0), 1.2);
    vignette = clamp(vignette, 0.0, 1.0);

    crt *= line * beam;
    crt *= mask;
    crt *= vignette;
    crt *= clamp(uBrightness, 0.4, 2.4);

    crt = pow(max(crt, vec3(0.0)), vec3(1.0 / 1.12));

    finalColor = vec4(crt, 1.0) * fragColor * colDiffuse;
}
