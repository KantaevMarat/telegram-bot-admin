@echo off
REM Простой батник для выполнения очистки на удаленном сервере
REM Использование: run-remote-cleanup.bat

echo === Выполнение очистки на удаленном сервере ===
echo Сервер: root@79.174.93.115
echo.

REM Передача скрипта через stdin
type cleanup-remote-server.sh | ssh root@79.174.93.115 "bash -s"

echo.
echo === Готово ===
pause

