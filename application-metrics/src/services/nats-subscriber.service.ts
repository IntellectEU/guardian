import { Client, connect, Subscription } from 'ts-nats';
import axios from 'axios'
import { getWebhooks } from './webhooks';

export const externalMessageEvents = [
  'external-events.token_minted',
  'external-events.error_logs',
  'external-events.block_event',
  'external-events.ipfs_added_file',
  'external-events.ipfs_before_upload_content',
  'external-events.ipfs_after_read_content',
  'external-events.ipfs_loaded_file',
  'application-metrics',
];

let natsServer: Promise<Client>;

export const initializeNats = async () => {
  if (natsServer) return natsServer;
  natsServer = connect({ servers: ['0.0.0.0:4222'] });

  return natsServer;
}

const sendEvents = async (event: JSON) => {
  const webhooks = await getWebhooks();
  if (!webhooks || !webhooks?.length) return;

  const headers = {
    'Content-Type': 'application/json',
  };
  for (const webhook of webhooks) {
    try {
      const { data } = await axios.post(webhook.url, event, { headers })
      console.log('Webhook response:', JSON.stringify(data));
    } catch (e: any) {
      console.error(e.message);
    }
  }
}

export const natsSubscriberService = async () => {
  const nc = await initializeNats();
  const subscriptions: Subscription[] = [];

  for (const subject of externalMessageEvents) {
    console.log('Subject:', subject);
    const sub = await nc.subscribe(subject, (err, msg: any) => {
      if (err) {
        return console.log(err);
      }
      console.log(`Received message on "${subject}" subject:`, JSON.parse(msg.data));
      sendEvents(JSON.parse(msg.data));
    });
    subscriptions.push(sub);
  }

  process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received.');
    for (const sub of subscriptions) {
      await sub.unsubscribe();
    }

    await nc.close();
    console.log('Unsubscribed and disconnected from NATS');
  });
}
