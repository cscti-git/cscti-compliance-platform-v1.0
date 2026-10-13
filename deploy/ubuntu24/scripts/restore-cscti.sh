#!/usr/bin/env bash
# ==============================================================================
# CSCTI - Compliance Platform
# Script de Restauração de Desastre (Disaster Recovery)
# ==============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Uso: sudo $0 /caminho/para/cscti_backup_YYYYMMDD_HHMMSS.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "==================================================================="
echo "  CSCTI COMPLIANCE - RESTAURAÇÃO DE BACKUP LOCAL"
echo "==================================================================="
echo "Arquivo selecionado: $BACKUP_FILE"
read -rp "Atenção: Os dados atuais em /opt/cscti/backend/pb_data serão substituídos. Confirma? [s/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "Operação cancelada pelo operador."
    exit 0
fi

# 1. Parar o serviço PocketBase para restauração atômica
echo "Parando serviço cscti-pocketbase..."
systemctl stop cscti-pocketbase

TEMP_DIR="$(mktemp -d /tmp/cscti_restore_XXXXXX)"
echo "Extraindo arquivo de backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 2. Restaurar banco SQLite
if [[ -f "${TEMP_DIR}/db/data.db" ]]; then
    mkdir -p /opt/cscti/backend/pb_data
    cp "${TEMP_DIR}/db/data.db" /opt/cscti/backend/pb_data/data.db
    echo "  - Banco SQLite restaurado."
fi

# 3. Restaurar storage de evidências
if [[ -d "${TEMP_DIR}/storage" ]]; then
    mkdir -p /opt/cscti/backend/pb_data/storage
    cp -r "${TEMP_DIR}/storage"/* /opt/cscti/backend/pb_data/storage/ 2>/dev/null || true
    echo "  - Storage de evidências restaurado."
fi

# 4. Ajustar permissões
chown -R cscti:cscti /opt/cscti/backend/pb_data
chmod -R 750 /opt/cscti/backend/pb_data

rm -rf "$TEMP_DIR"

# 5. Reiniciar o serviço
echo "Reiniciando serviço cscti-pocketbase..."
systemctl start cscti-pocketbase

echo "==================================================================="
echo "Restauração finalizada com sucesso! Verifique o status com:"
echo "  sudo systemctl status cscti-pocketbase"
echo "==================================================================="
