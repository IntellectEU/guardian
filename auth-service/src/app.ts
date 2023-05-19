import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import {
    ApplicationState,
    MessageBrokerChannel,
    Logger,
    DataBaseHelper,
    Migration,
    COMMON_CONNECTION_CONFIG,
    LargePayloadContainer,
    SecretManager, OldSecretManager
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { InitializeVault } from './vaults';
import { ImportKeysFromDatabase } from '@helpers/import-keys-from-database';
import process from 'process';
import { startMetricsServer } from './utils/metrics';

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        }
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('AUTH_SERVICE'),
    InitializeVault(process.env.VAULT_PROVIDER)
]).then(async ([_, db, cn, vault]) => {
        
    //>>> ******************
    // console.log(">>> MessageBrokerChannel.connect('AUTH_SERVICE')",cn);
    // console.log(">>> vault",vault);
    // console.log(">>> 0 new DataBaseHelper");
    DataBaseHelper.orm = db;
    console.log(">>> 1 new DataBaseHelper");
    const state = new ApplicationState();
    console.log(">>> 0 new ApplicationState()",state);
    await state.setServiceName('AUTH_SERVICE').setConnection(cn).init();
    console.log(">>> 1 new ApplicationState()");
    state.updateState(ApplicationStates.INITIALIZING);
    console.log(">>> 2 new ApplicationState()");
    try {
        await fixtures();

        new Logger().setConnection(cn);
        console.log(">>> Logger()");
        await new AccountService().setConnection(cn).init();
        new AccountService().registerListeners();
        console.log(">>> AccountService()");
        await new WalletService().setConnection(cn).init();
        console.log(">>> WalletService()");
        new WalletService().registerVault(vault);
        console.log(">>> WalletService().registerVault(vault)");
        new WalletService().registerListeners();
        console.log(">>> WalletService().registerListeners()");
        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault);
        }
        console.log(">>> 0 IMPORT_KEYS_FROM_DB",process.env.IMPORT_KEYS_FROM_DB);
        await new OldSecretManager().setConnection(cn).init();
        console.log(">>> 0 Prima di SecretManager.New()");
        const secretManager = SecretManager.New();
        console.log(">>> 0 secretManager *:",secretManager);
        console.log(">>> 0 fine secretManager");
        let { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth');
        //>>> let { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets(process.env.ENV_AWARE_SECAUTHPATH);
        console.log(">>> 1 ACCESS_TOKEN_SECRET",ACCESS_TOKEN_SECRET);
        if (!ACCESS_TOKEN_SECRET) {
            ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
            console.log(">>> 2 ACCESS_TOKEN_SECRET",ACCESS_TOKEN_SECRET);
            await secretManager.setSecrets('secretkey/auth', { ACCESS_TOKEN_SECRET  });
            //>>> await secretManager.setSecrets(process.env.ENV_AWARE_SECAUTHPATH, { ACCESS_TOKEN_SECRET  });
            console.log(">>> 3 ACCESS_TOKEN_SECRET",ACCESS_TOKEN_SECRET);
        }

        state.updateState(ApplicationStates.READY);
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        console.log(">>> maxPayload",maxPayload);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        new Logger().info('auth service started', ['AUTH_SERVICE']);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
