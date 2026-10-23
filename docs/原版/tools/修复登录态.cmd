@echo off
chcp 65001 >nul
cd /d "%~dp0"
node "%~dp0修复登录态.js"
pause
