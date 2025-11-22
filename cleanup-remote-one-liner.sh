#!/bin/bash
# Однострочная команда для очистки удаленного сервера
# Скрипт НЕ нужен на сервере - команды передаются напрямую через SSH

# Полная очистка (Docker + сборки + информация о диске)
ssh root@79.174.93.115 "bash -c 'echo \"=== Очистка Docker ===\"; CONTAINERS=\$(docker ps -a -q 2>/dev/null || echo \"\"); [ -n \"\$CONTAINERS\" ] && docker stop \$CONTAINERS && docker rm \$CONTAINERS; docker system prune -a --volumes -f 2>/dev/null || echo \"Docker недоступен\"; echo \"\"; echo \"=== Очистка сборок ===\"; for dir in /var/www/builds /var/www/dist /root/project/dist /root/project/builds /home/root/project/dist /opt/app/dist /opt/app/builds; do [ -d \"\$dir\" ] && rm -rf \"\$dir\"/* && echo \"Очищено: \$dir\" || true; done; echo \"\"; echo \"=== Использование диска ===\"; df -h /'"

