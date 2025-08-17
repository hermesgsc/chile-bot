require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cron = require('node-cron');

const app = express();

const TARGET_DATE = new Date(
  parseInt(process.env.TARGET_YEAR),
  parseInt(process.env.TARGET_MONTH),
  parseInt(process.env.TARGET_DAY)
);

const GROUP_NAME = process.env.GROUP_NAME;
const CHAT_ID = process.env.CHAT_ID;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.log('---- QR code ----');
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima com seu WhatsApp para entrar.');
});

client.on('ready', async () => {
  console.log('✅ WhatsApp client is ready!');

  if (!CHAT_ID && GROUP_NAME) {
    const chats = await client.getChats();
    const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);
    if (group) {
      console.log('Encontrou grupo:', group.name, 'id =', group.id._serialized);
    } else {
      console.log('Grupo não encontrado automaticamente. Envie uma mensagem no grupo e cheque o console.');
    }
  }

  await sendCountdown();
});

function daysLeft() {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = TARGET_DATE - t;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function sendCountdown() {
  try {
    const days = daysLeft();
    let message;

    if (days > 30) message = `⏳ Faltam ${days} dias para 23 de junho de 2026! Vamos para o Chile!`;
    else if (days <= 30 && days > 5) message = `⏳ Faltam ${days} dias para nossa viagem!`;
    else if (days <= 5 && days > 1) message = `⏳ Faltam ${days} dias para nossa viagem, já fez as malas?`;
    else if (days === 1) message = `⏳ Falta 1 dia para conhecer a neve!`;
    else if (days === 0) message = `🎉 Hoje vamos para o Chile!`;
    else message = `O dia 23 de junho de 2026 já passou.`;

    if (CHAT_ID) {
      await client.sendMessage(CHAT_ID, message);
      console.log('Mensagem enviada para CHAT_ID:', CHAT_ID);
      return;
    }

    if (GROUP_NAME) {
      const chats = await client.getChats();
      const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);
      if (!group) {
        console.log('Grupo não encontrado (nome):', GROUP_NAME);
        return;
      }
      await client.sendMessage(group.id._serialized, message);
      console.log('Mensagem enviada para grupo:', GROUP_NAME);
      return;
    }

    console.log('Nenhum CHAT_ID nem GROUP_NAME definido. Nada enviado.');
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
  }
}

cron.schedule('0 9 * * *', () => {
  console.log('Tarefa cron disparada (envio diário às 9h).');
  sendCountdown();
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

app.get('/', (req, res) => res.send('Bot WhatsApp rodando'));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Webserver listening on port', listener.address().port);
});

client.initialize();

client.on('message', async msg => {
  const chat = await msg.getChat();
  if (chat.isGroup) {
    console.log('Mensagem recebida em grupo:', chat.name, 'from:', msg.from);
  } else {
    console.log('Mensagem privada from:', msg.from);
  }
});
