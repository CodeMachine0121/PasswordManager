docker run --name mysql --network password-manager  -p 3306:3306 -e MYSQL_ROOT_PASSWORD=$1 -d mysql
