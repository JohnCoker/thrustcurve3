#!/bin/sh
# Load the sample database, start the app, and run the given command.
set -eu

if [ $# -eq 0 ]; then
  echo "usage: with-test-server.sh command..." >&2
  exit 2
fi

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"

log="$root/tmp/www-test.log"
mkdir -p "$root/tmp"

./database/testdb.sh
./bin/www-test >"$log" 2>&1 &
server_pid=$!

finish() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "----- server log -----" >&2
    cat "$log" >&2 || true
  fi
  kill "$server_pid" >/dev/null 2>&1 || true
  exit "$status"
}
trap finish EXIT INT TERM

ready=0
i=0
while [ "$i" -lt 40 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:3000/; then
    ready=1
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "server exited before it was ready" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "server did not become ready" >&2
  exit 1
fi

"$@"
