
namespace ServerConnection;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;

class Connection
{
    private static Server? server;
    private static int port = 9000;
    private static int sslPort = 8443;
    private static int maxClients = 10;


    private static void Main()
    {
        server = new Server(port, maxClients);
        server.Start();
    }
}
