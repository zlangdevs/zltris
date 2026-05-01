#version 330

// ============================================================================
//  Abyss — bioluminescent deep-sea post-process for zltris
//  Requires layered render targets (bg/blocks/ui). Gracefully degrades
//  to a single-texture tint if uLayeredTargets == 0.
// ============================================================================

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

// ---------- utilities --------------------------------------------------------

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i),             hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Separable-style 13-tap gaussian sample at a given radius (in pixels).
// Cheap-ish for a single-pass shader. Three invocations give multi-scale bloom.
vec3 gauss13(sampler2D tex, vec2 uv, vec2 px, float r) {
    vec3 s  = texture(tex, uv).rgb * 0.1964;
    s += texture(tex, uv + vec2( 1.3846, 0.0) * px * r).rgb * 0.1571;
    s += texture(tex, uv - vec2( 1.3846, 0.0) * px * r).rgb * 0.1571;
    s += texture(tex, uv + vec2(0.0,  1.3846) * px * r).rgb * 0.1571;
    s += texture(tex, uv - vec2(0.0,  1.3846) * px * r).rgb * 0.1571;
    s += texture(tex, uv + vec2( 3.2307, 0.0) * px * r).rgb * 0.0441;
    s += texture(tex, uv - vec2( 3.2307, 0.0) * px * r).rgb * 0.0441;
    s += texture(tex, uv + vec2(0.0,  3.2307) * px * r).rgb * 0.0441;
    s += texture(tex, uv - vec2(0.0,  3.2307) * px * r).rgb * 0.0441;
    return s;
}

// ---------- main -------------------------------------------------------------

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // cool-to-deep palette
    const vec3 deep     = vec3(0.008, 0.015, 0.040);
    const vec3 surface  = vec3(0.050, 0.130, 0.230);
    const vec3 glowCool = vec3(0.35,  0.75,  1.00);
    const vec3 bioBlue  = vec3(0.30,  0.70,  1.10);
    const vec3 particle = vec3(0.72,  0.94,  1.00);

    vec3 col;

    if (uLayeredTargets == 1) {
        vec3 bgSrc = texture(uBackgroundTex, uv).rgb;

        // -- depth gradient with slow vertical shimmer -----------------------
        vec3 ocean = mix(surface, deep, smoothstep(-0.05, 1.05, uv.y));
        ocean *= 0.86 + 0.14 * fbm(uv * vec2(2.0, 6.0) + vec2(0.0, t * 0.07));

        // -- caustics (brightest near the "seafloor") -----------------------
        vec2 cUv = uv * vec2(6.0, 3.0) + vec2(t * 0.07, -t * 0.04);
        float c1 = fbm(cUv);
        float c2 = fbm(cUv + c1 * 1.5);
        float caustic = smoothstep(0.55, 0.95, c2) * smoothstep(0.0, 0.6, uv.y);
        ocean += glowCool * caustic * 0.14;

        // -- god rays from above --------------------------------------------
        float shaft = fbm(vec2(uv.x * 8.0 + t * 0.05, uv.y * 1.1));
        shaft = pow(shaft, 2.8);
        float shaftFade = 1.0 - smoothstep(0.2, 1.0, uv.y);
        ocean += glowCool * shaft * shaftFade * 0.12;

        // -- drifting plankton / bokeh particles ----------------------------
        float particles = 0.0;
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            vec2 pUv = vec2(uv.x * aspect, uv.y) * (3.0 + fi * 2.5);
            pUv += vec2(fi * 13.7, fi * 7.3);
            pUv.y -= t * (0.04 + fi * 0.015);      // drift upward
            vec2 iP = floor(pUv);
            vec2 fP = fract(pUv) - 0.5;
            float h = hash21(iP);
            vec2 off = vec2(sin(t * 0.3 + h * 6.28),
                            cos(t * 0.25 + h * 6.28)) * 0.22;
            float d = length(fP - off);
            float size = 0.02 + 0.03 * h;
            float twinkle = 0.4 + 0.6 * sin(t * 1.2 + h * 6.28);
            particles += smoothstep(size, 0.0, d) * twinkle / (1.0 + fi);
        }
        ocean += particle * particles * 0.55;

        // -- preserve any content drawn into the background layer -----------
        // (e.g. grids, text, decorative elements). Additive blend over ocean
        // so the bg never wins completely but never gets erased either.
        float bgBright = luma(bgSrc);
        ocean = mix(ocean, bgSrc + ocean * 0.6, smoothstep(0.02, 0.35, bgBright));

        // -- block bloom (three scales) -------------------------------------
        vec3 blocksSrc = texture(uBlocksTex, uv).rgb;
        vec3 bNear = gauss13(uBlocksTex, uv, px, 2.0);
        vec3 bMid  = gauss13(uBlocksTex, uv, px, 7.0);
        vec3 bFar  = gauss13(uBlocksTex, uv, px, 18.0);
        vec3 bloom = bNear * 0.50 + bMid * 0.35 + bFar * 0.20;
        // push bloom slightly cool so it reads as underwater light
        bloom = mix(bloom, bloom * bioBlue, 0.35);

        // -- chromatic refraction on blocks (water lens) --------------------
        vec2 refr = (uv - 0.5) * 0.004;
        float rr = texture(uBlocksTex, uv + refr).r;
        float gg = texture(uBlocksTex, uv).g;
        float bb = texture(uBlocksTex, uv - refr).b;
        vec3 blocks = vec3(rr, gg, bb);
        // gentle rim cool-tint
        blocks += glowCool * 0.06 * smoothstep(0.05, 0.45, luma(blocks));

        // -- composite: ocean -> bloom bleed -> blocks -> ui ---------------
        vec3 scene = ocean;
        scene += bloom * 0.85;                                   // bleeds into bg
        float blocksMask = smoothstep(0.01, 0.12, luma(blocksSrc));
        scene = mix(scene, blocks, blocksMask);
        scene += bloom * blocksMask * 0.30;                      // inner glow

        // UI on top with its own soft halo
        vec3 uiSrc  = texture(uUiTex, uv).rgb;
        vec3 uiGlow = gauss13(uUiTex, uv, px, 3.5);
        float uiMask = smoothstep(0.01, 0.12, luma(uiSrc));
        scene += uiGlow * 0.20 * (1.0 - uiMask);
        scene = mix(scene, uiSrc, uiMask * 0.97);

        col = scene;

    } else {
        // -- single-target fallback: tint towards abyss palette + selective bloom
        vec3 src  = texture(texture0, uv).rgb;
        vec3 blur = gauss13(texture0, uv, px, 6.0);
        float brightness = luma(src);

        vec3 ocean = mix(surface, deep, smoothstep(-0.05, 1.05, uv.y));
        col = mix(ocean, src, smoothstep(0.03, 0.35, brightness));
        col += blur * 0.45 * smoothstep(0.35, 1.0, luma(blur));
        col = mix(col, col * bioBlue, 0.28);
    }

    // ---------- final polish -------------------------------------------------
    // soft vignette
    vec2 cc = uv - 0.5;
    float vign = 1.0 - dot(cc, cc) * 1.6;
    vign = smoothstep(0.0, 1.0, vign);
    col *= mix(0.55, 1.0, vign);

    // film grain (also breaks any banding in the gradients)
    float grain = hash21(uv * uResolution + t * 60.0) - 0.5;
    col += grain * 0.018;

    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0) * fragColor * colDiffuse;
}
