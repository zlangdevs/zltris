#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <dirent.h>
#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef NOUSER
#define NOUSER
#endif
#ifndef NOGDI
#define NOGDI
#endif
#include <windows.h>
#endif

typedef struct Vector2 {
    float x;
    float y;
} Vector2;

typedef struct Color {
    unsigned char r;
    unsigned char g;
    unsigned char b;
    unsigned char a;
} Color;

typedef struct Texture {
    unsigned int id;
    int width;
    int height;
    int mipmaps;
    int format;
} Texture;

typedef struct Rectangle {
    float x;
    float y;
    float width;
    float height;
} Rectangle;

typedef struct Image {
    void *data;
    int width;
    int height;
    int mipmaps;
    int format;
} Image;

typedef struct GlyphInfo {
    int value;
    int offsetX;
    int offsetY;
    int advanceX;
    Image image;
} GlyphInfo;

typedef struct Font {
    int baseSize;
    int glyphCount;
    int glyphPadding;
    Texture texture;
    Rectangle *recs;
    GlyphInfo *glyphs;
} Font;

typedef struct Shader {
    unsigned int id;
    int *locs;
} Shader;

typedef struct rAudioBuffer rAudioBuffer;
typedef struct rAudioProcessor rAudioProcessor;

typedef struct AudioStream {
    rAudioBuffer *buffer;
    rAudioProcessor *processor;
    unsigned int sampleRate;
    unsigned int sampleSize;
    unsigned int channels;
} AudioStream;

typedef struct Music {
    AudioStream stream;
    unsigned int frameCount;
    bool looping;
    int ctxType;
    void *ctxData;
} Music;

extern void DrawTextEx(Font font, const char *text, Vector2 position, float font_size, float spacing, Color tint);
extern Vector2 MeasureTextEx(Font font, const char *text, float font_size, float spacing);
extern Vector2 GetMousePosition(void);
extern Vector2 GetMouseDelta(void);
extern Vector2 GetTouchPosition(int index);
extern Shader LoadShader(const char *vs_path, const char *fs_path);
extern bool IsShaderValid(Shader shader);
extern int GetShaderLocation(Shader shader, const char *name);
extern int GetShaderLocationAttrib(Shader shader, const char *name);
extern void SetShaderValue(Shader shader, int loc_index, const void *value, int uniform_type);
extern void SetShaderValueV(Shader shader, int loc_index, const void *value, int uniform_type, int count);
extern void SetShaderValueTexture(Shader shader, int loc_index, Texture tex);
extern void BeginShaderMode(Shader shader);
extern void UnloadShader(Shader shader);
extern Music LoadMusicStream(const char *path);
extern int IsMusicValid(Music music);
extern void UnloadMusicStream(Music music);
extern void PlayMusicStream(Music music);
extern void UpdateMusicStream(Music music);
extern void StopMusicStream(Music music);
extern int IsMusicStreamPlaying(Music music);
extern void SetMusicVolume(Music music, float volume);
extern void SetMusicPitch(Music music, float pitch);
extern float GetMusicTimeLength(Music music);
extern float GetMusicTimePlayed(Music music);

void zltris_draw_text_ex_xy(Font *font, const char *text, float x, float y, float font_size, float spacing, unsigned int packed_rgba) {
    if (font == 0 || text == 0) return;

    Color color = {
        (unsigned char)(packed_rgba & 0xFFu),
        (unsigned char)((packed_rgba >> 8) & 0xFFu),
        (unsigned char)((packed_rgba >> 16) & 0xFFu),
        (unsigned char)((packed_rgba >> 24) & 0xFFu),
    };

    Vector2 pos = { x, y };
    DrawTextEx(*font, text, pos, font_size, spacing, color);
}

void zltris_measure_text_ex_xy(Font *font, const char *text, float font_size, float spacing, float *out_w, float *out_h) {
    float w = 0.0f;
    float h = 0.0f;

    if (font != 0 && text != 0) {
        Vector2 m = MeasureTextEx(*font, text, font_size, spacing);
        w = m.x;
        h = m.y;
    }

    if (out_w != 0) *out_w = w;
    if (out_h != 0) *out_h = h;
}

void zltris_get_mouse_position_xy(float *out_x, float *out_y) {
    Vector2 p = GetMousePosition();
    if (out_x != 0) *out_x = p.x;
    if (out_y != 0) *out_y = p.y;
}

void zltris_get_mouse_delta_xy(float *out_x, float *out_y) {
    Vector2 p = GetMouseDelta();
    if (out_x != 0) *out_x = p.x;
    if (out_y != 0) *out_y = p.y;
}

void zltris_get_touch_position_xy(int index, float *out_x, float *out_y) {
    Vector2 p = GetTouchPosition(index);
    if (out_x != 0) *out_x = p.x;
    if (out_y != 0) *out_y = p.y;
}

static Shader zltris_shader(unsigned int id, int *locs) {
    Shader s = {0};
    s.id = id;
    s.locs = locs;
    return s;
}

void zltris_load_shader_out(const char *vs_path, const char *fs_path, unsigned int *out_id, int **out_locs) {
    Shader s = LoadShader(vs_path, fs_path);
    if (out_id != 0) *out_id = s.id;
    if (out_locs != 0) *out_locs = s.locs;
}

bool zltris_is_shader_valid(unsigned int id, int *locs) {
    Shader s = zltris_shader(id, locs);
    return IsShaderValid(s);
}

int zltris_get_shader_location(unsigned int id, int *locs, const char *name) {
    Shader s = zltris_shader(id, locs);
    return GetShaderLocation(s, name);
}

int zltris_get_shader_location_attrib(unsigned int id, int *locs, const char *name) {
    Shader s = zltris_shader(id, locs);
    return GetShaderLocationAttrib(s, name);
}

void zltris_set_shader_value(unsigned int id, int *locs, int loc_index, const void *value, int uniform_type) {
    Shader s = zltris_shader(id, locs);
    SetShaderValue(s, loc_index, value, uniform_type);
}

void zltris_set_shader_value_v(unsigned int id, int *locs, int loc_index, const void *value, int uniform_type, int count) {
    Shader s = zltris_shader(id, locs);
    SetShaderValueV(s, loc_index, value, uniform_type, count);
}

void zltris_set_shader_value_texture(unsigned int id, int *locs, int loc_index, Texture tex) {
    Shader s = zltris_shader(id, locs);
    SetShaderValueTexture(s, loc_index, tex);
}

void zltris_begin_shader_mode(unsigned int id, int *locs) {
    Shader s = zltris_shader(id, locs);
    BeginShaderMode(s);
}

void zltris_unload_shader(unsigned int id, int *locs) {
    Shader s = zltris_shader(id, locs);
    UnloadShader(s);
}

static int zltris_is_audio_name(const char *name) {
    if (name == 0) return 0;
    size_t n = strlen(name);
    if (n < 4) return 0;
    const char *ext = name + n - 4;
    if (strcasecmp(ext, ".mp3") == 0) return 1;
    if (strcasecmp(ext, ".ogg") == 0) return 1;
    if (strcasecmp(ext, ".wav") == 0) return 1;
    if (strcasecmp(ext, ".flac") == 0) return 1;
    if (n >= 5 && strcasecmp(name + n - 5, ".flac") == 0) return 1;
    return 0;
}

static int zltris_is_frag_name(const char *name) {
    if (name == 0) return 0;
    size_t n = strlen(name);
    if (n < 5) return 0;
    return strcasecmp(name + n - 5, ".frag") == 0;
}

int zltris_scan_audio_tracks(const char *dir, char *out_buf, int out_cap) {
    if (out_buf == 0 || out_cap <= 2) return 0;
    out_buf[0] = 0;

    if (dir == 0 || dir[0] == 0) return 0;

#ifdef _WIN32
    char pattern[640];
    snprintf(pattern, (int)sizeof(pattern) - 1, "%s\\*", dir);
    pattern[sizeof(pattern) - 1] = 0;

    WIN32_FIND_DATAA ffd;
    HANDLE h = FindFirstFileA(pattern, &ffd);
    if (h == INVALID_HANDLE_VALUE) return 0;

    int count = 0;
    int out_len = 0;
    do {
        const char *name = ffd.cFileName;
        if (name == 0 || name[0] == '.') continue;
        if ((ffd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0) continue;
        if (!zltris_is_audio_name(name)) continue;

        char full[640];
        snprintf(full, (int)sizeof(full) - 1, "%s/%s", dir, name);
        full[sizeof(full) - 1] = 0;

        int need = (int)strlen(full) + 1;
        if (out_len + need >= out_cap) break;
        memcpy(out_buf + out_len, full, (size_t)need);
        out_len += need;
        count += 1;
    } while (FindNextFileA(h, &ffd));

    FindClose(h);
    if (out_len < out_cap) out_buf[out_len] = 0;
    return count;
#else

    DIR *d = opendir(dir);
    if (d == 0) return 0;

    int count = 0;
    int out_len = 0;

    struct dirent *ent = 0;
    while ((ent = readdir(d)) != 0) {
        const char *name = ent->d_name;
        if (name == 0 || name[0] == '.') continue;
        if (!zltris_is_audio_name(name)) continue;

        char full[640];
        snprintf(full, (int)sizeof(full) - 1, "%s/%s", dir, name);
        full[sizeof(full) - 1] = 0;

        int need = (int)strlen(full) + 1;
        if (out_len + need >= out_cap) break;
        memcpy(out_buf + out_len, full, (size_t)need);
        out_len += need;
        count += 1;
    }

    closedir(d);
    if (out_len < out_cap) out_buf[out_len] = 0;
    return count;
#endif
}

int zltris_scan_frag_files(const char *dir, char *out_buf, int out_cap) {
    if (out_buf == 0 || out_cap <= 2) return 0;
    out_buf[0] = 0;
    if (dir == 0 || dir[0] == 0) return 0;

#ifdef _WIN32
    char pattern[640];
    snprintf(pattern, (int)sizeof(pattern) - 1, "%s\\*", dir);
    pattern[sizeof(pattern) - 1] = 0;

    WIN32_FIND_DATAA ffd;
    HANDLE h = FindFirstFileA(pattern, &ffd);
    if (h == INVALID_HANDLE_VALUE) return 0;

    int count = 0;
    int out_len = 0;
    do {
        const char *name = ffd.cFileName;
        if (name == 0 || name[0] == '.') continue;
        if ((ffd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0) continue;
        if (strcasecmp(name, "default") == 0) continue;
        if (!zltris_is_frag_name(name)) continue;

        int need = (int)strlen(name) + 1;
        if (out_len + need >= out_cap) break;
        memcpy(out_buf + out_len, name, (size_t)need);
        out_len += need;
        count += 1;
    } while (FindNextFileA(h, &ffd));

    FindClose(h);
    if (out_len < out_cap) out_buf[out_len] = 0;
    return count;
#else

    DIR *d = opendir(dir);
    if (d == 0) return 0;

    int count = 0;
    int out_len = 0;
    struct dirent *ent = 0;
    while ((ent = readdir(d)) != 0) {
        const char *name = ent->d_name;
        if (name == 0 || name[0] == '.') continue;
        if (strcasecmp(name, "default") == 0) continue;
        if (!zltris_is_frag_name(name)) continue;

        int need = (int)strlen(name) + 1;
        if (out_len + need >= out_cap) break;
        memcpy(out_buf + out_len, name, (size_t)need);
        out_len += need;
        count += 1;
    }

    closedir(d);
    if (out_len < out_cap) out_buf[out_len] = 0;
    return count;
#endif
}

void zltris_load_music_stream_out(const char *path, Music *out_music) {
    if (out_music == 0) return;
    *out_music = LoadMusicStream(path);
}

bool zltris_is_music_valid(const Music *music) {
    if (music == 0) return false;
    return IsMusicValid(*music) != 0;
}

void zltris_unload_music_stream(const Music *music) {
    if (music == 0) return;
    UnloadMusicStream(*music);
}

void zltris_play_music_stream(const Music *music) {
    if (music == 0) return;
    PlayMusicStream(*music);
}

void zltris_update_music_stream(const Music *music) {
    if (music == 0) return;
    UpdateMusicStream(*music);
}

void zltris_stop_music_stream(const Music *music) {
    if (music == 0) return;
    StopMusicStream(*music);
}

bool zltris_is_music_stream_playing(const Music *music) {
    if (music == 0) return false;
    return IsMusicStreamPlaying(*music) != 0;
}

void zltris_set_music_volume(const Music *music, float volume) {
    if (music == 0) return;
    SetMusicVolume(*music, volume);
}

void zltris_set_music_pitch(const Music *music, float pitch) {
    if (music == 0) return;
    SetMusicPitch(*music, pitch);
}

float zltris_get_music_time_length(const Music *music) {
    if (music == 0) return 0.0f;
    return GetMusicTimeLength(*music);
}

float zltris_get_music_time_played(const Music *music) {
    if (music == 0) return 0.0f;
    return GetMusicTimePlayed(*music);
}
