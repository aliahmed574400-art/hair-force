@echo off
cd /d "E:\My business\Projects\hairforce"
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3000 1>>".codex-local-dev.log" 2>>".codex-local-dev.err.log"
