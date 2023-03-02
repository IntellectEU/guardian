import { connect, Subscription } from 'ts-nats';

const externalMessageEvents = [
  'external-events.token_minted',
  'external-events.error_logs',
  'external-events.block_event',
  'external-events.ipfs_added_file',
  'external-events.ipfs_before_upload_content',
  'external-events.ipfs_after_read_content',
  'external-events.ipfs_loaded_file',
  'foo',
];

export const initializeNats = async () => {
  const nc = await connect({ servers: ['0.0.0.0:4222'] });
// Close the connection when finished
  nc.on('close', () => {
    console.log('Connection to NATS closed');
  });

  return nc;
}

export const natsSubscriberService = async () => {
  const nc = await initializeNats();
  const subscriptions: Subscription[] = [];

  for (const subject of externalMessageEvents) {
    const sub = await nc.subscribe(subject, (err, msg: any) => {
      if (err) {
        return console.log(err);
      }
      console.log(`Received message on ${subject}:`, JSON.parse(msg.data));
      // Send message data to webhooks
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
