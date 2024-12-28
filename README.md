# Integração com Pipedrive

Este projeto é um script em **Node.js** que realiza a integração entre formulários do Elementor (WordPress) e o **Pipedrive**, permitindo a criação de leads personalizados com base em diferentes origens de formulário. O script possui três rotas principais que permitem autorizar o aplicativo no Pipedrive, armazenar tokens de acesso, e criar leads com base em informações enviadas pelos formulários.

---

## **Como Funciona**

### **Requisitos**
- **Node.js** e **npm** instalados.
- Conta no Pipedrive com acesso às credenciais de API.
- Plugin Elementor no WordPress com formulários configurados para envio ao webhook do script.

### **Estrutura do Script**

1. **Rotas:**
   - `/v1/authorize`: Redireciona para a página de autorização do Pipedrive.
   - `/v1/auth`: Troca o código de autorização recebido pelo access token e refresh token.
   - `/v1/integra`: Recebe os dados do formulário e cria leads no Pipedrive com base em campos personalizados.

2. **Tokens:**
   - O script armazena os tokens no arquivo `temp.json` e utiliza o refresh token para manter o acesso ativo de forma automatizada.

3. **Parâmetros Personalizáveis:**
   - **Funis e etapas:** Mapeados em `pipelines`.
   - **Campos personalizados:** Definidos em `customFields`.
   - **Origem do lead:** Definida em `leadOrigins`.

4. **Intervalo de Atualização:**
   - A função de atualização automática do token executa a cada 2.000.000ms.

---

## **Configuração**

### **Passo 1: Configurar Variáveis de Ambiente**
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
PIPE_URL=https://api.pipedrive.com
CLIENT_ID=seu_client_id
CLIENT_SECRET=seu_client_secret
REDIRECT_URI=sua_redirect_uri
```

### **Passo 2: Instalar Dependências**
Execute o comando:

```bash
npm install express dotenv body-parser fs
```

### **Passo 3: Executar o Servidor**
Inicie o servidor com o comando:

```bash
node index.js
```

O servidor estará disponível em `http://localhost:3001`.

---

## **Rotas e Funcionalidades**

### **1. Autorizar Aplicativo**
- Endpoint: `/v1/authorize`
- Redireciona para a URL de autorização do Pipedrive.

### **2. Armazenar Tokens**
- Endpoint: `/v1/auth`
- Parâmetro obrigatório: `code` (fornecido pelo Pipedrive após autorização).
- Salva `access_token`, `refresh_token` e `expires_in` no arquivo `temp.json`.

### **3. Criar Leads**
- Endpoint: `/v1/integra`
- Headers: `user-agent` (identifica a origem do lead).
- Body esperado:

```json
{
  "fields": {
    "nome": { "value": "Nome do Lead" },
    "email": { "value": "email@exemplo.com" },
    "cel": { "value": "11999999999" },
    "cidade": { "value": "São Paulo" },
    "cnpj": { "value": "00.000.000/0001-00" },
    "conta": { "value": "2000" },
    "modelo": { "value": "Modelo: 1000" }
  }
}
```

- Cria uma **pessoa** e um **lead** no Pipedrive com os dados fornecidos.
- Distribui leads para diferentes funis/etapas com base no `user-agent`.

---

## **Personalização**

### **Campos Personalizados**
Os campos personalizados são definidos no objeto `customFields`. Ajuste os IDs para os campos que você configurou no Pipedrive:

```javascript
const customFields = {
  cidade: "id_do_campo_personalizado_cidade",
  cnpj: "id_do_campo_personalizado_cnpj",
  modelo: "id_do_campo_personalizado_modelo",
  valorConta: "id_do_campo_personalizado_valorConta",
  origemLead: "id_do_campo_personalizado_origemLead"
};
```

### **Origem do Lead**
Defina as origens disponíveis para segmentar os leads:

```javascript
const leadOrigins = {
  hbenergia: id_origem_hbenergia,
  hbenergiaLp: id_origem_hbenergiaLp
};
```

---

## **Melhorias Futuras**
1. **Validação de Dados:**
   - Implementar validações para os campos recebidos na rota `/v1/integra`.

2. **Gerenciamento Dinâmico:**
   - Tornar `customFields` e `leadOrigins` dinâmicos, permitindo configuração por meio de um painel ou arquivo externo.

3. **Logs e Monitoramento:**
   - Adicionar logs estruturados para monitorar requisições e erros.

4. **Segurança:**
   - Criptografar o arquivo `temp.json` para proteger tokens sensíveis.

---

## **Contribuição**
Contribuições são bem-vindas! Faça um fork deste repositório, implemente suas melhorias e abra um pull request.
