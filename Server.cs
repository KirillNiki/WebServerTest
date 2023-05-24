namespace ServerConnection;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;

class Server
{
    public static string onlineFilePath = "online.json";

    public EndPoint IP { get { return ip; } }
    private EndPoint ip;

    public int Port { get { return port; } }
    private int port;

    public bool Active { get { return active; } }
    private bool active;

    private Socket socketListener;
    private volatile CancellationTokenSource cancellationToken;
    private Thread AcceptEventThread;
    
    
    public static int currentPlayerIndex = 0;

    public class CurrentPlayerIndex
    {
        public int currentPlayerIndex {get; set;}
    }





    public Server(int port)
    {
        this.port = port;
        this.ip = new IPEndPoint(IPAddress.Parse(GetLocalIPAddress()), port);
        this.socketListener = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        this.cancellationToken = new CancellationTokenSource();
    }


    public void Start()
    {
        if (!active)
        {
            socketListener.Bind(ip);
            socketListener.Listen(10);
            active = true;

            this.AcceptEventThread = new Thread(() => ListeningSocket());
            AcceptEventThread.Start();
        }
        else
        {
            Console.WriteLine("Server was started");
        }
    }


    public void Stop()
    {
        if (active)
        {
            socketListener.Close();
            cancellationToken.Cancel();
            active = false;
        }
        else
        {
            Console.WriteLine("Server was stoped");
        }
    }


    private void ListeningSocket()
    {
        while (active)
        {
            Socket listenerAccept = socketListener.Accept();
            if (listenerAccept != null)
            {
                Task.Run(
                    () => ClientThread(listenerAccept),
                    cancellationToken.Token
                );
            }
        }
    }


    public void ClientThread(Socket socket)
    {
        new Client(socket);
    }


    public static string GetLocalIPAddress()
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        foreach (var ip in host.AddressList)
        {
            if (ip.AddressFamily == AddressFamily.InterNetwork)
            {
                return ip.ToString();
            }
        }
        throw new Exception("No network adapters with an IPv4 address in the system!");
    }
}
