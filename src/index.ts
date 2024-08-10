import "dotenv/config"
import Database from 'better-sqlite3';
import { Client, GatewayIntentBits, Events, Presence, ActivityType, TextChannel } from 'discord.js';
import messages from "./assets/messages.json";

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
  updated_at: Date;
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const getOne = db.prepare('SELECT message, updated_at FROM data_send'); 
const insrtFirst = db.prepare('INSERT INTO data_send (id, message) VALUES (?, ?)');
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

  const messagesFilter = messages.filter(message => !message);

  return messagesFilter[Math.floor(Math.random() * messagesFilter.length)];

}

client.once(Events.ClientReady, () => {
  console.log('Bot está on');
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {

  if (!newPresence.user || !newPresence.userId) 
        return;

  if (newPresence.userId != USER_ID) 
        return;

    const presence = newPresence as Presence;

    const targetActivity = presence.activities.find(activity => 
      activity.type === ActivityType.Playing && activity.name === ACTIVITY_NAME
    );

    if (!targetActivity || presence.status != 'online') 
        return;

    const channel = client.channels.cache.get(CHANNEL) as TextChannel;

    if (channel) {

      const datasend = (getOne.all() as DataSend[])[0]

      const MESSAGE = getNotDuplicateMessage(datasend.message)

      if (datasend) {

        if (Math.abs(datasend.updated_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24) > 1) {

          channel.send(MESSAGE);

          updateOne.run(MESSAGE, Date.now(), datasend.id);

        }

      } else {

        insrtFirst.run(1, MESSAGE);

      }

    }

});

client.login(TOKEN);
