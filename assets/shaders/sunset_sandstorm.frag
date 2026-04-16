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
uniform sampler2D uBackgroundTex;
uniform sampler2D uBlocksTex;
uniform sampler2D uUiTex;
uniform vec2 uResolution;
uniform float uTime;
uniform int uLayeredTargets;
uniform vec4 colDiffuse;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec2 centered = uv - 0.5;
    float dist = length(centered);
    
    vec3 col;
    
    if (uLayeredTargets == 1) {
        vec3 bg = texture(uBackgroundTex, uv).rgb;
        vec3 blocks = texture(uBlocksTex, uv).rgb;
        vec3 ui = texture(uUiTex, uv).rgb;
        
        float ca = (0.0008 + dist * 0.0004);
        float r = texture(uBlocksTex, uv + vec2(ca, 0.0)).r;
        float g = texture(uBlocksTex, uv).g;
        float b = texture(uBlocksTex, uv - vec2(ca, 0.0)).b;
        blocks = vec3(r, g, b);
        
        vec2 heatUv = uv;
        heatUv.x += sin(uv.y * 20.0 + vTime * 3.0) * 0.001 * dist;
        heatUv.y += cos(uv.x * 15.0 + vTime * 2.0) * 0.0006;
        bg = texture(uBackgroundTex, heatUv).rgb;
        
        vec3 sunsetTop = vec3(0.1, 0.05, 0.2);
        vec3 sunsetMid = vec3(0.9, 0.3, 0.2);
        vec3 sunsetBot = vec3(1.0, 0.8, 0.1);
        
        float horizon = pow(1.0 - uv.y, 2.0);
        vec3 skyGradient = mix(sunsetTop, sunsetMid, smoothstep(0.0, 0.5, uv.y));
        skyGradient = mix(skyGradient, sunsetBot, smoothstep(0.5, 1.0, 1.0 - uv.y) * 0.8);
        
        vec2 sunPos = vec2(0.5, 0.25);
        float sunDist = length(uv - sunPos);
        float sunGlow = exp(-sunDist * 4.0) * 0.6;
        float sunCore = smoothstep(0.08, 0.02, sunDist);
        vec3 sunColor = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.9, 0.5), 0.5);
        skyGradient += sunColor * sunGlow * 0.8;
        skyGradient += vec3(1.0, 0.95, 0.8) * sunCore * 0.5;
        
        bg = mix(bg * 0.3, skyGradient, 0.7);
        
        vec2 sandUv = uv * 8.0 + vec2(vTime * 0.2, vTime * 0.1);
        float sand = noise(sandUv) * noise(sandUv * 2.0 + vTime);
        sand = pow(sand, 2.0) * 0.3;
        vec3 sandColor = mix(vec3(0.9, 0.5, 0.2), vec3(1.0, 0.8, 0.4), sand);
        
        col = mix(bg, blocks, 0.8);
        col = mix(col, ui, step(0.01, dot(ui, vec3(1.0))));
        
        vec3 shadowColor = vec3(0.2, 0.05, 0.15);
        vec3 midColor = vec3(0.9, 0.35, 0.15);
        vec3 highlightColor = vec3(1.0, 0.85, 0.6);
        
        float luminance = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(shadowColor, midColor, smoothstep(0.0, 0.5, luminance));
        col = mix(col, highlightColor, smoothstep(0.5, 1.0, luminance));
        
        col += sandColor * sand * 0.5;
        
        col = mix(col, col * vec3(1.1, 0.9, 0.7) + vec3(0.1, 0.05, 0.0), 0.4);
    } else {
        col = texture(texture0, uv).rgb;
        
        vec2 distortedUv = uv;
        distortedUv.x += sin(uv.y * 30.0 + vTime * 2.0) * 0.0004;
        col = texture(texture0, distortedUv).rgb;
        
        col = mix(col, col * vec3(1.2, 0.8, 0.6), 0.3);
    }
    
    float vignette = 1.0 - dist * dist * 0.8;
    vignette = smoothstep(0.0, 1.0, vignette);
    col *= mix(0.4, 1.0, vignette);
    
    float scanline = sin(uv.y * uResolution.y * 0.8) * 0.04;
    col -= scanline;
    
    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0) * fragColor * colDiffuse;
}
