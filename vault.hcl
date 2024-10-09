storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}


# KV v2 secret engine 路徑
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/*" {
  capabilities = ["list"]
}

# 允許對系統路徑的訪問（可能需要用於某些 UI 操作）
path "sys/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

ui = true
api_addr = "http://0.0.0.0:8200"
