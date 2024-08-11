import "dotenv/config"
import Database from 'better-sqlite3';
import { Client, GatewayIntentBits, Events, Presence, TextChannel } from 'discord.js';
import { readFileSync } from "fs";

const messages = JSON.parse(readFileSync('./src/assets/messages.json', "utf-8")) as string[];

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string
            USER_ID: string
            CHANNEL: string
            ACTIVITY_NAME: string
        }
    }
}

interface DataSend {
  id: number;
  message: string;
  updated_at: number;
}

const TOKEN = process.env.BOT_TOKEN

const USER_ID = process.env.USER_ID

const CHANNEL = process.env.CHANNEL

const ACTIVITY_NAME = process.env.ACTIVITY_NAME

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

function getNotDuplicateMessage(message:string) {

  const messagesFilter = messages.filter(m => m != message);

  const send = messagesFilter[Math.floor(Math.random() * messagesFilter.length)];

  return send

}

client.once(Events.ClientReady, () => {
  console.log('Bot está on');
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {

  if (!newPresence.user || !newPresence.userId) 
    return;

  if (newPresence.userId != USER_ID) 
    return;

  const oldStatus = oldPresence?.status;
  const newStatus = newPresence.status;

  if (!(oldStatus != 'online' && newStatus === 'online'))
    return;

  const presence = newPresence as Presence;  

  const targetActivity = presence.activities.find(activity => activity.name === ACTIVITY_NAME);

  if (!targetActivity || presence.status != 'online') 
    return;

  const channel = client.channels.cache.get(CHANNEL) as TextChannel;  

  if (channel) {

    const datasend = (getOne.all() as DataSend[])[0]

    if (datasend) {

      if (Date.now() - datasend.updated_at < 60000) {

        const MESSAGE = getNotDuplicateMessage(datasend.message);
        
        channel.send(MESSAGE);

        updateOne.run(MESSAGE, Date.now(), datasend.id);

      }

    } else {

      const MESSAGE = getNotDuplicateMessage("");

      channel.send(MESSAGE);

      insrtFirst.run(1, MESSAGE, Date.now());

    }

  }

});

client.login(TOKEN);
