#!/usr/bin/env bash
set -eu

if ! [ -t 0 ]; then
  echo '请在交互式终端中重置密码。' >&2
  exit 1
fi

IFS= read -r -s -p '输入新密码（至少 12 个字符）：' password
printf '\n' >&2
IFS= read -r -s -p '再次输入新密码：' confirmation
printf '\n' >&2

if [[ "$password" != "$confirmation" ]]; then
  echo '两次输入的密码不一致。' >&2
  exit 1
fi

printf '%s' "$password" | payload run src/admin/reset-password.ts
