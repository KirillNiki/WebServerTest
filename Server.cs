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
    private const int maxWaitingtime = 20000; //millisec


    private EndPoint? ip;
    private int port;


    private bool active;
    private HttpListener httpListener;
    private static int maxClients;


    public static List<int> allSutableIdes = new List<int>(0);
    public static Client[] AllCients = new Client[0];


    public static System.Timers.Timer waitingTimer = new System.Timers.Timer(maxWaitingtime);
    public static bool isSendBot = false;
    public static int waiterId = -1;



    public enum CellState { missed, got, none };
    public struct ClickedCellInfo
    {
        public int y;
        public int x;
        public CellState cellState;
    }



    public Server(int port, int maxClientsCount)
    {
        this.port = port;
        this.ip = new IPEndPoint(IPAddress.Parse(GetLocalIPAddress()), port);
        Console.WriteLine(ip);
        maxClients = maxClientsCount;

        this.httpListener = new HttpListener();
        this.httpListener.Prefixes.Add($"http://{ip}/");

        AllCients = new Client[maxClients];
        allSutableIdes = new List<int>(maxClients);
        for (int i = 0; i < maxClients; i++)
            allSutableIdes.Add(i);
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



    private async void Listening()
    {
        while (active)
        {
            try
            {
                var request = httpListener.GetContext();
                if (request.Request.IsWebSocketRequest)
                {
                    Console.WriteLine(">>>>>>>>>>> webSocket connected");
                    HttpListenerWebSocketContext webSocketContext = await request.AcceptWebSocketAsync(null);
                    WebSocket webSocket = webSocketContext.WebSocket;

                    Thread clienttThread = new Thread(() => new Client(webSocket));
                    clienttThread.Start();
                }
                else
                {
                    Console.WriteLine(">>>>>>>>>>> page was sent");
                    new GetWebPage(httpListener, request);
                }
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
