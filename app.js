import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const port = 3001; // Porta do servidor

// Variáveis de controle
const jsonFilePath = 'temp.json'; // Caminho do arquivo JSON para armazenar dados
const refreshInterval = 2000000; // Intervalo de atualização do token (em milissegundos)
const userAgentHeaders = {
    hbenergia: 'https://hbenergia.com.br',
    hbenergiaLp: 'https://lp.hbenergia.com.br'
};
const pipelines = {
    hbenergia: { pipeline: 1, stage: 1 },
    hbenergiaLp: { pipeline: 19, stage: 114 }
};
const leadOrigins = {
    hbenergia: 74, // Site (Hb Energia)
    hbenergiaLp: 75  // Site (Hb Mobi)
};
const customFields = {
    cidade: "84a4d867a88b27fe1552cb95fb2cb75c73127f96",
    cnpj: "c9e6cddb7061f8ce898bcf4cabf08636584e01a0",
    modelo: "f6ac0ab6b51cddb7db2482dd796e9ad22a3cb928",
    valorConta: "2a5b858a90969173c95ca539bee1ba5e0ecb88d0",
    origemLead: "83b630d614df3a1642f8d60389f7827406520925"
};

app.use(bodyParser.urlencoded({ extended: true }));

// Funções utilitárias
const lerDados = () => {
    try {
        const dados = fs.readFileSync(jsonFilePath, 'utf8');
        return JSON.parse(dados);
    } catch (erro) {
        console.error('Erro ao ler dados:', erro.message);
        return {};
    }
};

const escreverDados = (dados) => {
    try {
        const dadosJSON = JSON.stringify(dados, null, 2);
        fs.writeFileSync(jsonFilePath, dadosJSON, 'utf8');
        console.log('Dados gravados com sucesso.');
    } catch (erro) {
        console.error('Erro ao gravar dados:', erro.message);
    }
};

const criarArraySequencial = (n) => Array.from({ length: n }, (_, i) => i + 1);
const criarGeradorSequencial = (array) => array[Math.floor(Math.random() * array.length)];

// Funções para chamadas à API do Pipedrive
const apiCall = async (endpoint, method, apiToken, body = null) => {
    const url = `${process.env.PIPE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        },
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Erro ao executar chamada para ${url}:`, error);
    }
};

const addPerson = (apiToken, personData) => apiCall('/v1/persons', 'POST', apiToken, personData);
const createLead = (apiToken, leadData) => apiCall('/v1/leads', 'POST', apiToken, leadData);
const allUsers = (apiToken) => apiCall('/v1/users', 'GET', apiToken);

// Funções para autenticação e token
const exchangeAuthorizationCodeForTokens = async (clientId, clientSecret, authorizationCode, redirectUri, grantType, refreshToken = null) => {
    const tokenEndpoint = `${process.env.PIPE_URL}/oauth/token`;
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

    const requestBody = new URLSearchParams();
    requestBody.append('grant_type', grantType);
    if (grantType === 'authorization_code') {
        requestBody.append('code', authorizationCode);
        requestBody.append('redirect_uri', redirectUri);
    } else {
        requestBody.append('refresh_token', refreshToken);
    }

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody,
        });
        if (!response.ok) throw new Error(`Erro ao trocar código de autorização: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error('Erro ao trocar código de autorização:', error);
        throw error;
    }
};

const refreshtoken = async () => {
    const dados = lerDados();
    const refreshToken = dados.refresh_token;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;

    const auth = await exchangeAuthorizationCodeForTokens(clientId, clientSecret, null, redirectUri, 'refresh_token', refreshToken);
    const { access_token, refresh_token, expires_in } = auth;
    escreverDados({ access_token, refresh_token, expires_in });
};

app.get('/v1/authorize', (req, res) => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);

  if (!clientId || !redirectUri) {
      return res.status(500).send('Erro: CLIENT_ID ou REDIRECT_URI não configurado no .env');
  }

  const authUrl = `https://oauth.pipedrive.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`;
  res.redirect(authUrl);
});

// Rota de autenticação
app.get('/v1/auth', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Parâmetro code obrigatório.');

    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;

    try {
        const auth = await exchangeAuthorizationCodeForTokens(clientId, clientSecret, code, redirectUri, 'authorization_code');
        const { access_token, refresh_token, expires_in, api_domain } = auth;

        escreverDados({ access_token, refresh_token, expires_in });
        console.log('Aplicativo autorizado!');
        res.redirect(api_domain);
    } catch (error) {
        res.status(500).send('Erro ao autenticar aplicativo.');
    }
});

// Rota de integração
app.post('/v1/integra', async (req, res) => {
    const apiToken = lerDados().access_token;
    const userAgent = req.headers['user-agent'].split(';')[1].trim();

    const isHbenergia = userAgent === userAgentHeaders.hbenergia;
    const isHbenergiaLp = userAgent === userAgentHeaders.hbenergiaLp;

    if (!isHbenergia && !isHbenergiaLp) return res.status(400).send('User-Agent inválido.');

    const basicInfos = {
        name: req.body.fields.nome.value,
        email: [{ value: req.body.fields.email.value, primary: true, label: 'main' }],
        phone: [{ value: req.body.fields.cel.value, primary: true, label: 'mobile' }],
        visible_to: '3',
        marketing_status: 'subscribed',
        add_time: new Date()
    };

    const obj = {};
    if (isHbenergia) {
        const { cnpj, cidade, conta } = req.body.fields;
        obj[customFields.cidade] = cidade.value;
        obj[customFields.cnpj] = cnpj?.value;
        obj[customFields.valorConta] = conta.value;
        obj[customFields.origemLead] = leadOrigins.hbenergia;
    } else if (isHbenergiaLp) {
        const { cidade, modelo } = req.body.fields;

        const [modelName, modelValue] = modelo.value.split(':');
        obj[customFields.cidade] = cidade.value;
        obj[customFields.modelo] = modelName.trim();
        obj.value = { amount: parseFloat(modelValue), currency: 'BRL' };
        obj[customFields.origemLead] = leadOrigins.hbenergiaLp;
    }

    const createdPerson = await addPerson(apiToken, basicInfos);
    obj.person_id = createdPerson.id;

    const allUsersList = await allUsers(apiToken);
    obj.owner_id = criarGeradorSequencial(allUsersList.map(user => user.id));

    await createLead(apiToken, obj);
    res.send('Integração concluída com sucesso.');
});

setInterval(refreshtoken, refreshInterval);

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
