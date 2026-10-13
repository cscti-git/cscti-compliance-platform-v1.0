#!/usr/bin/env bash
# ==============================================================================
# CSCTI - Compliance Platform
# Rotina de Backup Local do Próprio Sistema (PocketBase + SQLite + Storage + Hooks)
# ==============================================================================
set -euo pipefail

ENV_FILE="/etc/cscti/cscti.env"
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/cscti}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
TARGET_ARCHIVE="${BACKUP_DIR}/cscti_backup_${TIMESTAMP}.tar.gz"
TEMP_DIR="$(mktemp -d /tmp/cscti_bkp_XXXXXX)"

mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Iniciando rotina de backup local da CSCTI Compliance..."

# 1. Realizar backup consistente do banco SQLite usando .backup do próprio SQLite
# Isso evita corrupção mesmo com o PocketBase em execução concorrente
DB_PATH="/opt/cscti/backend/pb_data/data.db"
if [[ -f "$DB_PATH" ]]; then
    mkdir -p "${TEMP_DIR}/db"
    sqlite3 "$DB_PATH" ".backup '${TEMP_DIR}/db/data.db'"
    echo "  - Banco SQLite copiado consistentemente com sucesso."
fi

# 2. Copiar storage de arquivos (evidências, laudos técnicos, fotos de infraestrutura)
STORAGE_PATH="/opt/cscti/backend/pb_data/storage"
if [[ -d "$STORAGE_PATH" ]]; then
    mkdir -p "${TEMP_DIR}/storage"
    cp -r "$STORAGE_PATH"/* "${TEMP_DIR}/storage/" 2>/dev/null || true
    echo "  - Arquivos de evidências/storage copiados."
fi

# 3. Copiar configurações e migrações aplicadas
if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "${TEMP_DIR}/cscti.env"
fi

# 4. Criar manifesto de metadados
cat <<EOF > "${TEMP_DIR}/manifest.json"
{
  "backup_date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "timestamp": "${TIMESTAMP}",
  "system": "CSCTI Compliance Platform",
  "version": "1.0-onpremises",
  "hostname": "$(hostname)"
}
EOF

# 5. Compactar tudo em arquivo .tar.gz
tar -czf "$TARGET_ARCHIVE" -C "$TEMP_DIR" .
chmod 600 "$TARGET_ARCHIVE"
rm -rf "$TEMP_DIR"

BACKUP_SIZE="$(du -h "$TARGET_ARCHIVE" | cut -f1)"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup concluído: ${TARGET_ARCHIVE} (${BACKUP_SIZE})"

# 6. Limpar backups antigos excedendo a retenção configurada
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Aplicando política de retenção (${RETENTION_DAYS} dias)..."
find "$BACKUP_DIR" -type f -name "cscti_backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Rotina de backup finalizada com sucesso."
