# Zltris Online Multiplayer Protocol (ZD1)

Line-oriented text protocol over TCP. `HOST` keeps the listening socket open and
can accept multiple `CLIENT` peers into one room. The message layer carries
`player_id` and `seat`, so participant lists, spectators, and future multi-board
rooms do not depend on socket position.

Each peer sends and receives full-duplex. The protocol is intentionally simple
and extensible so future versions can add new messages or fields without
breaking older clients.

## Transport

- TCP, IPv4, non-blocking sockets.
- Default port: `24777` (user-configurable in the setup screen).
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
LISTENING    ── accept() ──▶ READY (host room remains open for more peers)
CONNECTING   ── connected ─▶ HANDSHAKE
HANDSHAKE    ── ZD1|START ─▶ READY  ── users confirm start ─▶ RUNNING
ANY          ── socket err / disconnect ─▶ ERROR / DISCONNECTED
```

Handshake ordering:

1. Each peer sends `ZD1|HELLO|<role>|<name>|<seat>|<player_id>|M1` as soon as the socket is writable. Host replies with an appended assigned id: `ZD1|HELLO|0|<name>|0|1|M1|<assigned_client_player_id>`.
2. `HOST` sends `ZD1|CFG|...` (authoritative rules) to each connected client.
3. `CLIENT` applies config, sends `ZD1|READY|<player_id>|<seat>` if it is a player. This only acknowledges config/handshake, not the lobby ready button.
4. `HOST` broadcasts `PEERCLR` followed by one `PEER` line per participant whenever room membership changes.
5. `HOST` replies with `ZD1|START|<host_player_id>|<assigned_client_player_id>`, both player peers transition to `READY`.
6. Users ready in the setup screen via `PRP`. `HOST` rebroadcasts the full `PEER` roster after every lobby ready change, and peers transition to `RUNNING` only when every non-spectator player in the roster is ready.

Spectators use `seat = 1`. They may join the lobby and receive snapshots, but
do not send gameplay events (`SNP`, `ATK`, `OVR`) and do not participate in
ready/start matching as a player.

Current seat values:

- `0` — player.
- `1` — spectator.

Current role values:

- `0` — host/listener.
- `1` — client/connector.

Current ids:

- Host player id: `1`.
- Host assigns connected peers ids starting at `2` for room/list UI purposes.

For future full multi-board matches, keep ids stable for the duration of a room
and route `SNP` / `ATK` by `player_id` instead of by socket position.

## Verbs (current)

| Verb   | Direction  | Tokens | Purpose |
|--------|------------|--------|---------|
| HELLO  | both | `role`,`name`,`seat`,`player_id`,`cap`,`assigned_player_id` | Announce participant metadata. `cap` is currently `M1` for multiplayer-aware peers. Host appends `assigned_player_id` when greeting a client. |
| CFG | host→client | `bw`,`bh`,`g0*100`,`gr*100`,`hold`,`kick`,`start_garbage`,`guest_edit`,`extended_skyline`,`garbage_delay*100` | Authoritative match rules. Client overwrites locals. |
| READY | client→host | `player_id`,`seat` | Client accepted the CFG and can enter the lobby. This is not lobby ready. Spectators should not send this. |
| START | host→client | `host_player_id`,`assigned_player_id` | Host confirms match and repeats the client's unique id. Player peers go to READY state. |
| PEERCLR | host→client | — | Clear the local participant list before applying a refreshed room roster. |
| PEER | host→client | `player_id`,`seat`,`ready`,`name` | Participant roster entry. Clients use these ids to label and route peer snapshots. |
| PRP | both | `ready`,`player_id`,`seat` | Lobby ready toggle used by the setup UI. Spectators are displayed as watching rather than ready. |
| ROOM | both | — | Return from match to room/lobby. |
| LEFT | both | — | Peer left the match/session. |
| RST | both | — | Local player requests synchronized rematch restart. |
| ATK | players | `lines`,`from_player_id`,`target_player_id` | Attack garbage event. Senders choose a random alive non-spectator target excluding themselves. Host validates/reroutes invalid targets and relays the final target. Receivers apply garbage only when `target_player_id` matches their local id. |
| OVR | players | `player_id` | Sender's game is over. Host relays this so all peers can hide the eliminated player's board before the next snapshot. |
| END | host→client | `winner_player_id`,`runner_up_player_id` | Authoritative round end. Ensures already-eliminated peers and host show the result screen consistently and keep the final two boards visible. |
| SNP | players | `score`,`lines`,`over`,`piece_kind`,`piece_rot`,`piece_x`,`piece_y`,`bw`,`bh`,`board`,`player_id`,`seat` | Snapshot of sender's playfield at 10 Hz. `board` is `bw*bh` ASCII digits, row-major, `0` = empty. Host relays peer snapshots so every client can render every alive player. |

### Example transcript

```
# just after TCP connection
HOST  → CLIENT : ZD1|HELLO|0|Host|0|1|M1|2
HOST  → CLIENT : ZD1|CFG|10|20|140|40|0|0|0|0|0|100
CLIENT → HOST  : ZD1|HELLO|1|Guest|0|2|M1
CLIENT → HOST  : ZD1|READY|2|0
HOST  → CLIENT : ZD1|PEERCLR
HOST  → CLIENT : ZD1|PEER|1|0|0|Host
HOST  → CLIENT : ZD1|PEER|2|0|1|Guest
HOST  → CLIENT : ZD1|START|1|2

# in-match (10 Hz)
HOST  → CLIENT : ZD1|SNP|1240|7|0|3|0|4|17|10|20|0000...|1|0
CLIENT → HOST  : ZD1|SNP|800|4|0|1|2|5|18|10|20|0000...|2|0
HOST  → CLIENT : ZD1|SNP|800|4|0|1|2|5|18|10|20|0000...|2|0
HOST  → CLIENT : ZD1|ATK|2|1|2
CLIENT → HOST  : ZD1|OVR|2
HOST  → CLIENT : ZD1|OVR|2
HOST  → CLIENT : ZD1|END|1|2

# spectator join
CLIENT → HOST  : ZD1|HELLO|1|Viewer|1|2|M1
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
  replaying a snapshot never re-applies attacks. Garbage delivery delay is a
  match rule (`garbage_delay*100` in `CFG`), not a network delay.
- **Host is authoritative for rules and room membership, not for gameplay.**
  Player peers simulate their own pieces/RNG independently. The cross-peer sync
  is SNP (visual) and ATK/OVR (gameplay events). Spectators observe snapshots
  and room state.
- **Seats are separate from roles.** `HOST`/`CLIENT` describes the socket role;
  `seat` describes participation. A client can be a spectator.
- **Keep token indices stable.** Never reorder existing tokens in a verb. Only
  append.
