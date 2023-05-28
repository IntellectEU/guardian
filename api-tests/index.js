const dotenv = require('dotenv');

// Load the root .env file
const rootEnvFile = '../.env';
dotenv.config({ path: rootEnvFile });

// Load the configs .env file
const configsEnvFile = `../configs/.env.${process.env.GUARDIAN_ENV}.guardian.system`;
dotenv.config({ path: configsEnvFile });

const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');

const { sleep, GenerateTokens, CreateAccount, GenerateTokenStandardRegistry, AccountsAlreadyExist } = require("./helpers");

const { Accounts } = require("./test-suits/accounts");
const { Profiles } = require("./test-suits/profiles");
const { TrustChains } = require("./test-suits/trust-chains");


const processes = [];

describe('Tests', async function () {
    before(async function () {
        this.timeout(10000000000);
        const demoTrue = (process.env.DEMO && process.env.DEMO == 'true');
        const demoOrProd = demoTrue ? 'demo' : 'production';
        const pathArray = [
            [path.resolve(path.join('..', 'logger-service')), {GUARDIAN_ENV: 'develop'}],
            [path.resolve(path.join('..', 'worker-service')), {IPFS_STORAGE_API_KEY: process.env.IPFS_STORAGE_API_KEY, GUARDIAN_ENV: 'develop'}],
            [path.resolve(path.join('..', 'auth-service')), {HASHICORP_ADDRESS: `http://${process.env.HASHICORP_HOST}:${process.env.HASHICORP_PORT}`, GUARDIAN_ENV: 'develop', NODE_ENV: demoOrProd}],
            [path.resolve(path.join('..', 'policy-service')), {OPERATOR_ID: process.env.OPERATOR_ID, OPERATOR_KEY: process.env.OPERATOR_KEY, GUARDIAN_ENV: 'develop'}],
            [path.resolve(path.join('..', 'guardian-service')), {OPERATOR_ID: process.env.OPERATOR_ID, OPERATOR_KEY: process.env.OPERATOR_KEY, GUARDIAN_ENV: 'develop'}],
            [path.resolve(path.join('..', 'api-gateway')), {GUARDIAN_ENV: 'develop', NODE_ENV: demoOrProd}]
        ];
        for (let p of pathArray) {
            processes.push(
                spawn('npm start', {
                    cwd: p[0],
                    shell: true,
                    env: Object.assign(process.env, p[1])
                })
            )
            console.info(`"${path.parse(p[0]).name}"`, 'was started');
            await sleep(15000);
        }
        await sleep(10000);
        if (!demoTrue) {
            // Checks if demo accounts already exist
            await GenerateTokenStandardRegistry()
            const accountsExist = await AccountsAlreadyExist();
            if (!accountsExist) {
                // Create the required user accounts for testing
                await CreateAccount('Installer', 'test', 'USER');
                await CreateAccount('Installer2', 'test', 'USER');
                await CreateAccount('Auditor', 'test', 'AUDITOR');
                await CreateAccount('Registrant', 'test', 'USER');
                await CreateAccount('VVB', 'test', 'USER');
                await CreateAccount('ProjectProponent', 'test', 'USER');
            }
        }
    })

    beforeEach(GenerateTokens);

    Accounts();
    Profiles();
    // Schemas();
    TrustChains();
    // Policies();

    after(async function () {
        for (let proc of processes) {
            kill(proc.pid);
        }
    })
});
