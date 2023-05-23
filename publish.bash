ssh entcor@192.168.2.81 "killall WebServerTest"
ssh entcor@192.168.2.81 "FILE=server/WebServerTest/Program.cs
if test -f "$FILE"; then
    cd server/WebServerTest/ && rm -r -f *.cs WebServerTest.csproj
fi"

scp -r *.cs WebServerTest.csproj entcor@192.168.2.81:server/WebServerTest/
ssh entcor@192.168.2.81 "cd && cd server/WebServerTest && dotnet run"
