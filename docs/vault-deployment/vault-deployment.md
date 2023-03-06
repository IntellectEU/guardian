## Hashicorp Vault
Several scripts and config files are provided to smoothly start and configure Hashicorp Vault instance. Here are the steps to run Vault instance:

1. __Generate Certificates__: Hashicorp Vault in production requires tls communication that consequently valid tls keys and certificates must be provided for vault server and clients. In case of running vault by self-signed certificates, the `keygen_cfssl.sh` script under `hashicorp/scripts/keygen` is provided to automatically initially generate CA, Intermediate CA entities and derive server and client entities from Intermediate CA. The script uses CFSSL library to generate PKIs. CFSSL needs a global configurations and entities' profiles to generate certificates. All smaple configurations are stored at `hashicorp/configs/cfss`. All generated tls files are stored in central directory which is `hashicorp/certs` by default. In order to run the script simply run `make vault_keygen` in guardian root directory in order that Makefile runs the neccessary commands.

2. __Distribute PKIs__: Having generated all keys and certificates, they must be copied to each service directory in order to be consumed for communicating with Vault. For this purpose `keystore` script is created to manage tls files. by passing `distribute` option to the script it automatically copies all tls files between services. Alternatively, run `make distribute_keys` will apply the same command by Makefile.

3. __Generate Vault Configuration__: In order to start Vault instance a config is required to configure vault instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized vault config file, the `vault_config_gen.sh` script is created in `hashicorp/scripts/vault` directory.

4. __Generate Consul Configuration__: Vault instance is intended to use Hashicorp COnsul as its backend. In order to start Consul instance a config is required to configure consul instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized consul config file, the `consul_config_gen.sh` script is created in `hashicorp/scripts/consul` directory.

_Note_: In order to generate vault and consul config files, the simplest way is to run `make cfgen` in the root directory of guardian.

5. __Clone Guardian Environment Variables__: Template .env and .env.docker files are provided a each service directory that must be cloned first in order to run the application. for this purpose simply run `make guardian_make_env` command in the root directory of guardian.

6. __Make Vault Up__: In order to start Vault instance backed by Consul in docker containers, the vault and consul services must be started by `docker-compose.yaml`. For this purpose simply run `docker-compose up -d consul vault` command.

7. __Initialize Vault__: Having started Vault instance, it must be initialized and configured.The `vault_init.sh` script in `hashicorp/scripts/vault` directory is developed to execute following steps:

_Note_: In order to start and configure Vault it can be simply done by running `make vault_up` command in the root directory of guardian.

- __Initialize Vault__: Initializes vault operator and generates root token and unsealing keys. Root token can be used further for adminstration of vault. Unsealing keys must be used to unseal vault. Vault requires `secret-shares` and `secret-threshold` to generate unseal keys. `secret-shares` is the number of keys genrated and `secret-threshold` is the number of keys must be used to unseal vault. These parameters are configured by `VAULT_UNSEAL_SECRET_SHARES` and `VAULT_UNSEAL_SECRET_THRESHOLD` variables inside .env file. root token and unsealing keys are stored in `hashicorp/vault/.root` file and must be removed after being generated.

- __Unseal Vault__: Having initialized the vault insance, it is still sealed and must be sealed by `secret-threshold` number of unsealing keys. The script automatically unseals the vault instance by running unseal command.

- __Enable KV V2 Secret Engine__: 

- __Enable AppRole Auth Method__: Approle is an auth method for authentication of machines or apps with defined roles. Roles are defined by a set of policies which narrows the accessibility of roles to vault resources. Approle is consisting a set of workflows that provides `role_id` and `secret_id` as credentials (very similiar to username and password) that must be used in authentication process to generate auth token that is authorized according to the role that is defined for the role_id.

- __Create Policies__: auth-service as a central service to interact with Vault must have read/write permissions to secret resources. The `root_secret_policy` attached in `vault/hashicorp/configs/vault/policies` grants all permissions to Create, Read, List and Updates secrets in the root path `secret/data/*`.

- __Create roles associated with policies__: Having created the `root_secret_policy` policy, the associated role must be created. The approle config file that implies the role and its policy is created and stored in `hashicorp/configs/vault/approle`. The script retrieves the `approle.json` file and creates the role with specified policy.

- __Get AppRole Credentials__: auth-service has a role with a specific policy, needs approle credentials to operate on all secrets. The credentials are fetched from vault for each role and immediately written to .env and .env.docker files. The target env file paths are configured by `approle.json` file.

### Operations:

All docker-compose files, template configurations and a Makefile necssary to deploy Vault instance in both dev and prod modes are included to make the operations very easy in a single command line. Here are the steps to deploy Vault in dev/prod mode:

#### Deploy Vault in dev mode:

1. __Prepare configurations:__ The first step is to provide configurations to deploy and initialize Vault network. A template .env file is incuded by `vault/hashicorp/.env.example` that must be copied into .env file in the same directory:

```
cp vault/hashicorp/.env.example vault/hashicorp/.env
```

There several parameters to configure vault and consul. It must be noted that in dev mode (non-TLS) the following parameters must be modified as follows:

```
VAULT_ADDR=http://localhost:8200

TLS_ENABLE=false
```

2. __Deploy Vault:__ In order to run vault instance in dev mode `vault/hashicorp/docker-compose-dev.yaml` must be used accompanied by vault_init.sh script. All will be done by single make command:

```
make vault_dev_up
```

3. __Stop Vault:__ In order to stop vault instance in dev mode `vault/hashicorp/docker-compose-dev.yaml` must be used. All will be done by single make command:

```
make vault_dev_down
```

4. __Destroy Vault:__ In order to destroy vault instance in dev mode `vault/hashicorp/docker-compose-dev.yaml` must be used to stop vault services and all artifacts generated must be removed as well. All will be done by single make command:

```
make vault_dev_destroy
```


#### Deploy Vault in prod mode:

1. __Prepare configurations:__ The first step is to provide configurations to deploy and initialize Vault network. A template .env file is incuded by `vault/hashicorp/.env.example` that must be copied into .env file in the same directory:

```
cp vault/hashicorp/.env.example vault/hashicorp/.env
```

2. __Deploy Vault:__ In order to run vault instance in prod mode `vault/hashicorp/docker-compose.yaml` must be used accompanied by vault_init.sh script. All will be done by single make command:

```
make vault_up
```

3. __Stop Vault:__ In order to stop vault instance in prod mode `vault/hashicorp/docker-compose.yaml` must be used. All will be done by single make command:

```
make vault_down
```

4. __Destroy Vault:__ In order to destroy vault instance in prod mode `vault/hashicorp/docker-compose.yaml` must be used to stop vault services and all artifacts and certifiactes generated must be removed as well. All will be done by single make command:

```
make vault_destroy
```