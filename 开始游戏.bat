@echo off
title C Quest
cd /d "%~dp0"

echo.
echo   ========================================
echo      C Language Quest
echo   ========================================
echo.
echo    [1] 打开游戏（推荐，含在线编译器）
echo    [2] 玩终端版
echo    [3] 重新编译终端版
echo    [4] 查看说明
echo.
set /p choice=  请选择 (1-4):

if "%choice%"=="1" goto web
if "%choice%"=="2" goto terminal
if "%choice%"=="3" goto rebuild
if "%choice%"=="4" goto readme
goto web

:web
echo.
where node >nul 2>nul
if errorlevel 1 goto web_nonode

echo   正在启动本地服务（用于加载浏览器内编译器）...
echo.
echo   服务起来后浏览器会自动打开。
echo   这个窗口别关，关了就玩不了实操题了。
echo.
start "" http://127.0.0.1:7788
node server.js
echo.
echo   服务已停止。
pause
exit

:web_nonode
echo   [提示] 没找到 Node.js
echo.
echo   没有 Node 也能玩大部分内容，但「动手写代码」跑不了。
echo   现在直接用浏览器打开 index.html：
echo.
start "" "index.html"
echo   想完整体验的话，装个 Node.js： https://nodejs.org
echo.
pause
exit

:terminal
if not exist "c-quest.exe" goto rebuild_run
chcp 65001 >nul
"c-quest.exe"
chcp 936 >nul
echo.
pause
exit

:rebuild_run
echo   还没编译过，先编译一次...
echo.

:rebuild
if not exist "tools	cc	cc.exe" (
    echo   [错误] 找不到 tools	cc	cc.exe
    echo   可以自己装个编译器，然后执行：
    echo       gcc -O2 -o c-quest.exe c-quest.c
    echo.
    pause
    exit
)
echo   正在用自带的 TCC 编译...
"tools	cc	cc.exe" -o "c-quest.exe" "c-quest.c"
if errorlevel 1 (
    echo.
    echo   [编译失败] 看看上面的报错。
    pause
    exit
)
echo   编译成功！生成 c-quest.exe
echo.
if "%choice%"=="3" (
    pause
    exit
)
chcp 65001 >nul
"c-quest.exe"
chcp 936 >nul
echo.
pause
exit

:readme
if exist "README.md" (
    start "" "README.md"
) else (
    echo   没有找到 README.md
    pause
)
exit
