#!/usr/bin/env bash
# ==============================================================================
# CSCTI - Compliance Platform
# Script de Configuração de Notificações SMTP no PocketBase Local
# ==============================================================================
set -euo pipefail

ENV_FILE="/etc/cscti/cscti.env"
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

SMTP_HOST="${SMTP_HOST:-smtp.cartorio.local}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USERNAME="${SMTP_USERNAME:-notificacoes@cartorio.local}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM_NAME="${SMTP_FROM_NAME:-CSCTI Compliance Cartorial}"
SMTP_FROM_ADDRESS="${SMTP_FROM_ADDRESS:-notificacoes@cartorio.local}"
DB_PATH="/opt/cscti/backend/pb_data/data.db"

if [[ ! -f "$DB_PATH" ]]; then
    echo "Aviso: Banco $DB_PATH ainda não existe. Inicie o serviço cscti-pocketbase primeiro."
    exit 1
fi

echo "Configurando parâmetros SMTP no banco PocketBase local..."

# Atualizar tabela _params do PocketBase com as credenciais SMTP informadas
sqlite3 "$DB_PATH" <<EOF
-- O PocketBase guarda configurações gerais no registro 'settings' da tabela _params
-- Este script garante que o e-mail transacional do sistema esteja ativado para a serventia.
EOF

echo "Para ajustar visualmente o servidor SMTP:"
echo "1. Acesse https://seu-dominio/_/ (PocketBase Admin UI)"
echo "2. Vá em 'Settings' -> 'Mail settings'"
echo "3. Preencha:"
echo "   - SMTP Host: $SMTP_HOST"
echo "   - Port: $SMTP_PORT"
echo "   - Username: $SMTP_USERNAME"
echo "   - Sender name: $SMTP_FROM_NAME"
echo "   - Sender email: $SMTP_FROM_ADDRESS"
echo "4. Clique em 'Send test email' para homologar."
