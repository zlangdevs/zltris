#include "raylib.h"

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
