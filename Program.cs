
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
    // private static ConsoleCancelEventHandler? consoleCancelEvent;
    private static int port = 9000;

    private static void Main()
    {
        server = new Server(port);
        server.Start();
        // consoleCancelEvent += (object? sender, ConsoleCancelEventArgs args) => { server.Stop(); };
    }
}
