#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#define BOARD_CELLS 220
#define QUEUE_CAP 14

typedef struct AiMove {
    bool valid;
    int32_t x;
    int32_t rotation;
    bool tspin;
} AiMove;

extern AiMove findBestMove__ptr_i32__i32_i32_ptr_i32__i32_i32_bool_i32_i32_i32_i32(
    int32_t *board,
    int32_t piece_kind,
    int32_t piece_y,
    int32_t *queue,
    int32_t lookahead_count,
    int32_t combo,
    bool b2b,
    int32_t level,
    int32_t garbage_rows,
    int32_t garbage_hole,
    int32_t pending_garbage);

typedef struct WorkerRequest {
    int32_t board[BOARD_CELLS];
    int32_t queue[QUEUE_CAP];
    int32_t piece_kind;
    int32_t piece_y;
    int32_t lookahead_count;
    int32_t combo;
    int32_t b2b;
    int32_t level;
    int32_t request_id;
} WorkerRequest;

typedef struct WorkerResult {
    int32_t request_id;
    int32_t valid;
    int32_t x;
    int32_t rotation;
    int32_t tspin;
} WorkerResult;

static pthread_t g_worker_thread;
static pthread_mutex_t g_worker_mu = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t g_worker_cv = PTHREAD_COND_INITIALIZER;
static int g_worker_started = 0;
static int g_worker_should_stop = 0;
static int g_worker_has_request = 0;
static int g_worker_has_result = 0;
static WorkerRequest g_worker_request;
static WorkerResult g_worker_result;

static void *zltris_ai_worker_main(void *unused) {
    (void)unused;

    for (;;) {
        WorkerRequest req;

        pthread_mutex_lock(&g_worker_mu);
        while (!g_worker_should_stop && !g_worker_has_request) {
            pthread_cond_wait(&g_worker_cv, &g_worker_mu);
        }
        if (g_worker_should_stop) {
            pthread_mutex_unlock(&g_worker_mu);
            break;
        }
        req = g_worker_request;
        g_worker_has_request = 0;
        pthread_mutex_unlock(&g_worker_mu);

        AiMove move = findBestMove__ptr_i32__i32_i32_ptr_i32__i32_i32_bool_i32_i32_i32_i32(
            req.board,
            req.piece_kind,
            req.piece_y,
            req.queue,
            req.lookahead_count,
            req.combo,
            req.b2b != 0,
            req.level,
            0,
            0,
            0);

        WorkerResult out;
        out.request_id = req.request_id;
        out.valid = move.valid ? 1 : 0;
        out.x = move.x;
        out.rotation = move.rotation;
        out.tspin = move.tspin ? 1 : 0;

        pthread_mutex_lock(&g_worker_mu);
        g_worker_result = out;
        g_worker_has_result = 1;
        pthread_mutex_unlock(&g_worker_mu);
    }

    return 0;
}

void zltris_ai_worker_start(void) {
    pthread_mutex_lock(&g_worker_mu);
    if (g_worker_started) {
        pthread_mutex_unlock(&g_worker_mu);
        return;
    }
    g_worker_should_stop = 0;
    g_worker_has_request = 0;
    g_worker_has_result = 0;
    g_worker_started = 1;
    pthread_mutex_unlock(&g_worker_mu);

    pthread_create(&g_worker_thread, 0, zltris_ai_worker_main, 0);
}

void zltris_ai_worker_stop(void) {
    pthread_mutex_lock(&g_worker_mu);
    if (!g_worker_started) {
        pthread_mutex_unlock(&g_worker_mu);
        return;
    }
    g_worker_should_stop = 1;
    pthread_cond_signal(&g_worker_cv);
    pthread_mutex_unlock(&g_worker_mu);

    pthread_join(g_worker_thread, 0);

    pthread_mutex_lock(&g_worker_mu);
    g_worker_started = 0;
    g_worker_should_stop = 0;
    g_worker_has_request = 0;
    g_worker_has_result = 0;
    pthread_mutex_unlock(&g_worker_mu);
}

void zltris_ai_worker_reset(void) {
    pthread_mutex_lock(&g_worker_mu);
    g_worker_has_request = 0;
    g_worker_has_result = 0;
    pthread_mutex_unlock(&g_worker_mu);
}

void zltris_ai_worker_submit(int32_t *board,
                             int32_t piece_kind,
                             int32_t piece_y,
                             int32_t *queue,
                             int32_t lookahead_count,
                             int32_t combo,
                             int32_t b2b,
                             int32_t level,
                             int32_t request_id) {
    if (!board || !queue) return;

    WorkerRequest req;
    memcpy(req.board, board, sizeof(req.board));
    memcpy(req.queue, queue, sizeof(req.queue));
    req.piece_kind = piece_kind;
    req.piece_y = piece_y;
    req.lookahead_count = lookahead_count;
    req.combo = combo;
    req.b2b = b2b;
    req.level = level;
    req.request_id = request_id;

    pthread_mutex_lock(&g_worker_mu);
    g_worker_request = req;
    g_worker_has_request = 1;
    pthread_cond_signal(&g_worker_cv);
    pthread_mutex_unlock(&g_worker_mu);
}

int32_t zltris_ai_worker_try_pop(int32_t *out_req,
                                 int32_t *out_valid,
                                 int32_t *out_x,
                                 int32_t *out_rot,
                                 int32_t *out_tspin) {
    int32_t ok = 0;
    pthread_mutex_lock(&g_worker_mu);
    if (g_worker_has_result) {
        WorkerResult out = g_worker_result;
        g_worker_has_result = 0;
        if (out_req) *out_req = out.request_id;
        if (out_valid) *out_valid = out.valid;
        if (out_x) *out_x = out.x;
        if (out_rot) *out_rot = out.rotation;
        if (out_tspin) *out_tspin = out.tspin;
        ok = 1;
    }
    pthread_mutex_unlock(&g_worker_mu);
    return ok;
}
