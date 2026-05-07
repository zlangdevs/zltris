# Zltris Online Duel Protocol (ZD1)

Line-oriented text protocol over a single TCP connection between two peers —
one `HOST` (the listener) and one `CLIENT` (the connector). Each peer sends and
receives full-duplex. The protocol is intentionally simple and extensible so
future versions can add new messages or fields without breaking older clients.

## Transport

- TCP, IPv4, non-blocking sockets.
- Default port: `45771` (user-configurable in the setup screen).
- No TLS (LAN / trusted-network focus). Do not expose raw to the public internet.
- `MSG_NOSIGNAL` on writes; `MSG_DONTWAIT` on reads.

## Framing

Every message is a single line terminated by `\n` (LF, 0x0A). There is no CR.
The receiver appends bytes into a rolling buffer (max 32 KiB) and parses every
complete line. Lines longer than the buffer constitute a protocol error and the
session is aborted.

## Line format

```
ZD1|VERB|ARG0|ARG1|...|ARGN
```

- `ZD1` — protocol magic + version tag. **Always present as token 0.** Peers
  that see a different magic immediately drop the message. Bumping to `ZD2`
  signals a breaking change.
- `VERB` — uppercase ASCII verb (token 1). Unknown verbs MUST be ignored
  silently; this is what lets a newer peer send extra messages to an older peer
  without disconnecting.
- `ARG0..ARGN` — verb-specific payload tokens, pipe-delimited, all 7-bit ASCII.
  Integers are decimal. Floats are transmitted as integers scaled by 100 (two
  decimals of precision).

### Extending

- Add new verbs freely. Receivers ignore unknown verbs.
- Append new trailing tokens to an existing verb. Receivers MUST read tokens by
  index and fall back to a default when a token is missing; never assume total
  token count.
- Bumping to `ZD2` is reserved for incompatible changes (e.g. repurposing an
  existing token).

## Session state machine

```
IDLE
  └── host: listen()      ──▶ LISTENING
  └── client: connect()   ──▶ CONNECTING
LISTENING    ── accept() ──▶ HANDSHAKE
CONNECTING   ── connected ─▶ HANDSHAKE
HANDSHAKE    ── ZD1|START ─▶ READY  ── user confirms start ─▶ RUNNING
ANY          ── socket err / disconnect ─▶ ERROR / DISCONNECTED
```

Handshake ordering:

1. Both peers send `ZD1|HELLO|<role>` as soon as the socket is writable.
2. `HOST` sends `ZD1|CFG|...` (authoritative rules).
3. `CLIENT` applies config, sends `ZD1|READY`.
4. `HOST` replies with `ZD1|START`, both peers transition to `READY`.
5. User presses "START MATCH" on the setup screen — transition to `RUNNING`,
   game begins locally on both peers.

## Verbs (current)

| Verb   | Direction  | Tokens                                                                                   | Purpose |
|--------|-----------|------------------------------------------------------------------------------------------|---------|
| HELLO  | both      | `role`                                                                                   | Announce role (0 = host, 1 = client). |
| CFG    | host→client | `bw`,`bh`,`g0*100`,`gr*100`,`hold`,`kick`,`start_garbage`                                | Authoritative match rules. Client overwrites locals. |
| READY  | client→host | —                                                                                        | Client accepted the CFG. |
| START  | host→client | —                                                                                        | Host confirms match. Both peers go to READY state. |
| ATK    | both      | `lines`                                                                                  | Attack garbage to be queued against the peer. |
| OVR    | both      | —                                                                                        | Sender's game is over. |
| SNP    | both      | `score`,`lines`,`over`,`piece_kind`,`piece_rot`,`piece_x`,`piece_y`,`bw`,`bh`,`board`    | Snapshot of sender's playfield at 10 Hz. `board` is `bw*bh` ASCII digits, row-major, '0' = empty. |

### Example transcript

```
# just after TCP connection
HOST  → CLIENT : ZD1|HELLO|0
HOST  → CLIENT : ZD1|CFG|10|20|100|50|0|0|0
CLIENT → HOST  : ZD1|HELLO|1
CLIENT → HOST  : ZD1|READY
HOST  → CLIENT : ZD1|START

# in-match (10 Hz)
HOST  → CLIENT : ZD1|SNP|1240|7|0|3|0|4|17|10|20|0000...
CLIENT → HOST  : ZD1|SNP|800|4|0|1|2|5|18|10|20|0000...
HOST  → CLIENT : ZD1|ATK|2
CLIENT → HOST  : ZD1|OVR
```

## Errors

A peer transitions to `ERROR` on:

- `send()` fails (partial write or errno other than EAGAIN).
- Inbound buffer would overflow 32 KiB before seeing `\n`.
- `recv()` returns 0 (peer closed) → `DISCONNECTED`.
- `recv()` fails with a non-transient errno.

No explicit `BYE` verb is defined — graceful close is a TCP FIN. Future
versions may add `ZD1|BYE|reason`; older peers ignore it.

## Design notes

- **State replication via snapshots, not deltas.** Keeps protocol stateless
  between messages — packet loss or late-join catches up on the next SNP.
- **Attacks are events, not state.** `ATK` is authoritative and applied once;
  replaying a snapshot never re-applies attacks.
- **Host is authoritative for rules, not for gameplay.** Both peers simulate
  their own pieces/RNG independently. The only cross-peer sync is SNP (visual)
  and ATK/OVR (gameplay events).
- **Keep token indices stable.** Never reorder existing tokens in a verb. Only
  append.
