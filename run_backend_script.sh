docker run --name password-manager-api -p 8080:8080 -e VAULT_TOKEN=$1 --network password-manager -d password-manager-api
