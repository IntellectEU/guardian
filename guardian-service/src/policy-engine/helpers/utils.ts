import { Token } from '@entity/token';
import { HederaSDKHelper, HederaUtils, VcDocument } from '@hedera-modules';
import * as mathjs from 'mathjs';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { getMongoRepository } from 'typeorm';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { DocumentStatus, ExternalMessageEvents, SchemaEntity, TopicType } from '@guardian/interfaces';
import { Topic } from '@entity/topic';
import { TopicHelper } from '@helpers/topicHelper';
import { DocumentState } from '@entity/document-state';
import { ExternalEventChannel, IAuthUser } from '@guardian/common';

/**
 * Data types
 */
export enum DataTypes {
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement'
}

/**
 * Policy engine utils
 */
export class PolicyUtils {
    /**
     * Variables
     * @param formula
     */
    public static variables(formula: string): string[] {
        const variables = [];
        try {
            mathjs.parse(formula).traverse((node: any) => {
                if (node.isSymbolNode && !mathjs[node.name]) {
                    variables.push(node.name);
                }
            });
            return variables;
        } catch (error) {
            return variables;
        }
    }

    /**
     * Evaluate
     * @param formula
     * @param scope
     */
    public static evaluate(formula: string, scope: any) {
        // tslint:disable-next-line:only-arrow-functions
        return (function (_formula: string, _scope: any) {
            try {
                return PolicyUtils.evaluate(_formula, _scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(mathjs, formula, scope);
    }

    /**
     * Get VC scope
     * @param item
     */
    public static getVCScope(item: VcDocument) {
        return item.getCredentialSubject(0).getFields();
    }

    /**
     * Aggregate
     * @param rule
     * @param vcs
     */
    public static aggregate(rule: string, vcs: VcDocument[]): number {
        let amount = 0;
        for (const element of vcs) {
            const scope = PolicyUtils.getVCScope(element);
            const value = parseFloat(PolicyUtils.evaluate(rule, scope));
            amount += value;
        }
        return amount;
    }

    /**
     * Token amount
     * @param token
     * @param amount
     */
    public static tokenAmount(token: Token, amount: number): [number, string] {
        const decimals = parseFloat(token.decimals) || 0;
        const _decimals = Math.pow(10, decimals);
        const tokenValue = Math.round(amount * _decimals);
        const tokenAmount = (tokenValue / _decimals).toFixed(decimals);
        return [tokenValue, tokenAmount];
    }

    /**
     * Split chunk
     * @param array
     * @param chunk
     */
    public static splitChunk(array: any[], chunk: number) {
        const res = [];
        let i: number;
        let j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

    /**
     * Get array
     * @param data
     */
    public static getArray<T>(data: T | T[]): T[] {
        if (Array.isArray(data)) {
            return data as T[];
        } else {
            return [data];
        }
    }

    /**
     * Update VC record
     * @param row
     */
    public static async updateVCRecord(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        let item = await getMongoRepository(VcDocumentCollection).findOne({
            where: {
                hash: { $eq: row.hash },
                hederaStatus: {$not: { $eq: DocumentStatus.REVOKE }}
            }
        });
        const docStatusRepo = getMongoRepository(DocumentState);
        let updateStatus = false;
        if (item) {
            if (row.option?.status) {
                updateStatus = item.option?.status !== row.option.status
            }
            item.owner = row.owner;
            item.assign = row.assign;
            item.option = row.option;
            item.schema = row.schema;
            item.hederaStatus = row.hederaStatus;
            item.signature = row.signature;
            item.type = row.type;
            item.tag = row.tag;
            item.document = row.document;
            item.messageId = row.messageId || item.messageId;
            item.topicId = row.topicId || item.topicId;
            item.comment = row.comment;
            item.relationships = row.relationships;
            await getMongoRepository(VcDocumentCollection).update(item.id, item);
        } else {
            item = getMongoRepository(VcDocumentCollection).create(row);
            updateStatus = !!item.option?.status;
            await getMongoRepository(VcDocumentCollection).save(item);
        }
        if (updateStatus) {
            docStatusRepo.save({
                documentId: item.id,
                status: item.option.status,
                reason: item.comment
            });
        }
        return item;
    }

    /**
     * Update did record
     * @param row
     */
    public static async updateDIDRecord(row: DidDocumentCollection): Promise<DidDocumentCollection> {
        let item = await getMongoRepository(DidDocumentCollection).findOne({ did: row.did });
        if (item) {
            item.document = row.document;
            item.status = row.status;
            await getMongoRepository(DidDocumentCollection).update(item.id, item);
            return item;
        } else {
            item = getMongoRepository(DidDocumentCollection).create(row as DidDocumentCollection);
            return await getMongoRepository(DidDocumentCollection).save(item);
        }
    }

    /**
     * Update VP record
     * @param row
     */
    public static async updateVPRecord(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        return await getMongoRepository(VpDocumentCollection).save(row);
    }

    /**
     * Save VP
     * @param row
     */
    public static async saveVP(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        const doc = getMongoRepository(VpDocumentCollection).create(row);
        return await getMongoRepository(VpDocumentCollection).save(doc);
    }

    /**
     * Mint
     * @param token
     * @param tokenValue
     * @param root
     * @param user
     * @param uuid
     */
    public static async mint(token: Token, tokenValue: number, root: any, user: IAuthUser, uuid: string): Promise<void> {
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);

        console.log('Mint: Start');
        const tokenId = token.tokenId;
        const supplyKey = token.supplyKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;
        if (token.tokenType === 'non-fungible') {
            const metaData: any = HederaUtils.decode(uuid);
            const data = new Array(Math.floor(tokenValue));
            data.fill(metaData);
            const serials: number[] = [];
            const dataChunk = PolicyUtils.splitChunk(data, 10);
            for (let i = 0; i < dataChunk.length; i++) {
                const element = dataChunk[i];
                try {
                    const newSerials = await client.mintNFT(tokenId, supplyKey, element, uuid);
                    for (const serial of newSerials) {
                        serials.push(serial)
                    }
                } catch (error) {
                    console.log(`Mint: Mint Error (${error.message})`);
                }
                if (i % 100 === 0) {
                    console.log(`Mint: Minting (${i}/${dataChunk.length})`);
                }
            }
            console.log(`Mint: Minted (${serials.length})`);
            const serialsChunk = PolicyUtils.splitChunk(serials, 10);
            for (let i = 0; i < serialsChunk.length; i++) {
                const element = serialsChunk[i];
                try {
                    await client.transferNFT(tokenId, user.hederaAccountId, adminId, adminKey, element, uuid);
                } catch (error) {
                    console.log(`Mint: Transfer Error (${error.message})`);
                }
                if (i % 100 === 0) {
                    console.log(`Mint: Transfer (${i}/${serialsChunk.length})`);
                }
            }
        } else {
            await client.mint(tokenId, supplyKey, tokenValue, uuid);
            await client.transfer(tokenId, user.hederaAccountId, adminId, adminKey, tokenValue, uuid);
        }
        new ExternalEventChannel().publishMessage(ExternalMessageEvents.TOKEN_MINTED, { tokenId, tokenValue, memo: uuid })
        console.log('Mint: End');
    }

    /**
     * Wipe
     * @param token
     * @param tokenValue
     * @param root
     * @param user
     * @param uuid
     */
    public static async wipe(token: Token, tokenValue: number, root: any, user: IAuthUser, uuid: string): Promise<void> {
        const tokenId = token.tokenId;
        const wipeKey = token.wipeKey;

        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
        if (token.tokenType === 'non-fungible') {
            throw Error('unsupported operation');
        } else {
            await client.wipe(tokenId, user.hederaAccountId, wipeKey, tokenValue, uuid);
        }
    }

    /**
     * Get topic
     * @param topicName
     * @param root
     * @param user
     * @param ref
     */
    public static async getTopic(topicName: string, root: any, user: any, ref: AnyBlockType): Promise<Topic> {
        const rootTopic = await getMongoRepository(Topic).findOne({
            policyId: ref.policyId,
            type: TopicType.InstancePolicyTopic
        });

        let topic: any;
        if (topicName && topicName !== 'root') {

            const policyTopics = ref.policyInstance.policyTopics || [];
            const config = policyTopics.find(e => e.name === topicName);
            if (!config) {
                throw new Error(`Topic "${topicName}" does not exist`);
            }

            const topicOwner = config.static ? root.did : user.did;
            const topicAccountId = config.static ? root.hederaAccountId : user.hederaAccountId;
            const topicAccountKey = config.static ? root.hederaAccountKey : user.hederaAccountKey;

            topic = await getMongoRepository(Topic).findOne({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name: topicName,
                owner: topicOwner
            });
            if (!topic) {
                const topicHelper = new TopicHelper(topicAccountId, topicAccountKey);
                topic = await topicHelper.create({
                    type: TopicType.DynamicTopic,
                    owner: topicOwner,
                    name: config.name,
                    description: config.description,
                    policyId: ref.policyId,
                    policyUUID: null
                });
                await topicHelper.twoWayLink(topic, rootTopic, null);
            }
        } else {
            topic = rootTopic;
        }

        return topic;
    }

    /**
     * Get topic by id
     * @param topicId
     * @param ref
     */
    public static async getTopicById(topicId: string, ref: AnyBlockType): Promise<Topic> {
        let topic = await getMongoRepository(Topic).findOne({
            policyId: ref.policyId,
            topicId
        });
        if (!topic) {
            topic = await getMongoRepository(Topic).findOne({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            });
        }
        if (!topic) {
            throw new Error(`Topic does not exist`);
        }
        return topic;
    }

    /**
     * Get policy topics
     * @param policyId
     */
    public static async getPolicyTopics(policyId: string): Promise<Topic[]> {
        return await getMongoRepository(Topic).find({
            policyId
        });
    }

    /**
     * Get subject id
     * @param data
     */
    public static getSubjectId(data: any): string {
        try {
            if (data) {
                if (Array.isArray(data.document.credentialSubject)) {
                    return data.document.credentialSubject[0].id;
                } else {
                    return data.document.credentialSubject.id;
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public static async getSchema(topicId: string, entity: SchemaEntity): Promise<SchemaCollection> {
        return await getMongoRepository(SchemaCollection).findOne({
            entity,
            readonly: true,
            topicId
        });
    }

    /**
     * Get system schema
     * @param entity
     */
    public static async getSystemSchema(entity: SchemaEntity): Promise<SchemaCollection> {
        return await getMongoRepository(SchemaCollection).findOne({
            entity,
            system: true,
            active: true
        });
    }
}
