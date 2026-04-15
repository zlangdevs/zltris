#version 330

in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;

uniform sampler2D texture0;
uniform vec4 colDiffuse;

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec4 color = texture(texture0, uv);

    float y = floor(uv.y * 540.0);
    if (mod(y, 3.0) == 2.0) {
        color.rgb *= 0.74;
    }

    vec2 centered = uv * 2.0 - 1.0;
    float vignette = 1.0 - 0.16 * dot(centered, centered);
    color.rgb *= vignette;

    finalColor = color * fragColor * colDiffuse;
}
