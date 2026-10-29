@echo off
chcp 65001 >nul
title 推送到 GitHub
cd /d "%~dp0"

echo.
echo   ========================================
echo      把 C Quest 推送到 GitHub
echo   ========================================
echo.
echo   前提：你已经在 GitHub 网页上创建了一个空仓库
echo         （不要勾选 README / .gitignore / LICENSE）
echo.
echo   仓库地址长这样：
echo         https://github.com/你的用户名/仓库名.git
echo.

set /p REPO=  请粘贴仓库地址:

if "%REPO%"=="" (
    echo.
    echo   没输入地址，退出。
    pause
    exit
)

echo.
echo   仓库地址: %REPO%
echo.
echo   正在配置远程仓库...

git remote remove origin 2>nul
git remote add origin "%REPO%"

if errorlevel 1 (
    echo.
    echo   [失败] 地址格式可能不对
    pause
    exit
)

echo   OK
echo.
echo   开始推送（39MB，可能需要几分钟）...
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo   ========================================
    echo   [推送失败]
    echo   ========================================
    echo.
    echo   常见原因：
    echo.
    echo   1. 需要认证
    echo      会弹出登录窗口，用浏览器授权即可
    echo      或者用 Personal Access Token 当密码
    echo.
    echo   2. 仓库不是空的
    echo      如果建仓库时勾了 README，先执行：
    echo         git pull --rebase origin main
    echo      然后再运行本脚本
    echo.
    echo   3. 网络问题
    echo      检查是否能访问 github.com
    echo.
    pause
    exit
)

echo.
echo   ========================================
echo   推送成功
echo   ========================================
echo.
echo   打开你的仓库页面看看：
echo   %REPO%
echo.
echo   如果要在仓库里显示在线体验链接，
echo   检查 README.md 第一段的 Netlify 地址是否正确。
echo.
pause
