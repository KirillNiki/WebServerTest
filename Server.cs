namespace ServerConnection;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;

using System.Timers;

class Server
{
    private EndPoint? ip;
    private int port;


    private bool active;
    private HttpListener httpListener;
    public const int maxClients = 10;



    public static PlayerContent[] AllPlayersInfo = new PlayerContent[maxClients];
    public static List<int> allSutableIdes = new List<int>(maxClients);
    public struct PlayerContent
    {
        public int enemyIndex;
        public int[][] fieldMatrix;
        public System.Timers.Timer waitingTimer;
        public System.Timers.Timer lastActionTimer;
        public System.Timers.Timer aliveTimer;

        public int y;
        public int x;

        public static PlayerContent Default => new PlayerContent()
        {
            enemyIndex = -100,
            fieldMatrix = new int[0][],
            waitingTimer = new System.Timers.Timer(),
            aliveTimer = new System.Timers.Timer(),
            lastActionTimer = new System.Timers.Timer(),
            y = -1,
            x = -1
        };
    }



    public Server(int port)
    {
        this.port = port;
        this.ip = new IPEndPoint(IPAddress.Parse(GetLocalIPAddress()), port);
        Console.WriteLine(ip);

        this.httpListener = new HttpListener();
        this.httpListener.Prefixes.Add($"http://{ip}/");

        for (int i = 0; i < AllPlayersInfo.Length; i++)
            AllPlayersInfo[i] = PlayerContent.Default;

        for (int i = 0; i < maxClients; i++)
            allSutableIdes.Add(i);

        Console.WriteLine(">>>>>>>>>>>1");
    }



    public void Start()
    {
        if (!active)
        {
            httpListener.Start();
            active = true;

            Listening();
        }
        else
        {
            Console.WriteLine("Server was started");
        }
    }



    private void Listening()
    {
        while (active)
        {
            try
            {
                Console.WriteLine(">>>>>>>>>>>2");
                var request = httpListener.GetContext();
                Console.WriteLine(">>>>>>>>>>>2222");
                if (request.Request.IsWebSocketRequest)
                {
                    Console.WriteLine(">>>>>>>>>>>2333");
                }
                else
                {
                    Console.WriteLine(">>>>>>>>>>>2444");
                    new GetWebPage(httpListener, request);
                    Console.WriteLine(">>>>>>>>>>>2555");
                }
                Console.WriteLine(">>>>>>>>>>>3");
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }
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
