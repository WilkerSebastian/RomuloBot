import "dotenv/config"
import { Client, GatewayIntentBits, Events, Presence, ActivityType, TextChannel } from 'discord.js';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string
            USER_ID: string
            CHANNEL: string
            ACTIVITY_NAME: string
            MESSAGE: string
        }
    }
}

const TOKEN = process.env.BOT_TOKEN

const USER_ID = process.env.USER_ID

const CHANNEL = process.env.CHANNEL

const ACTIVITY_NAME = process.env.ACTIVITY_NAME

const MESSAGE = process.env.MESSAGE

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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

    if (channel) 
        channel.send(MESSAGE);


});

client.login(TOKEN);
