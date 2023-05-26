namespace ServerConnection;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;

using System.Timers;

class Server
{
    public static string onlineFilePath = @"bin/Debug/net7.0/content/WarShips/online.json";

    public EndPoint IP { get { return ip; } }
    private EndPoint ip;

    public int Port { get { return port; } }
    private int port;

    public bool Active { get { return active; } }
    private bool active;

    private Socket socketListener;
    private volatile CancellationTokenSource cancellationToken;
    private Thread? AcceptEventThread;
    public static List<EndPoint> endPoints = new List<EndPoint>();
    public const int maxClients = 10;


    public class CurrentPlayerIndex
    {
        public int currentPlayerIndex { get; set; }
    }

    public class MatrixData
    {
        public int playerId { get; set; }
        public int[][]? fieldMatrix { get; set; }
    }

    public static PlayerContent[] AllPlayersInfo = new PlayerContent[maxClients];
    public struct PlayerContent
    {
        public int enemyIndex;
        public int[][] fieldMatrix;
        public Socket playerSocket;
        public DateTime lastActionTime;
    }



    public Server(int port)
    {
        this.port = port;
        this.ip = new IPEndPoint(IPAddress.Parse(GetLocalIPAddress()), port);
        this.socketListener = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        this.cancellationToken = new CancellationTokenSource();


        Client.watingTimer.Elapsed += (Object source, ElapsedEventArgs e) => Client.SendBot();

        for (int i = 0; i < maxClients; i++)
            Client.allSutableIdes.Add(i);
    }


    public void Start()
    {
        if (!active)
        {
            socketListener.Bind(ip);
            socketListener.Listen(maxClients);
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
