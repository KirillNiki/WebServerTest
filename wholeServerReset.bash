ssh entcor@192.168.2.81 "cd server && rm -r -f WebServerTest"
cd ../ && scp -r WebServerTest entcor@192.168.2.81:server/
cd WebServerTest

bash killServer.bash
ssh entcor@192.168.2.81 "cd && cd server/WebServerTest && dotnet run"