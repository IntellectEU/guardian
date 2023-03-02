import express, { NextFunction, Request, Response } from 'express';

import { initializeNats, natsSubscriberService } from './services/nats-subscriber.service';
import { Webhook } from './entities/webhook';
import initializeOrm from './db/orm';
import validate from './middlewares/validation';
import { webhookSchema } from './middlewares/validation/schemas/webhook';
import createError from 'http-errors';
import { ObjectId } from '@mikro-orm/mongodb';

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));

const port = process.env.PORT || 5011;

(async () => {
  console.log('Listening NATs');
  await natsSubscriberService();

  const nc = await initializeNats();
  const eventData = { message: 'Hello, world!' };
  nc.publish('foo', JSON.stringify(eventData));
})();

app.get('/health', (req, res) => {
  res.send('Everything is working');
});

app.post('/webhooks', validate(webhookSchema()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = new Webhook();
    webhook.url = req.body?.url;
    const orm = await initializeOrm();
    const em = orm.em.fork();
    await em.persistAndFlush(webhook);
    return res.sendStatus(204);
  } catch (e) {
    return next(e);
  }
});

app.get('/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orm = await initializeOrm();
    const em = orm.em.fork();
    const webhooks = await em.find(Webhook, {});
    return res.json(webhooks);
  } catch (e) {
    return next(e);
  }
});

app.delete('/webhooks/:id', async (req: Request, res: Response, next: NextFunction) => {
  const {id} = req.params;
  const orm = await initializeOrm();
  const em = orm.em.fork();
  const webhook = await em.findOne(Webhook, {_id: new ObjectId(id)});

  if (!webhook) {
    return createError(404, 'Webhook is active.')
  }

  em.remove(webhook);
  await em.flush();

  return res.sendStatus(204);
});

// tslint:disable-next-line:handle-callback-err
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  return res.status(err?.status || 500).json({code: err?.status || 500, message: err.message})
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
});
