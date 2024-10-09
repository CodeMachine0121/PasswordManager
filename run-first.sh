
sudo mkdir /var/vault-config
sudo cp vault.hcl /var/vault-config/vault.hcl

docker volume create vault_data
docker pull hashicorp/vault

docker run -d --cap-add=IPC_LOCK \
  --name vault \
  -v /var/vault-config:/vault/config \
  -p 8200:8200 \
  -e 'VAULT_ADDR=http://0.0.0.0:8200' \
  hashicorp/vault server

