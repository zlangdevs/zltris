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

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 uv = vec2(fragTexCoord.x, 1.0 - fragTexCoord.y);
    float t        = uTime;
    float wave_amt = clamp(uWave,   0.0, 1.5);
    float damage   = clamp(uDamage, 0.0, 1.6);

    float warble = noise2(vec2(t * 0.7, uv.y * 3.5)) * 2.0 - 1.0;
    warble      += noise2(vec2(t * 1.9, uv.y * 8.0)) * 0.5 - 0.25;
    uv.y        += warble * 0.0012 * wave_amt;

    float band  = sin(uv.y * 120.0 + t * 2.7);
    float band2 = sin(uv.y *  42.0 - t * 4.3);
    float band3 = sin(uv.y * 310.0 + t * 11.3) * 0.3;
    float warp  = (band * 0.0009 + band2 * 0.0007 + band3 * 0.0003) * wave_amt;

    float tear_gate = step(0.88, fract(t * 0.43)) * damage;
    float tear_pos  = fract(t * 0.17);
    float tear_zone = smoothstep(tear_pos - 0.015, tear_pos,        uv.y)
                    - smoothstep(tear_pos,          tear_pos + 0.06, uv.y);
    warp += tear_gate * tear_zone * (0.020 * (0.35 + 0.65 * wave_amt));

    float tear2_gate = step(0.95, fract(t * 0.27 + 0.5)) * damage;
    float tear2_pos  = fract(t * 0.31 + 0.6);
    float tear2_zone = smoothstep(tear2_pos - 0.005, tear2_pos,         uv.y)
                     - smoothstep(tear2_pos,           tear2_pos + 0.02, uv.y);
    warp += tear2_gate * tear2_zone * 0.035 * damage;

    float headSwitch = smoothstep(0.97, 1.0, uv.y) * damage;
    float hsNoise    = (hash12(vec2(floor(uv.y * 240.0), floor(t * 30.0) + 7.0)) - 0.5) * 2.0;
    warp += hsNoise * headSwitch * 0.018;

    float aberr = 0.0016 + 0.0008 * damage;
    vec2 uvr = uv + vec2(warp + aberr,  0.0);
    vec2 uvg = uv + vec2(warp,          0.0);
    vec2 uvb = uv + vec2(warp - aberr,  0.0);

    vec3 col;
    col.r = texture(texture0, uvr).r;
    col.g = texture(texture0, uvg).g;
    col.b = texture(texture0, uvb).b;

    float bleedAmt = 0.0018 + 0.001 * damage;
    vec3 bleed = (
        texture(texture0, uvg + vec2(bleedAmt,  0.0)).rgb +
        texture(texture0, uvg - vec2(bleedAmt,  0.0)).rgb
    ) * 0.5;
    col = mix(col, bleed, 0.20 * (0.35 + 0.65 * damage));

    vec3 chromaDown = texture(texture0, uvg + vec2(0.0,  0.003)).rgb;
    vec3 chromaUp   = texture(texture0, uvg - vec2(0.0,  0.003)).rgb;
    float luma0     = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 chromaBleed = mix(chromaDown, chromaUp, 0.5);
    col = mix(col, vec3(luma0) + (chromaBleed - vec3(dot(chromaBleed, vec3(0.299,0.587,0.114)))),
              0.12 * damage);

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.12);

    float lumaNoise = (noise2(gl_FragCoord.xy * 0.5 + vec2(t * 43.0, t * 17.0)) - 0.5) * 0.06;
    lumaNoise      += (hash12(gl_FragCoord.xy + vec2(t * 61.0, t * 23.0)) - 0.5) * 0.04;
    col += lumaNoise * damage;

    float cNoiseR = (hash12(gl_FragCoord.xy * 0.7 + vec2(t * 37.0, 1.0)) - 0.5) * 0.03;
    float cNoiseB = (hash12(gl_FragCoord.xy * 0.7 + vec2(t * 53.0, 2.0)) - 0.5) * 0.03;
    col.r += cNoiseR * damage;
    col.b += cNoiseB * damage;

    float scan = 0.90 + (0.10 * (0.35 + 0.65 * damage))
               * sin((uv.y * 900.0 + t * 8.0) * 3.14159265);
    col *= scan;

    float dropRow   = floor(uv.y * 480.0);
    float dropFrame = floor(t * 25.0);
    float dropSeed  = hash12(vec2(dropRow * 0.037, dropFrame));
    float dropWidth = 1.0 + floor(hash12(vec2(dropSeed * 91.1, dropFrame * 0.3)) * 3.5);
    float dropBlock = floor(dropRow / dropWidth);
    float blockHash = hash12(vec2(dropBlock * 0.073, dropFrame + 1.1));
    float dropActive = step(0.986 - 0.005 * damage, blockHash) * damage;

    if (dropActive > 0.0) {
        float blockPos   = fract(dropRow / dropWidth);
        float edgeFade   = smoothstep(0.0, 0.25, blockPos) * smoothstep(1.0, 0.75, blockPos);
        float dropType   = step(0.5, hash12(vec2(dropBlock * 1.37, dropFrame * 0.7)));
        float dropNoise  = noise2(vec2(uv.x * 180.0, dropBlock * 4.3 + dropFrame * 0.1));
        dropNoise       += hash12(vec2(uv.x * 600.0 + dropFrame * 3.7, dropBlock)) * 0.4;
        dropNoise        = dropNoise / 1.4;

        float edgeGlow   = smoothstep(0.6, 1.0, blockPos) * 0.12 + smoothstep(0.4, 0.0, blockPos) * 0.08;
        vec3  noSignal   = vec3(dropNoise * 0.18 + edgeGlow,
                                dropNoise * 0.16 + edgeGlow * 0.8,
                                dropNoise * 0.22 + edgeGlow * 1.1);

        vec3  holdLine   = vec3(
            texture(texture0, vec2(uvr.x, uvr.y - 0.008)).r,
            texture(texture0, vec2(uvg.x + 0.003, uvg.y - 0.008)).g,
            texture(texture0, vec2(uvb.x, uvb.y - 0.008)).b
        );
        holdLine = mix(holdLine, noSignal, 0.35);

        vec3  dropColor  = mix(noSignal, holdLine, dropType);
        float chromaShift = (hash12(vec2(dropBlock * 2.1, dropFrame)) - 0.5) * 0.012;
        dropColor.r = mix(dropColor.r, texture(texture0, vec2(uvr.x + chromaShift, uvr.y)).r, 0.4);
        dropColor.b = mix(dropColor.b, texture(texture0, vec2(uvb.x - chromaShift, uvb.y)).b, 0.4);

        col = mix(col, dropColor, dropActive * edgeFade);
    }

    float speckleHash = hash12(vec2(floor(uv.y * 480.0), floor(t * 40.0)));
    float speckle     = step(0.9992 - 0.0004 * damage, speckleHash);
    float speckleType = hash12(vec2(floor(uv.y * 480.0) + 500.0, floor(t * 40.0)));
    vec3  speckleColor = mix(vec3(0.05, 0.04, 0.06), vec3(0.12, 0.11, 0.18), speckleType);
    col = mix(col, speckleColor, speckle * 0.7);

    float glitchT    = floor(t * 0.8 + 0.5);
    float glitchY    = hash11(glitchT * 1.73);
    float glitchW    = 0.04 + 0.06 * hash11(glitchT * 3.11);
    float glitchZone = smoothstep(glitchY - glitchW, glitchY, uv.y)
                     - smoothstep(glitchY, glitchY + glitchW * 0.3, uv.y);
    float glitchGate = step(0.7, hash11(glitchT * 0.47)) * damage;
    float glitchLuma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3  glitchCol  = vec3(glitchLuma) * 0.6
                     + vec3(hash11(glitchT * 2.3) * 0.15,
                            0.0,
                            hash11(glitchT * 5.7) * 0.10);
    col = mix(col, glitchCol, glitchZone * glitchGate * 0.8);

    vec2  vigUV   = uv * 2.0 - 1.0;
    float vigDist = dot(vigUV, vigUV);
    float vignette = 1.0 - 0.20 * vigDist - 0.05 * vigDist * vigDist;
    col *= clamp(vignette, 0.0, 1.0);
    col.b += (1.0 - clamp(vignette, 0.0, 1.0)) * 0.04;

    col *= 1.08;
    col  = clamp(col, 0.0, 1.0);

    finalColor = vec4(col, 1.0) * fragColor * colDiffuse;
}
