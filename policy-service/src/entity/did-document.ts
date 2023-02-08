import { DidDocumentStatus, DocumentStatus, IDidObject } from '@guardian/interfaces';
import {
    Entity,
    Unique,
    Property,
    Enum,
    BeforeCreate
} from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * DID document
 */
@Entity()
@Unique({ properties: ['did'], options: { partialFilterExpression: { did: { $type: 'string' }}}})
export class DidDocument extends BaseEntity implements IDidObject {
    /**
     * DID
     */
    @Property({
        nullable: true,
        // index: true
    })
    did?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: any;

    /**
     * Created at
     */
    @Property({
        index: true
    })
    createDate: Date = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updateDate: Date = new Date();

    /**
     * Document status
     */
    @Enum({ nullable: true })
    status?: DidDocumentStatus;

    /**
     * Message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Hedera Status
     */
    @Property({ nullable: true })
    hederaStatus?: DocumentStatus;

    /**
     * Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Hedera Hash
     */
    @Property({ nullable: true })
    messageHash?: string;

    /**
     * Message History
     */
    @Property({ nullable: true })
    messageIds?: string[];

    /**
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || DidDocumentStatus.NEW;
    }
}