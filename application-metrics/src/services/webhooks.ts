import initializeOrm from '../db/orm';
import { Webhook } from '../entities/webhook';
import { ObjectId } from '@mikro-orm/mongodb';

export const getWebhooks = async () => {
  const orm = await initializeOrm();
  const em = orm.em.fork();
  const webhooks = await em.find(Webhook, {});
  return webhooks || [];
}

export const saveWebhook = async (url: string) => {
  const webhook = new Webhook();
  webhook.url = url;
  const orm = await initializeOrm();
  const em = orm.em.fork();
  await em.persistAndFlush(webhook);
}

export const findWebhook = async (id: string) => {
  const orm = await initializeOrm();
  const em = orm.em.fork();
  return em.findOne(Webhook, {_id: new ObjectId(id)});

}

export const removeWebhook = async (webhook: Webhook) => {
  const orm = await initializeOrm();
  const em = orm.em.fork();
  em.remove(webhook);
  await em.flush();
}
