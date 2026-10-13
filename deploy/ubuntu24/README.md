# Guia Completo de Implantação em VM Ubuntu Server 24.04 LTS
## Plataforma CSCTI - Compliance Cartorial (100% Local / On-Premises)

Este pacote contém todos os scripts, serviços systemd, configurações do Nginx com SSL/TLS e rotinas de backup para implantar a plataforma **CSCTI - Compliance** em uma Máquina Virtual limpa com **Ubuntu Server 24.04 LTS** (ou 22.04 LTS), sem nenhuma dependência de nuvem externa.

---

### 1. Arquitetura do Sistema

A plataforma CSCTI adota uma arquitetura moderna, leve e auto-contida:
- **Backend**: [PocketBase](https://pocketbase.io) rodando nativamente como serviço Linux (systemd). Inclui banco de dados relacional embarcado SQLite de altíssima performance, autenticação multi-tenant, migrações JavaScript (`pb_migrations`) e rotinas de backend (`pb_hooks`).
- **Frontend**: Aplicação Single-Page Application (SPA) em React 19 + TypeScript + Tailwind CSS, compilada estaticamente para máxima performance e servida pelo Nginx.
- **Servidor Web & Proxy Reverso**: Nginx com terminação HTTPS (TLS 1.2/1.3), compressão Gzip, roteamento de SPA (`try_files`) e proxy reverso para as rotas `/api/` e `/backend/`.
- **Rotina de Backup**: Script em Bash executado diariamente via cron (`/opt/cscti/backend/scripts/backup-cscti.sh`), que realiza cópia atômica consistente do banco SQLite (`.backup`), arquivos de evidência/storage e manifesto JSON, mantendo retenção de 30 dias com compactação `.tar.gz`.

---

### 2. Requisitos Mínimos da Máquina Virtual

- **Sistema Operacional**: Ubuntu Server 24.04 LTS (x86_64 / amd64)
- **Processador (vCPU)**: 2 vCPUs (4 vCPUs recomendadas para serventias com mais de 50 colaboradores)
- **Memória RAM**: 2 GB (4 GB recomendados)
- **Armazenamento**: 30 GB SSD livre (ou mais, dependendo do volume de comprovantes de backup e relatórios anexados)
- **Rede**: IP estático configurado na LAN do cartório (ou DNS interno configurado, ex: `compliance.cartorio.local`)

---

### 3. Instalação Rápida (Passo a Passo Automatizado)

#### Passo 1 — Clonar ou copiar o projeto para a VM
Na VM Ubuntu limpa, crie um diretório de trabalho e transfira o código do projeto:
```bash
sudo mkdir -p /root/cscti-src
cd /root/cscti-src
# (Transfira o arquivo zip/tar do projeto ou clone via git)
```

#### Passo 2 — Compilar o frontend de produção (se ainda não compilado)
```bash
# Instalar Node.js 20+ se necessário:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Compilar:
npm ci
npm run build
```
O diretório `dist/` será gerado com todos os assets estáticos otimizados.

#### Passo 3 — Executar o Instalador Automatizado
```bash
cd deploy/ubuntu24
sudo chmod +x install.sh scripts/*.sh
sudo ./install.sh
```

O instalador irá automaticamente:
1. Instalar Nginx, SQLite3, Curl, OpenSSL, Tar, UFW;
2. Criar o usuário de sistema seguro `cscti`;
3. Baixar o binário oficial do PocketBase para Linux amd64;
4. Copiar todas as 74+ migrações do banco e os hooks de integração (GLPI, comprovantes Veeam/Acronis/NOC);
5. Copiar os arquivos estáticos compilados do frontend para `/opt/cscti/frontend`;
6. Gerar certificado SSL autoassinado de 10 anos (ou preparar para certificado comercial);
7. Configurar e testar o Nginx com terminação HTTPS;
8. Registrar, habilitar e iniciar o serviço systemd `cscti-pocketbase.service`;
9. Configurar crontab de backup diário às 01:00 em `/var/backups/cscti`.

---

### 4. Estrutura de Diretórios na VM

```
/opt/cscti/
├── backend/
│   ├── pocketbase             # Binário executável do PocketBase
│   ├── pb_data/               # Banco SQLite (data.db) e uploads (storage/)
│   ├── pb_migrations/         # Migrações aplicadas no startup
│   ├── pb_hooks/              # Motores JS (glpi_sync.js, backup.js, etc.)
│   └── scripts/               # Scripts de backup e restore
└── frontend/                  # Arquivos compilados do React (index.html, assets/)

/etc/cscti/
└── cscti.env                  # Variáveis de ambiente e segredos locais

/var/backups/cscti/            # Arquivos de backup diário (.tar.gz)
/var/log/cscti/                # Logs de execução e rotinas
```

---

### 5. Comandos de Gerenciamento do Sistema

#### Verificar status do backend:
```bash
sudo systemctl status cscti-pocketbase
```

#### Ver logs do backend em tempo real:
```bash
sudo journalctl -u cscti-pocketbase -f
```

#### Reiniciar o backend:
```bash
sudo systemctl restart cscti-pocketbase
```

#### Recarregar Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

#### Executar backup manual sob demanda:
```bash
sudo /opt/cscti/backend/scripts/backup-cscti.sh
```

#### Restaurar backup em caso de desastre:
```bash
sudo /opt/cscti/backend/scripts/restore-cscti.sh /var/backups/cscti/cscti_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

### 6. Configuração de Notificações SMTP da Serventia

Para configurar o servidor de e-mail (ex.: Exchange, Google Workspace, Postfix interno):
1. Edite o arquivo `/etc/cscti/cscti.env` com os dados do SMTP do cartório;
2. Ou acesse a interface administrativa local em `https://<IP-OU-DOMINIO>/_/`;
3. Navegue até **Settings** -> **Mail settings** e informe o host, porta (587 ou 465), usuário e senha;
4. Utilize o botão **Send test email** para validar o envio imediatamente.

---

### 7. Motor de Integração com GLPI Local

A VM conta com o hook nativo `glpi_sync.js`:
- Endpoint de sincronização manual: `POST https://<IP-OU-DOMINIO>/backend/v1/inventory/glpi-sync`
- Execução agendada: Executada a cada 60 minutos automaticamente pelo PocketBase.
- Na tela **Configurações > Integrações** ou **Inventário de Ativos > Sincronização GLPI**, basta informar a URL do servidor GLPI interno da serventia (ex: `http://glpi.cartorio.local/apirest.php`), o `App-Token` e o `User-Token`. O motor mapeia computadores, servidores físicos, máquinas virtuais, ativos de rede e impressoras diretamente para a tabela do inventário.
