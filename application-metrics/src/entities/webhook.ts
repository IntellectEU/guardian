import { Entity, PrimaryKey, Property, DateType } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';

@Entity()
export class Webhook {
  @PrimaryKey({ type: ObjectId })
  _id!: ObjectId;

  @Property({ type: 'url' })
  url!: string;

  @Property({ type: DateType})
  createdAt = new Date();
}
