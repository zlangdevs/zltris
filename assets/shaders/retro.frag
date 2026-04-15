#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform float uTime;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    float t = uTime;
    uv += vec2(sin(t * 7.0) * 0.0020, cos(t * 5.3) * 0.0016);

    vec3 src = texture(texture0, uv).rgb;
    float y = dot(src, vec3(0.299, 0.587, 0.114));
    y = pow(clamp(y * 1.18, 0.0, 1.0), 0.82);
    vec3 col = vec3(y);

    float flicker = 0.90 + 0.08 * sin(t * 16.0);
    col *= flicker;

    float sx1 = abs(fract(uv.x * 90.0 + t * 0.22) - 0.5);
    float sx2 = abs(fract(uv.x * 140.0 - t * 0.18) - 0.5);
    float scratch = step(sx1, 0.003) * 0.55 + step(sx2, 0.002) * 0.45;
    col = mix(col, vec3(0.96), scratch);

    float dust = hash12(floor(gl_FragCoord.xy * 0.32 + vec2(t * 19.0, t * 13.0)));
    col += vec3(step(0.998, dust) * 0.48);

    float grain = (hash12(gl_FragCoord.xy + vec2(t * 53.0, t * 31.0)) - 0.5) * 0.14;
    col += vec3(grain);

    vec2 c = uv * 2.0 - 1.0;
    float vig = 1.0 - dot(c, c) * 0.30;
    col *= clamp(vig, 0.62, 1.0);

    col = clamp(col, 0.0, 1.0);
    finalColor = vec4(col, 1.0) * fragColor * colDiffuse;
}
