@echo off
cd /d "c:\finance-mobile-1"
if defined VIRTUAL_ENV (call deactivate 2>nul)
set "PATH=C:\Program Files\nodejs;%PATH%"
npx expo start --clear
pause
