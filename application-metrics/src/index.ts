import express, { NextFunction, Request, Response } from 'express';

import { externalMessageEvents, initializeNats, natsSubscriberService } from './services/nats-subscriber.service';
import validate from './middlewares/validation';
import { webhookSchema } from './middlewares/validation/schemas/webhook';
import createError from 'http-errors';
import { findWebhook, getWebhooks, removeWebhook, saveWebhook } from './services/webhooks';
import morgan from 'morgan';
const app = express();

app.use(morgan('combined'))
app.use(express.json());
app.use(express.urlencoded({extended: false}));

const port = process.env.PORT || 5011;

(async () => {
  console.log('Listening NATs');
  await natsSubscriberService();
})();

app.get('/', (req, res) => {
  res.send('Everything is working');
});

app.post('/webhooks', validate(webhookSchema()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await saveWebhook(req.body?.url);
    return res.sendStatus(204);
  } catch (e) {
    return next(e);
  }
});

app.get('/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = await getWebhooks();
    return res.json(webhooks);
  } catch (e) {
    return next(e);
  }
});

app.delete('/webhooks/:id', async (req: Request, res: Response, next: NextFunction) => {
  const {id} = req.params;
  try {
    const webhook = await findWebhook(id);
    console.log('deleted', webhook);
    if (!webhook) {
      return next(createError(404, 'Webhook not found'));
    }

    await removeWebhook(webhook);
    return res.sendStatus(204);
  } catch (err: any) {
    return next(err);
  }
});

app.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  res.type('application/json');
  res.set('Transfer-Encoding', 'chunked');

  const nc = await initializeNats();
  res.write(`[\n`);
  for (const subject of externalMessageEvents) {
    await nc.subscribe(subject, (err, msg: any) => {
      if (err) {
        return console.log(err);
      }
      res.write(`${msg.data},\n`);
    });
  }

  nc.on('close', () => {
    console.log('Connection to NATS closed');
    res.write('{"connection": "closed"}]');
    res.write(`[\n`);
    res.end();
  });
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
