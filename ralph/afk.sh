#!/bin/bash
set -eo pipefail

if [[ ! $1 =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 <iterations>  (positive integer, no leading zeros)"
  exit 1
fi
iterations=$1

# jq filter to extract streaming text from assistant messages
stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

# jq filter to extract final result
final_result='select(.type == "result").result // empty'

# Hoisted above the loop: traps are not cumulative, so setting this per
# iteration would leave every earlier tmpfile behind. `tee` truncates, so
# one file is safely reused across iterations.
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

for ((i=1; i<=iterations; i++)); do
  commits=$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")
  issues=$(gh issue list --state open --json number,title,body,comments)
  prompt=$(cat ralph/prompt.md)

  # Run as an `if` condition so the pipeline is exempt from `set -e`, which
  # would otherwise kill the run right here on a non-zero exit — the usual
  # shape of an auth/quota failure — while the operator is by definition
  # away. Diagnose it instead.
  if ! claude \
    --verbose \
    --print \
    --output-format stream-json \
    --permission-mode auto \
    "Previous commits: $commits $issues $prompt" \
  | { grep --line-buffered '^{' || true; } \
  | tee "$tmpfile" \
  | jq --unbuffered -rj "$stream_text"
  then
    echo "Ralph: iteration $i exited non-zero; aborting." >&2
    exit 1
  fi

  # The other failure shape: a plain-text CLI error that still exits 0, so
  # `grep` filtered every line away and there is no result to parse below.
  if [ ! -s "$tmpfile" ]; then
    echo "Ralph: iteration $i produced no JSON output; aborting." >&2
    exit 1
  fi

  result=$(jq -r "$final_result" "$tmpfile")

  if [[ "$result" == *"<promise>NO MORE TASKS</promise>"* ]]; then
    echo "Ralph complete after $i iterations."
    exit 0
  fi
done
