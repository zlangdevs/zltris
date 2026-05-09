#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;
uniform float uTime;

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    float t = uTime;

    vec3 src = texture(texture0, uv).rgb;
    float l = dot(src, vec3(0.299, 0.587, 0.114));

    vec3 dark = vec3(0.05, 0.14, 0.28);
    vec3 light = vec3(0.95, 0.82, 0.42);
    vec3 duo = mix(dark, light, smoothstep(0.08, 0.92, l));

    float scan = 0.90 + 0.10 * sin((uv.y * 920.0 + t * 10.0) * 3.14159265);
    duo *= scan;

    float pulse = 0.5 + 0.5 * sin(t * 2.2 + uv.x * 5.0);
    duo *= 0.92 + pulse * 0.12;

    finalColor = vec4(clamp(duo, 0.0, 1.0), 1.0) * fragColor * colDiffuse;
}
