storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address = "0.0.0.0:8300"  # Change from 8200 to another available port
  tls_disable = 1
}

disable_mlock = true
ui            = true
