import { connect, Payload, Subscription } from 'ts-nats';

const externalMessageEvents = [
  'external-events.token_minted',
  'external-events.error_logs',
  'external-events.block_event',
  'external-events.ipfs_added_file',
  'external-events.ipfs_before_upload_content',
  'external-events.ipfs_after_read_content',
  'external-events.ipfs_loaded_file',
]

const natsSubscriberService = async () => {
  const nc = await connect({ servers: ['localhost:8222'], payload: Payload.JSON, });

  const subscriptions: Subscription[] = [];

  for (const subject of externalMessageEvents) {
    const sub = await nc.subscribe(subject, (msg: any) => {
      console.log(`Received message on ${subject}:`, msg.data);
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

export default natsSubscriberService;
