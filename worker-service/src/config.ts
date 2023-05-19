import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import 'reflect-metadata';
import fs from 'fs';

moduleAlias.addAliases({
});

dotenv.config();

const envPath = process.env.GUARDIAN_ENV ? `./configs/.env.worker.${process.env.GUARDIAN_ENV}` : './configs/.env.worker';

if (!process.env.OVERRIDE || process.env.OVERRIDE === 'false'){
    console.log('reading from', envPath, 'not overriding');
    dotenv.config({ path: envPath});
}else{
    try {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k of Object.keys(envConfig)) {
            process.env[k] = envConfig[k]
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('WARN: Specific environment not loaded');
        } else {
            throw err;
        }
    }
}
// set here derived env variable to be reused
// in worker.ts
//>>> ******************
let ApiKeyIPFSPath = 'apikey/ipfs';
process.env.ENV_AWARE_APIKEYIPFSPATH = process.env.VAULT_PROVIDER !== 'database'?
                                `${process.env.GUARDIAN_ENV}/${process.env.HEDERA_NET}/${ApiKeyIPFSPath}`:
                                ApiKeyIPFSPath;
//>>> ******************
console.log('Charged Environment',process.env,'\r\n___ . ___');
