
namespace ServerConnection;

using System;
using System.IO;
using System.Text;
using System.Net.WebSockets;
using System.Net;

using System.Web;
using System.Text.Json;
using System.Timers;
// using WebSocketSharp;


class Client
{
    private const int youKickedId = -5;
    private const int errorId = -4;
    private const int enemyKickedId = -3;
    private const int botId = -2;
    private const int maxInactionTime = 40000; //millisec
    private const int fieldWidth = 10;

    private delegate void NewClientConnected();
    private static List<NewClientConnected> eventDelegates = new List<NewClientConnected>();
    private static event NewClientConnected? newClientConnectedReal;
    private static event NewClientConnected newClientConnected
    {
        add
        {
            eventDelegates.Add(value);
            newClientConnectedReal += value;
        }
        remove
        {
            eventDelegates.Remove(value);
            newClientConnectedReal -= value;
        }
    }



    private WebSocket ClientWebSocket;
    private string resivedDataString = "";
    private int[][] fieldMatrix = new int[fieldWidth][];
    public Server.ClickedCellInfo ClickedCellInfo = new Server.ClickedCellInfo { y = -1, x = -1, cellState = Server.CellState.none };
    public System.Timers.Timer lastActionTimer = new Timer(maxInactionTime);
    private int playerId;
    public int enemyId = -1;



    private bool kickedFlag = false;



    public Client(WebSocket webSocket)
    {
        this.ClientWebSocket = webSocket;
        while (ClientWebSocket.State == WebSocketState.Open || ClientWebSocket.State == WebSocketState.CloseSent)
        {
            CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();
            Task resiveTask = new Task(async () => await ReciveData(cancellationTokenSource), cancellationTokenSource.Token);
            resiveTask.Start();
            resiveTask.Wait();

            Thread.Sleep(2000);
            Console.WriteLine(resivedDataString);

            if (resivedDataString != "")
            {
                int slashIndex = resivedDataString.IndexOf('/');
                string request = "";
                string playerInfo = "";

                if (slashIndex != -1)
                {
                    request = resivedDataString.Substring(0, slashIndex);
                    playerInfo = resivedDataString.Substring(slashIndex + 1, resivedDataString.Length - 1 - slashIndex);
                    Console.WriteLine(playerInfo);
                }
                Task sendTask;

                switch (request)
                {
                    case ("getPlayerId"):
                        sendTask = new Task(async () => await SendPlayerId());
                        sendTask.Start();
                        break;

                    case ("getEnemy"):
                        sendTask = new Task(async () => await FindEnemy(playerInfo));
                        sendTask.Start();
                        break;

                    case ("getMoveNumber"):
                        sendTask = new Task(async () => await SendMoveNumber());
                        sendTask.Start();
                        break;

                    case ("clickedCell"):
                        sendTask = new Task(async () => await GetClickedCell(playerInfo));
                        sendTask.Start();
                        break;

                    case ("enemyCellResponce"):
                        sendTask = new Task(async () => await EnemyCellResponce(playerInfo));
                        sendTask.Start();
                        break;
                }
                resivedDataString = "";
            }
        }


        if (kickedFlag)
        {
            Task kickTask = new Task(async () => await KickPlayer());
            kickTask.Start();
            kickTask.Wait();
        }
        Console.WriteLine("<<<<<<<<<<<<<<<<<<<<<<" + playerId);
    }




    private async Task ReciveData(CancellationTokenSource cancellationTokenSource)
    {
        Console.WriteLine(">>>>>>>>>>>>> getting Message" + playerId);
        try
        {
            int chunkCounter = 0;
            Memory<byte> allData = null;
            var buffer = new Memory<byte>(new byte[1000]);
            ValueWebSocketReceiveResult chunk = new ValueWebSocketReceiveResult();

            do
            {
                chunk = await ClientWebSocket.ReceiveAsync(buffer, cancellationTokenSource.Token);

                if (chunk.MessageType == WebSocketMessageType.Close)
                {
                    Console.WriteLine(">>>>>>>>>>>>> connection closed");
                    cancellationTokenSource.Cancel();
                    break;
                }
                else
                {
                    var chunkData = buffer.Slice(0, chunk.Count);
                    Memory<byte> tempData = null;
                    if (chunkCounter != 0)
                    {
                        tempData = new Memory<byte>(new byte[allData.Length]);
                        allData.CopyTo(tempData.Slice(0, allData.Length));
                    }

                    allData = new Memory<byte>(new byte[(1000 * chunkCounter) + chunkData.Length]);
                    if (chunkCounter != 0)
                        tempData.CopyTo(allData.Slice(0, tempData.Length));

                    chunkData.CopyTo(allData.Slice(1000 * chunkCounter, chunkData.Length));
                    chunkCounter++;
                }
            } while (!chunk.EndOfMessage);
            resivedDataString = Encoding.UTF8.GetString(allData.ToArray());
        }
        catch (Exception e)
        {
            Console.WriteLine(">>>>>>>error:  " + e.Message);
        }

        Console.WriteLine(">>>>>>>>>>>>> end getting Message" + playerId);
    }




    private async Task SendPlayerId()
    {
        playerId = Server.allSutableIdes[0];
        await SendSomeData(new PlayerIndex { playerId = playerId }, ClientWebSocket);
        enemyId = -1;

        Console.WriteLine(playerId);
        Server.AllCients[playerId] = this;
        for (int i = 0; i < fieldMatrix.Length; i++)
            fieldMatrix[i] = new int[fieldWidth];

        Server.allSutableIdes.RemoveAt(0);
    }




    private async Task FindEnemy(string playerInfo)
    {
        MatrixData? returnedMatrixData = JsonSerializer.Deserialize<MatrixData>(playerInfo);
        Array.Copy(returnedMatrixData.fieldMatrix, fieldMatrix, returnedMatrixData.fieldMatrix.Length);


        if (Server.waiterId == -1)
        {
            Server.waiterId = playerId;
            Console.WriteLine(Server.waiterId);

            newClientConnected += async () => await GetEnemy();
            Server.waitingTimer.Start();

        }
        else
        {
            Server.waitingTimer.Stop();
            await GetEnemy(Server.waiterId);

            newClientConnectedReal?.Invoke();
            for (int i = 0; i < eventDelegates.Count; i++)
                newClientConnected -= eventDelegates[i];


            for (int i = 0; i < Server.AllCients.Length; i++)
            {
                if (Server.AllCients[i] != null)
                    Console.WriteLine($"{i}>>>>>>>>>>>>>{Server.AllCients[i].enemyId}");
            }

            Server.waiterId = -1;
        }
    }




    private async Task GetEnemy(int freePlayerId = -1)
    {
        Client freePlayer;
        if (freePlayerId == -1)
        {
            for (int i = 0; i < Server.AllCients.Length; i++)
            {
                if (Server.AllCients[i] != null && Server.AllCients[i].enemyId == playerId)
                {
                    freePlayerId = i;
                    break;
                }
            }
        }
        freePlayer = Server.AllCients[freePlayerId];

        Server.AllCients[playerId].enemyId = freePlayerId;
        await SendSomeData(new PlayerIndex() { playerId = freePlayerId }, ClientWebSocket);
    }




    private async Task SendMoveNumber()
    {
        Console.WriteLine(">>>>>>>>>>> sending moveNumber" + playerId);
        lastActionTimer.Elapsed += async (Object source, ElapsedEventArgs e) => await KickPlayer();
        if (playerId < enemyId)
        {
            await SendSomeData(new MoveNumber() { moveNumber = 1 }, ClientWebSocket);
            lastActionTimer.Start();
        }
        else
        {
            await SendSomeData(new MoveNumber() { moveNumber = 2 }, ClientWebSocket);
            lastActionTimer.Stop();
        }
    }




    private static void RemovePlayer(int playerIndex)
    {
        Console.WriteLine(">>>>>>>>>>>> removing player");
        for (int i = 0; i < Server.AllCients.Length; i++)
        {
            if (Server.AllCients[i] != null)
                Console.WriteLine(Server.AllCients[i].enemyId);
        }

        Server.AllCients[playerIndex] = null;
        Server.allSutableIdes.Add(playerIndex);

        for (int i = 0; i < Server.AllCients.Length; i++)
        {
            if (Server.AllCients[i] != null)
                Console.WriteLine(Server.AllCients[i].enemyId);
        }
    }




    private async Task KickPlayer()
    {
        Console.WriteLine(">>>>>>>>.kicking player" + playerId);
        if (Server.waiterId == playerId)
        {
            Server.waiterId = -1;
        }

        if (ClientWebSocket.State == WebSocketState.Open)
        {
            await SendSomeData(new PlayerIndex() { playerId = youKickedId }, ClientWebSocket);
        }
        RemovePlayer(playerId);

        var enemy = Server.AllCients[enemyId];
        if (enemy.ClientWebSocket.State == WebSocketState.Open)
        {
            await SendSomeData(new PlayerIndex { playerId = enemyKickedId }, enemy.ClientWebSocket);
        }
        kickedFlag = true;
    }




    public async static Task SendBot()
    {
        Console.WriteLine(">>>>>>>>>> sending bot");
        await SendSomeData(new PlayerIndex() { playerId = botId }, Server.AllCients[Server.waiterId].ClientWebSocket);
        RemovePlayer(Server.waiterId);

        Server.waitingTimer.Stop();
        Server.waiterId = -1;
    }




    private async Task GetClickedCell(string cellInfo)
    {
        Console.WriteLine(">>>>>>>>>>>> got celldata" + playerId);
        lastActionTimer.Stop();

        Console.WriteLine(cellInfo);
        CellData? returnedCellData = JsonSerializer.Deserialize<CellData>(cellInfo);

        ClickedCellInfo.y = returnedCellData.y;
        ClickedCellInfo.x = returnedCellData.x;

        Console.WriteLine($"<<<<<<<<<<<<<{playerId}:    {ClickedCellInfo.y}{ClickedCellInfo.x}");
        if (Server.AllCients[enemyId].ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(returnedCellData, Server.AllCients[enemyId].ClientWebSocket);
    }




    private async Task EnemyCellResponce(string cellInfoJson)
    {
        IsGot? cellInfo = JsonSerializer.Deserialize<IsGot>(cellInfoJson);

        if (Server.AllCients[enemyId].ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(cellInfo, Server.AllCients[enemyId].ClientWebSocket);

        if (cellInfo.isGot)
        {
            Server.AllCients[enemyId].lastActionTimer.Start();
        }
        else
        {
            lastActionTimer.Start();
        }
    }




    // public void EndGame()
    // {
    //     var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/endGame").Length + 1));
    //     Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

    //     // SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);

    //     // BattleInfo? tempBattleInfo = Server.AllBattleInfo.Find(battleInfo =>
    //     //     battleInfo.Player1Id == returnedId.currentPlayerIndex ||
    //     //     battleInfo.Player2Id == returnedId.currentPlayerIndex
    //     // );

    //     // Server.AllBattleInfo.Remove(tempBattleInfo);
    //     // RemovePlayer(AllPlayersInfo[returnedId.currentPlayerIndex].enemyIndex, false);
    //     // RemovePlayer(returnedId.currentPlayerIndex, false);
    // }



    // // private void OnGetAliveTimer()
    // // {
    // //     var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/alive").Length + 1));
    // //     Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

    // //     AllPlayersInfo[returnedId.currentPlayerIndex].aliveTimer.Stop();
    // //     SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);
    // //     AllPlayersInfo[returnedId.currentPlayerIndex].aliveTimer.Start();
    // // }




    // // private void OnPlayerDisconnect()
    // // {
    // //     var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/disconnect").Length + 1));
    // //     Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

    // //     RemovePlayer(returnedId.currentPlayerIndex, true);
    // // }




    public async static Task SendSomeData(Object classType, WebSocket webSocket)
    {
        string jsonFile = JsonSerializer.Serialize(classType);
        byte[] bytes = Encoding.UTF8.GetBytes(jsonFile);

        await webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
