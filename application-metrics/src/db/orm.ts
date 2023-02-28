import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Webhook } from '../entities/webhook';

const initializeOrm = async () => {
  return MikroORM.init({
  entities: [ Webhook ],
  dbName: 'application_metrics',
  type: 'mongo',
  clientUrl: 'mongodb://localhost:27017',
  driver: MongoDriver,
});
}

export default initializeOrm;
