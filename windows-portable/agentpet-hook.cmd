@echo off
echo %DATE% %TIME% >> "E:\360MoveData\Users\67400\Desktop\vibepet\windows-portable\hook-calls.log"
"E:\360MoveData\Users\67400\Desktop\vibepet\windows-portable\agentpet.exe" hook --agent codex
exit /b 0
