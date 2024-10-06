import "dotenv/config";
import Database from 'better-sqlite3';
import { Client, GatewayIntentBits, Events, Presence, TextChannel } from 'discord.js';
import { readFileSync } from "fs";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      USER_ID: string;
      CHANNEL: string;
      ACTIVITY_NAME: string;
    }
  }
}

interface DataSend {
  id: number;
  message: string;
  updated_at: number;
}

const TOKEN = process.env.BOT_TOKEN;
const USER_ID = process.env.USER_ID;
const CHANNEL = process.env.CHANNEL;
const ACTIVITY_NAME = process.env.ACTIVITY_NAME;

if (!TOKEN || !USER_ID || !CHANNEL || !ACTIVITY_NAME) {
  console.error('Variáveis de ambiente não definidas corretamente.');
  process.exit(1);
}

const db = new Database('bot.db', { verbose: console.log });

db.exec(`
  CREATE TABLE IF NOT EXISTS data_send (
    id INTEGER PRIMARY KEY,
    message TEXT,
    updated_at INTEGER
  )
`);

const getOne = db.prepare('SELECT message, updated_at FROM data_send');
const insrtFirst = db.prepare('INSERT INTO data_send (id, message, updated_at) VALUES (?, ?, ?)');
const updateOne = db.prepare('UPDATE data_send SET message = ?, updated_at = ? WHERE id = ?');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function getNotDuplicateMessage(lastMessage: string) {

  const messages = JSON.parse(readFileSync('./src/assets/messages.json', "utf-8")) as string[];
  const filteredMessages = messages.filter(m => m !== lastMessage);

  return filteredMessages[Math.floor(Math.random() * filteredMessages.length)];

}

client.once(Events.ClientReady, () => {
  
  console.log('Bot está online!');

});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {

  if (!newPresence.user || newPresence.userId !== USER_ID) 
    return;

  const oldStatus = oldPresence?.status;
  const newStatus = newPresence.status;

  if (!(oldStatus !== 'online' && newStatus === 'online')) 
    return;

  const targetActivity = newPresence.activities.find(activity => activity.name === ACTIVITY_NAME);

  if (!targetActivity || newPresence.status !== 'online') 
    return;

  const channel = client.channels.cache.get(CHANNEL) as TextChannel;

  if (channel) {

    const datasend = (getOne.all() as DataSend[])[0];

    if (datasend && Date.now() - datasend.updated_at >= 60000) {

      const newMessage = getNotDuplicateMessage(datasend.message);

      channel.send(newMessage);
      updateOne.run(newMessage, Date.now(), datasend.id);

    } else if (!datasend) {

      const newMessage = getNotDuplicateMessage('');

      channel.send(newMessage);
      insrtFirst.run(1, newMessage, Date.now());
      
    }
  }
});

client.login(TOKEN);
