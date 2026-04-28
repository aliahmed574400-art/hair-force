@echo off
cd /d "E:\My business\Projects\hairforce"
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3001 1>>".codex-local-dev-3001.log" 2>>".codex-local-dev-3001.err.log"
