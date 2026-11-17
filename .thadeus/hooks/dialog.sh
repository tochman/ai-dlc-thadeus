# THADEUS agent dialogs: the hook script for Claude Code (US-0506 u1 FR4.6, NFR4, NFR5; channel protocol C1 v1).
# Usage: sh dialog.sh <kind> with the hook input on stdin. Kinds: question and permission (US-0506 u2 RD14) wait for an
# answer; answered never waits; reply (US-0506 u3, the Stop hook: never waits, BR6.1; copies at most 1 048 577 bytes and
# gives up after 2 s, RD10).
# It writes one event file into the session folder the app gave the agent ($THADEUS_SESSION_DIR) and, for a waiting kind,
# prints the app's answer when one arrives. Every other path prints nothing and exits 0, so the agent shows its own
# picker. It never parses the input: the payload is copied by cat and no input is ever expanded (SD5).
#
# Shell features: POSIX only, plus `sleep 0.1` (fractional seconds) and `head -c` (a byte count), both on macOS,
# GNU and busybox. A sleep that
# refuses it fails the probe below, so the hook hands back before it writes anything (R-03). No [[, $RANDOM,
# arrays, local or ERR trap; no redirect on a special builtin such as `:` or `exec`, except the first line (R-01:
# dash exits 2 when such a redirect fails, before `|| exit 0` runs).
exec 2>/dev/null
d=${THADEUS_SESSION_DIR:-}; s=${THADEUS_SESSION_SECRET:-}; w=${THADEUS_WAIT_SECONDS:-}
case ${1:-} in question | permission) waits=1 ;; answered | reply | session | notify | precompact | postcompact) waits=0 ;; *) exit 0 ;; esac
case $w in '' | *[!0-9]*) exit 0 ;; esac
[ -n "$d" ] && [ -n "$s" ] && read -r last < "$d/alive" || exit 0
# R-03: probe fractional sleep, and count it as the first of the 20 liveness sleeps, so 20 unchanged polls
# always mean at least 2.0 s.
if [ "$waits" = 1 ]; then sleep 0.1 || exit 0; fi
t0=$(date +%s) || exit 0
n=$t0-$$; a=$d/answers/$n
trap 'rm -f "$a.wait" "$a.took"' EXIT
trap 'exit 0' HUP INT TERM
# US-0506 u3 RD10, K10: the Stop hook must never block the agent. A background cat copies stdin into head, which
# keeps at most one byte over the channel's limit (review R-05); a watchdog kills cat after 2 s if stdin is never
# closed (review R-04). cat, not head, is the one killed: BSD head -c holds a partial block until EOF, so killing it
# would lose the bytes already read; with cat gone the pipe ends and head writes what it has.
# fd 3 is set on brace groups, not by `exec 3<&0`: no redirect on a special builtin (u1 review R-01). The first
# group only checks that stdin is open, before anything is written.
# US-0213 NFR3: session (SessionStart), notify (Notification), precompact (PreCompact) and postcompact (PostCompact)
# take the same bounded copy. precompact then prints the instruction file the app wrote into the session folder (FR4.2).
case $1 in reply | session | notify | precompact | postcompact)
  { true; } 3<&0 || exit 0
  f=$d/events/$n.tmp
  printf 'THADEUS-EVENT v1 %s %s\n' "$1" "$s" > "$f" || exit 0
  {
    cat <&3 & c=$!
    ( sleep 2; kill "$c" ) </dev/null >/dev/null 3<&- & k=$!
    wait "$c"
    kill "$k"
  } 3<&0 | head -c 1048577 >> "$f" || exit 0
  mv "$f" "$d/events/$n.evt" || exit 0
  if [ "$1" = precompact ] && [ -f "$d/compact.txt" ]; then cat "$d/compact.txt"; fi
  exit 0 ;;
esac
# The wait marker exists before the event can be seen, so the app never writes an answer nobody waits for (RD2).
if [ "$waits" = 1 ]; then printf '' > "$a.wait" || exit 0; fi
{ printf 'THADEUS-EVENT v1 %s %s\n' "$1" "$s" && cat; } > "$d/events/$n.tmp" || exit 0
mv "$d/events/$n.tmp" "$d/events/$n.evt" || exit 0
[ "$waits" = 1 ] || exit 0
# Per poll: one [ -f ], one read, one sleep; mv and cat only when an answer is there (SCD4). The deadline is whole
# seconds, so `date` runs every 10th poll only: each fork adds to the 20 liveness polls, and on a loaded macOS `sh`
# two forks a poll pushed the hand-back past 2.5 s (US-0210 Build and Test).
same=0 i=0
while :; do
  if [ -f "$a.ans" ] && mv "$a.ans" "$a.took"; then cat "$a.took"; exit 0; fi
  read -r cur < "$d/alive" || exit 0
  if [ "$cur" = "$last" ]; then same=$((same + 1)); else same=0; last=$cur; fi
  [ "$same" -lt 20 ] || exit 0
  i=$((i + 1))
  if [ "$i" -ge 10 ]; then
    i=0
    now=$(date +%s) || exit 0
    [ $((now - t0)) -lt "$w" ] || exit 0
  fi
  sleep 0.1 || exit 0
done
