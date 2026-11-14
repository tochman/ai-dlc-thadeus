# THADEUS agent dialogs: the hook script for Claude Code (US-0506 u1 FR4.6, NFR4, NFR5; channel protocol C1 v1).
# Usage: sh dialog.sh <kind> with the hook input on stdin. Kinds: question (waits for an answer), answered (never waits).
# It writes one event file into the session folder the app gave the agent ($THADEUS_SESSION_DIR) and, for a question,
# prints the app's answer when one arrives. Every other path prints nothing and exits 0, so the agent shows its own
# picker. It never parses the input: the payload is copied by cat and no input is ever expanded (SD5).
#
# Shell features: POSIX only, plus `sleep 0.1` (fractional seconds; macOS and GNU sleep take it). A sleep that
# refuses it fails the probe below, so the hook hands back before it writes anything (R-03). No [[, $RANDOM,
# arrays, local or ERR trap; no redirect on a special builtin such as `:` or `exec`, except the first line (R-01:
# dash exits 2 when such a redirect fails, before `|| exit 0` runs).
exec 2>/dev/null
d=${THADEUS_SESSION_DIR:-}; s=${THADEUS_SESSION_SECRET:-}; w=${THADEUS_WAIT_SECONDS:-}
case ${1:-} in question) waits=1 ;; answered) waits=0 ;; *) exit 0 ;; esac
case $w in '' | *[!0-9]*) exit 0 ;; esac
[ -n "$d" ] && [ -n "$s" ] && read -r last < "$d/alive" || exit 0
# R-03: probe fractional sleep, and count it as the first of the 20 liveness sleeps, so 20 unchanged polls
# always mean at least 2.0 s.
if [ "$waits" = 1 ]; then sleep 0.1 || exit 0; fi
t0=$(date +%s) || exit 0
n=$t0-$$; a=$d/answers/$n
trap 'rm -f "$a.wait" "$a.took"' EXIT
trap 'exit 0' HUP INT TERM
# The wait marker exists before the event can be seen, so the app never writes an answer nobody waits for (RD2).
if [ "$waits" = 1 ]; then printf '' > "$a.wait" || exit 0; fi
{ printf 'THADEUS-EVENT v1 %s %s\n' "$1" "$s" && cat; } > "$d/events/$n.tmp" || exit 0
mv "$d/events/$n.tmp" "$d/events/$n.evt" || exit 0
[ "$waits" = 1 ] || exit 0
# Per poll: one [ -f ], one read, one date, one sleep; mv and cat only when an answer is there (SCD4).
same=0
while :; do
  if [ -f "$a.ans" ] && mv "$a.ans" "$a.took"; then cat "$a.took"; exit 0; fi
  read -r cur < "$d/alive" || exit 0
  if [ "$cur" = "$last" ]; then same=$((same + 1)); else same=0; last=$cur; fi
  [ "$same" -lt 20 ] || exit 0
  now=$(date +%s) || exit 0
  [ $((now - t0)) -lt "$w" ] || exit 0
  sleep 0.1 || exit 0
done
