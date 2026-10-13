#!/usr/bin/env bash
# ==============================================================================
# CSCTI - Compliance Platform
# Instalador Automatizado Passo a Passo para Ubuntu Server 24.04 LTS Limpo
# Arquitetura: 100% On-Premises / VM Local (PocketBase + React SPA + Nginx)
# ==============================================================================
set -euo pipefail

# Cores para saída no terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}   CSCTI COMPLIANCE CARTORIAL - INSTALADOR VM UBUNTU SERVER 24.04   ${NC}"
echo -e "${BLUE}===================================================================${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Este script deve ser executado como root (use sudo ./install.sh).${NC}"
   exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSCTI_ROOT="/opt/cscti"
BACKEND_DIR="${CSCTI_ROOT}/backend"
FRONTEND_DIR="${CSCTI_ROOT}/frontend"
MIGRATIONS_DIR="${BACKEND_DIR}/pb_migrations"
HOOKS_DIR="${BACKEND_DIR}/pb_hooks"
DATA_DIR="${BACKEND_DIR}/pb_data"

# 1. Atualização e instalação de pacotes essenciais
echo -e "\n${YELLOW}[1/7] Atualizando repositórios e instalando dependências do sistema...${NC}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    nginx \
    sqlite3 \
    curl \
    wget \
    unzip \
    tar \
    openssl \
    cron \
    ca-certificates \
    ufw

# 2. Criação do usuário de serviço dedicado e diretórios
echo -e "\n${YELLOW}[2/7] Criando usuário de serviço e estrutura de diretórios em ${CSCTI_ROOT}...${NC}"
if ! id -u cscti >/dev/null 2>&1; then
    useradd -r -s /bin/false -d "${CSCTI_ROOT}" cscti
    echo "  - Usuário de sistema 'cscti' criado."
fi

mkdir -p "${BACKEND_DIR}"
mkdir -p "${FRONTEND_DIR}"
mkdir -p "${MIGRATIONS_DIR}"
mkdir -p "${HOOKS_DIR}"
mkdir -p "${DATA_DIR}"
mkdir -p /etc/cscti
mkdir -p /var/log/cscti
mkdir -p /var/backups/cscti

# 3. Baixar binário oficial do PocketBase para Linux amd64
POCKETBASE_VERSION="0.24.4"
NEED_DOWNLOAD=false

if [[ -f "${BACKEND_DIR}/pocketbase" ]]; then
    INSTALLED_VER="$("${BACKEND_DIR}/pocketbase" --version 2>&1 | tr -d 'v' || true)"
    if [[ "${INSTALLED_VER}" == *"${POCKETBASE_VERSION}"* ]]; then
        echo -e "\n${YELLOW}[3/7] Binário PocketBase v${POCKETBASE_VERSION} já verificado em ${BACKEND_DIR}/pocketbase.${NC}"
    else
        echo -e "\n${YELLOW}[3/7] Binário existente possui versão diferente (${INSTALLED_VER}). Atualizando para v${POCKETBASE_VERSION}...${NC}"
        NEED_DOWNLOAD=true
    fi
else
    NEED_DOWNLOAD=true
fi

if [[ "${NEED_DOWNLOAD}" == "true" ]]; then
    echo -e "\n${YELLOW}[3/7] Baixando binário oficial do PocketBase v${POCKETBASE_VERSION}...${NC}"
    PB_TMP="$(mktemp -d /tmp/pb_dl_XXXXXX)"
    wget -q --show-progress "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" -O "${PB_TMP}/pocketbase.zip"
    unzip -q -o "${PB_TMP}/pocketbase.zip" -d "${BACKEND_DIR}"
    rm -rf "${PB_TMP}"
    chmod +x "${BACKEND_DIR}/pocketbase"
    echo -e "  - PocketBase instalado em ${BACKEND_DIR}/pocketbase"
fi

# Verificação rigorosa pós-download: pocketbase --version deve retornar 0.24.4
CHECK_VERSION="$("${BACKEND_DIR}/pocketbase" --version 2>&1 || true)"
if [[ "${CHECK_VERSION}" != *"0.24.4"* ]]; then
    echo -e "${RED}ERRO CRÍTICO: Falha na validação do binário do PocketBase!${NC}"
    echo -e "${RED}Esperado versão contendo '0.24.4', porém o comando retornou: '${CHECK_VERSION}'${NC}"
    exit 1
fi
echo -e "  - Validação de versão concluída com sucesso: ${GREEN}${CHECK_VERSION}${NC}"

# 4. Copiar migrações, hooks do backend e build do frontend
echo -e "\n${YELLOW}[4/7] Copiando migrações, hooks e build do frontend...${NC}"

# Copiar arquivos de migração do repositório
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if [[ -d "${PROJECT_ROOT}/pocketbase/migrations" ]]; then
    cp -r "${PROJECT_ROOT}/pocketbase/migrations"/* "${MIGRATIONS_DIR}/"
    echo "  - Migrações copiadas para ${MIGRATIONS_DIR}"
fi

# Copiar hooks do backend (GLPI, comprovantes, etc.)
if [[ -d "${PROJECT_ROOT}/pocketbase/hooks" ]]; then
    cp -r "${PROJECT_ROOT}/pocketbase/hooks"/* "${HOOKS_DIR}/"
    echo "  - Hooks JS copiados para ${HOOKS_DIR}"
fi

# Copiar build de produção do frontend (dist)
if [[ -d "${PROJECT_ROOT}/dist" ]]; then
    cp -r "${PROJECT_ROOT}/dist"/* "${FRONTEND_DIR}/"
    echo "  - Frontend de produção copiado para ${FRONTEND_DIR}"
else
    echo -e "${YELLOW}  - Diretório dist/ não encontrado localmente. Um index.html placeholder foi gerado temporariamente.${NC}"
    cat <<'EOF' > "${FRONTEND_DIR}/index.html"
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>CSCTI Compliance Platform</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h1>CSCTI Compliance Platform - Servidor Instalado</h1>
  <p>Execute <code>npm run build</code> e copie a pasta <code>dist/*</code> para <code>/opt/cscti/frontend</code>.</p>
</body>
</html>
EOF
fi

# Copiar arquivo de variáveis de ambiente se não existir
if [[ ! -f /etc/cscti/cscti.env ]]; then
    cp "${SCRIPT_DIR}/cscti.env.example" /etc/cscti/cscti.env
    echo "  - Arquivo /etc/cscti/cscti.env criado a partir do modelo."
fi

# 5. Configurar certificados SSL (Gera certificado autoassinado se não houver um comercial)
echo -e "\n${YELLOW}[5/7] Configurando segurança SSL/TLS e Nginx...${NC}"
mkdir -p /etc/ssl/certs /etc/ssl/private
if [[ ! -f /etc/ssl/certs/cscti-selfsigned.crt ]]; then
    echo "  - Gerando certificado autoassinado para inicialização imediata em HTTPS (10 anos)..."
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/ssl/private/cscti-selfsigned.key \
        -out /etc/ssl/certs/cscti-selfsigned.crt \
        -subj "/C=BR/ST=SP/L=Local/O=Cartorio/OU=TI/CN=compliance.cartorio.local" \
        2>/dev/null
    chmod 600 /etc/ssl/private/cscti-selfsigned.key
fi

# Configurar site Nginx
DOMAIN="compliance.cartorio.local"
if [[ -f /etc/cscti/cscti.env ]]; then
    ENV_DOMAIN=$(grep -E "^DOMAIN=" /etc/cscti/cscti.env | cut -d'=' -f2 | tr -d '"' | tr -d "'" || true)
    if [[ -n "$ENV_DOMAIN" ]]; then
        DOMAIN="$ENV_DOMAIN"
    fi
fi

sed "s/__DOMAIN__/${DOMAIN}/g" "${SCRIPT_DIR}/nginx/cscti.conf" > /etc/nginx/sites-available/cscti.conf
ln -sf /etc/nginx/sites-available/cscti.conf /etc/nginx/sites-enabled/cscti.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx || systemctl restart nginx

# 6. Configurar serviço systemd do PocketBase e permissões
echo -e "\n${YELLOW}[6/7] Instalando e iniciando serviço systemd cscti-pocketbase...${NC}"
cp "${SCRIPT_DIR}/systemd/cscti-pocketbase.service" /etc/systemd/system/cscti-pocketbase.service
systemctl daemon-reload

chown -R cscti:cscti "${CSCTI_ROOT}"
chmod -R 750 "${CSCTI_ROOT}"
chown -R cscti:cscti /var/log/cscti
chown -R cscti:cscti /var/backups/cscti

systemctl enable cscti-pocketbase
systemctl restart cscti-pocketbase

# 7. Configurar cron de backup diário às 01:00
echo -e "\n${YELLOW}[7/7] Agendando rotina diária de backup local do sistema...${NC}"
chmod +x "${SCRIPT_DIR}/scripts/"*.sh
CRON_JOB="0 1 * * * /opt/cscti/backend/scripts/backup-cscti.sh >> /var/log/cscti/backup.log 2>&1"
mkdir -p "${BACKEND_DIR}/scripts"
cp "${SCRIPT_DIR}/scripts/"*.sh "${BACKEND_DIR}/scripts/"
chmod +x "${BACKEND_DIR}/scripts/"*.sh

(crontab -l 2>/dev/null | grep -v "backup-cscti.sh" ; echo "$CRON_JOB") | crontab -

# Configurar firewall UFW se estiver ativo
if ufw status | grep -q "Status: active"; then
    echo "  - Liberando portas 80/tcp e 443/tcp no UFW..."
    ufw allow 80/tcp comment "CSCTI HTTP"
    ufw allow 443/tcp comment "CSCTI HTTPS"
fi

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO CONCLUÍDA COM SUCESSO NA VM UBUNTU SERVER 24.04!   ${NC}"
echo -e "${GREEN}===================================================================${NC}"
echo -e "Acesse a aplicação no seu navegador:"
echo -e "  - Aplicação Web: ${BLUE}https://${DOMAIN}/${NC} (ou https://<IP-DA-VM>/)"
echo -e "  - Painel Admin PocketBase: ${BLUE}https://${DOMAIN}/_/${NC}"
echo -e "  - Logs em tempo real: ${YELLOW}journalctl -u cscti-pocketbase -f${NC}"
echo -e "  - Backup manual do sistema: ${YELLOW}sudo /opt/cscti/backend/scripts/backup-cscti.sh${NC}"
echo -e "==================================================================="
