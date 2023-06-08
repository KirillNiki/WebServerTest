
namespace ServerConnection;

using System;
using System.IO;
using System.Text;
using System.Net.WebSockets;
using System.Net;

using System.Web;
using System.Text.Json;
using System.Timers;


class Client
{
    public enum States { none, destroyed, ship, missed, busy };
    private List<(int, int)> ship = new List<(int, int)>(4);

    private const int youKickedId = -4;
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
    private delegate void OnInitEnemyKick();
    private event OnInitEnemyKick onInitEnemyReadyKick;
    private bool isReadyReciveKick = false;




    private WebSocket ClientWebSocket;
    private string resivedDataString = "";
    private int moveNumber;
    private int playerId;
    public int enemyId = -1;



    public Client(WebSocket webSocket)
    {
        this.ClientWebSocket = webSocket;
        while (ClientWebSocket.State == WebSocketState.Open || ClientWebSocket.State == WebSocketState.CloseSent)
        {
            CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();
            Task resiveTask = new Task(async () => await ReciveData(cancellationTokenSource), cancellationTokenSource.Token);
            resiveTask.Start();
            resiveTask.Wait();

            // if (resivedDataString != "")
            //     Console.WriteLine(resivedDataString);
            Thread.Sleep(200);


            if (resivedDataString != "")
            {
                int slashIndex = resivedDataString.IndexOf('/');
                string request = "";
                string playerInfo = "";

                if (slashIndex != -1)
                {
                    request = resivedDataString.Substring(0, slashIndex);
                    playerInfo = resivedDataString.Substring(slashIndex + 1, resivedDataString.Length - 1 - slashIndex);
                    // Console.WriteLine(playerInfo);
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
                }
                resivedDataString = "";
            }
        }


        Task kickTask = new Task(async () => await KickPlayer());
        kickTask.Start();
        kickTask.Wait();

        // Console.WriteLine("<<<<<<<<<<<<<<<<<<<<<<" + playerId);
    }




    private async Task ReciveData(CancellationTokenSource cancellationTokenSource)
    {
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
            // Console.WriteLine(">>>>>>>error:  " + e.Message);
        }
    }




    private async Task SendPlayerId()
    {
        playerId = Server.allSutableIdes[0];
        if (ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(new PlayerIndex { playerId = playerId }, ClientWebSocket);
        enemyId = -1;

        // Console.WriteLine(playerId);
        Server.AllCients[playerId] = this;

        Server.AllBattleFields[playerId] = new States[fieldWidth][];
        for (int i = 0; i < Server.AllBattleFields[playerId].Length; i++)
            Server.AllBattleFields[playerId][i] = new States[fieldWidth];

        Server.allSutableIdes.RemoveAt(0);
    }




    private async Task FindEnemy(string playerInfo)
    {
        MatrixData? returnedMatrixData = JsonSerializer.Deserialize<MatrixData>(playerInfo);
        Array.Copy(returnedMatrixData.fieldMatrix, Server.AllBattleFields[playerId], returnedMatrixData.fieldMatrix.Length);


        if (Server.waiterId == -1)
        {
            // Console.WriteLine("<<<<<<<<<<<<<<<<<<<<<<<<<<1 " + Server.waiterId);
            Server.waiterId = playerId;
            // Console.WriteLine(Server.waiterId);

            int tempWaiter = Server.waiterId;
            newClientConnected += async () => await GetEnemy(tempWaiter);
            Server.waitingTimer.Start();
        }
        else
        {
            // Console.WriteLine("<<<<<<<<<<<<<<<<<<<<<<<<<<2 " + Server.waiterId);
            int tempWaiter = Server.waiterId;
            Server.waiterId = -1;

            Server.waitingTimer.Stop();
            await GetEnemy(tempWaiter);

            newClientConnectedReal?.Invoke();
            for (int i = 0; i < eventDelegates.Count; i++)
                newClientConnected -= eventDelegates[i];


            // for (int i = 0; i < Server.AllCients.Length; i++)
            // {
            //     if (Server.AllCients[i] != null)
            //         Console.WriteLine($"{i}>>>>>>>>>>>>>{Server.AllCients[i].enemyId}");
            // }
        }
    }




    private async Task GetEnemy(int waiterId)
    {
        Client freePlayer;
        int freePlayerId = -1;

        if (waiterId == playerId)
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
        else
            freePlayerId = waiterId;

        // Console.WriteLine(">>>>>>>>>>>>>>>>>0");
        // Console.WriteLine(playerId);
        // Console.WriteLine(freePlayerId);
        freePlayer = Server.AllCients[freePlayerId];

        // Console.WriteLine(">>>>>>>>>>>>>>>>>>>1");

        // for (int i = 0; i < Server.AllCients.Length; i++)
        // {
        //     if (Server.AllCients[i] != null)
        //         Console.WriteLine(Server.AllCients[i].enemyId);
        //     else
        //         Console.WriteLine("...");
        // }


        // if (Server.AllCients[playerId] == null)
        //     Console.WriteLine(playerId);

        Server.AllCients[playerId].enemyId = freePlayerId;


        // Console.WriteLine(">>>>>>>>>>>>>>>>>>>2");
        // for (int i = 0; i < Server.AllCients.Length; i++)
        // {
        //     if (Server.AllCients[i] != null)
        //         Console.WriteLine(Server.AllCients[i].enemyId);
        //     else
        //         Console.WriteLine("...");
        // }


        if (ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(new PlayerIndex() { playerId = freePlayerId }, ClientWebSocket);
    }




    private async Task SendMoveNumber()
    {
        // Console.WriteLine(">>>>>>>>>>> sending moveNumber" + playerId);
        if (playerId < enemyId)
        {
            if (ClientWebSocket.State == WebSocketState.Open)
                await SendSomeData(new MoveNumber() { moveNumber = 1 }, ClientWebSocket);
            moveNumber = 1;
        }
        else
        {
            if (ClientWebSocket.State == WebSocketState.Open)
                await SendSomeData(new MoveNumber() { moveNumber = 2 }, ClientWebSocket);
            moveNumber = 2;

            isReadyReciveKick = true;
            onInitEnemyReadyKick?.Invoke();
        }
    }




    private static void RemovePlayer(int playerIndex)
    {
        // Console.WriteLine(">>>>>>>>>>>> removing player");
        // for (int i = 0; i < Server.AllCients.Length; i++)
        // {
        //     if (Server.AllCients[i] != null)
        //         Console.WriteLine(Server.AllCients[i].enemyId);
        //     else
        //         Console.WriteLine("...");
        // }

        Server.AllCients[playerIndex] = null;
        Server.allSutableIdes.Add(playerIndex);

        // for (int i = 0; i < Server.AllCients.Length; i++)
        // {
        //     if (Server.AllCients[i] != null)
        //         Console.WriteLine(Server.AllCients[i].enemyId);
        //     else
        //         Console.WriteLine("...");
        // }
    }




    private async Task KickPlayer()
    {
        // Console.WriteLine(">>>>>>>>  kicking player" + playerId);

        if (Server.waiterId == playerId)
        {
            Server.waiterId = -1;
            Server.waitingTimer.Stop();
            for (int i = 0; i < eventDelegates.Count; i++)
                newClientConnected -= eventDelegates[i];

            if (enemyId != -1)
                Server.waiterId = enemyId;
        }


        if (ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(new PlayerIndex() { playerId = youKickedId }, ClientWebSocket);
        if (Server.AllCients[playerId] != null)
            RemovePlayer(playerId);

        if (enemyId != -1 && Server.AllCients[enemyId] != null)
        {
            var enemy = Server.AllCients[enemyId];
            enemy.onInitEnemyReadyKick += async () =>
            {
                Server.AllBattleFields[playerId] = null;
                Server.AllBattleFields[enemyId] = null;
                if (enemy.ClientWebSocket.State == WebSocketState.Open)
                    await SendSomeData(new PlayerIndex { playerId = enemyKickedId }, enemy.ClientWebSocket);
            };

            if (enemy.ClientWebSocket.State == WebSocketState.Open && enemy.isReadyReciveKick)
                enemy.onInitEnemyReadyKick?.Invoke();
        }
        else
        {
            Server.AllBattleFields[playerId] = null;
            if (enemyId != -1)
                Server.AllBattleFields[enemyId] = null;
        }
    }




    public async static Task SendBot()
    {
        // Console.WriteLine(">>>>>>>>>> sending bot");
        // Console.WriteLine(Server.waiterId);

        if (Server.AllCients[Server.waiterId].ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(new PlayerIndex() { playerId = botId }, Server.AllCients[Server.waiterId].ClientWebSocket);

        
        for (int i = 0; i < eventDelegates.Count; i++)
                newClientConnected -= eventDelegates[i];
        RemovePlayer(Server.waiterId);
        
        Server.waitingTimer.Stop();
        Server.waiterId = -1;
    }




    private async Task GetClickedCell(string cellInfo)
    {
        // Console.WriteLine(">>>>>>>>>>>> got celldata" + playerId);
        // Console.WriteLine(cellInfo);
        CellData? returnedCellData = JsonSerializer.Deserialize<CellData>(cellInfo);

        IsGot cellResponse = new IsGot();
        States[][] enemyField = Server.AllBattleFields[enemyId];

        if (ClientWebSocket.State == WebSocketState.Open)
        {
            if (enemyField[returnedCellData.y][returnedCellData.x] == States.ship)
            {
                cellResponse.isGot = true;
                ship.Add(new(returnedCellData.y, returnedCellData.x));
                CheckCell(returnedCellData.x, returnedCellData.y, -1, -1, enemyField);
                if (ship.Count != 0)
                {
                    cellResponse.isEnd = true;
                    ship.Clear();
                }
                enemyField[returnedCellData.y][returnedCellData.x] = States.destroyed;
            }
            else
            {
                cellResponse.isGot = false;
                cellResponse.isEnd = false;
                enemyField[returnedCellData.y][returnedCellData.x] = States.missed;

                if (Server.AllCients[enemyId] != null)
                    Server.AllCients[enemyId].isReadyReciveKick = false;
            }


            if (!isReadyReciveKick)
            {
                isReadyReciveKick = true;
                onInitEnemyReadyKick?.Invoke();

                if (Server.AllCients[enemyId] == null)
                    return;
            }


            await SendSomeData(cellResponse, ClientWebSocket);
            if (cellResponse.isGot == true)
                isReadyReciveKick = false;
        }

        if (Server.AllCients[enemyId] != null && Server.AllCients[enemyId].ClientWebSocket.State == WebSocketState.Open)
            await SendSomeData(returnedCellData, Server.AllCients[enemyId].ClientWebSocket);
    }




    private void CheckCell(int x, int y, int checkedY, int checkedX, States[][] EnemyFieldMatrix)
    {
        bool toBreak = false;
        for (int oy = y - 1; oy <= y + 1; oy++)
        {
            for (int ox = x - 1; ox <= x + 1; ox++)
            {
                if (oy == y && ox == x) { }
                else if (oy >= 0 && oy < fieldWidth && ox >= 0 && ox < fieldWidth && (oy != checkedY || ox != checkedX))
                {
                    if (EnemyFieldMatrix[oy][ox] == States.destroyed)
                    {
                        ship.Add(new(oy, ox));
                        CheckCell(ox, oy, y, x, EnemyFieldMatrix);
                    }
                    else if (EnemyFieldMatrix[oy][ox] == States.ship)
                    {
                        ship.Clear();
                        toBreak = true;
                        break;
                    }
                }
            }
            if (toBreak)
                break;
        }
    }




    public async static Task SendSomeData(Object classType, WebSocket webSocket)
    {
        string jsonFile = JsonSerializer.Serialize(classType);
        byte[] bytes = Encoding.UTF8.GetBytes(jsonFile);

        await webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
