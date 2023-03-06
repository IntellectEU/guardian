vault_keygen:
	@./vault/hashicorp/scripts/keygen/keygen_cfssl.sh
	
cfgen:
	@./vault/hashicorp/scripts/consul/consul_config_gen.sh
	@./vault/hashicorp/scripts/vault/vault_config_gen.sh

vault_up: vault_keygen distribute_keys cfgen
	@docker-compose -f ./vault/hashicorp/docker-compose.yaml up -d
	@sleep 10
	@./vault/hashicorp/scripts/vault/vault_init.sh

vault_down:
	@docker-compose -f ./vault/hashicorp/docker-compose.yaml down -v

vault_destroy: vault_down clean_keys clean_artifacts

vault_restart: vault_down vault_up

vault_dev_up: cfgen
	@docker-compose -f ./vault/hashicorp/docker-compose-dev.yaml up -d
	@sleep 10
	@./vault/hashicorp/scripts/vault/vault_init.sh

vault_dev_down:
	@docker-compose -f ./vault/hashicorp/docker-compose-dev.yaml down -v

vault_dev_destroy: vault_dev_down clean_artifacts

distribute_keys:
	@./vault/hashicorp/scripts/keygen/keystore.sh distribute

clean_keys:
	@./vault/hashicorp/scripts/keygen/keystore.sh clean

clean_artifacts:
	@rm -rf ./vault/hashicorp/vault
	@rm -rf ./vault/hashicorp/consul
