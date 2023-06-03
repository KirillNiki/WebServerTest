bash killServer.bash

ssh entcor@192.168.2.81 "cd server && rm -r -f WebServerTest/bin/Debug/net7.0/content/WarShips/"
scp -r bin/Debug/net7.0/content/WarShips/ entcor@192.168.2.81:server/WebServerTest/bin/Debug/net7.0/content/

bash publish.bash
