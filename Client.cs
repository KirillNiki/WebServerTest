
namespace ServerConnection;

using System;
using System.IO;
using System.Text;
using System.Net.Sockets;
using System.Net;
using System.Text.RegularExpressions;

using System.Web;
using System.Text.Json;
using System.Timers;


class Client
{
    private const int errorId = -4;
    private const int enemyKickedId = -3;
    private const int botId = -2;
    private const int maxWaitingtime = 20000; //millisec
    private const int maxInactionTime = 40000; //millisec
    private const int maxAliveTime = 6000; //millisec
    private const int fieldWidth = 10;



    Socket client;
    HTTPHeaders Headers;

    private static Server.PlayerContent[] AllPlayersInfo = Server.AllPlayersInfo;
    private static (int, int) waiterIds = new(-1, -1);
    private static bool isSendBot;

    // public static Timer watingTimer = new Timer(maxWaitingtime);


    // private static List<NewClientConnected> newClientDelegates = new List<NewClientConnected>();
    // private delegate void NewClientConnected();
    // private static event NewClientConnected? newClientConnectedReal;

    // private static event NewClientConnected? newClientConnected
    // {
    //     add
    //     {
    //         newClientConnectedReal += value;
    //         newClientDelegates.Add(value);
    //     }
    //     remove
    //     {
    //         newClientConnectedReal -= value;
    //         newClientDelegates.Remove(value);
    //     }
    // }

    // private static List<OnsendCell> sendCellDelegates = new List<OnsendCell>();
    // public delegate void OnsendCell();
    // private static event OnsendCell? onsendCellReal;
    // private static event OnsendCell? onsendCell
    // {
    //     add
    //     {
    //         onsendCellReal += value;
    //         sendCellDelegates.Add(value);
    //     }
    //     remove
    //     {
    //         onsendCellReal -= value;
    //         sendCellDelegates.Remove(value);
    //     }
    // }

    public static List<int> allSutableIdes = new List<int>(Server.maxClients);



    public Client(Socket socket)
    {
        client = socket;
        byte[] data = new byte[client.ReceiveBufferSize];
        string request = "";
        client.Receive(data);
        request = Encoding.UTF8.GetString(data);


        if (request == "")
        {
            client.Close();
            return;
        }

        Headers = Parse(request);
        Console.WriteLine($"[{client.RemoteEndPoint}]\nReal path: {Headers.RealPath}\nFile: {Headers.File}\nDate: {DateTime.Now}");

        if (Headers.RealPath.IndexOf("..") != -1)
        {
            SendError(404);
            client.Close();
            return;
        }


        if (File.Exists(Headers.RealPath))
        {
            GetSheet();
            client.Close();
        }
        else if (Headers.File == "/content/WarShips/getPlayerId")
        {
            SendPlayerId();
            client.Close();
        }
        else if (Headers.File.Substring(0, ("/content/WarShips/getEnemyMatrix").Length) == "/content/WarShips/getEnemyMatrix")
        {
            FindEnemy();
            client.Close();
        }
        else if (Headers.File.Substring(0, ("/content/WarShips/getMoveNumber").Length) == "/content/WarShips/getMoveNumber")
        {
            GetMoveNumber();
            client.Close();
        }
        else if (Headers.File.Substring(0, ("/content/WarShips/clickedCellByMe").Length) == "/content/WarShips/clickedCellByMe")
        {
            GetClickedCell();
            client.Close();
        }
        else if (Headers.File.Substring(0, ("/content/WarShips/clickedCellByEnemy").Length) == "/content/WarShips/clickedCellByEnemy")
        {
            GetEnemyClickedCell();
            client.Close();
        }
        // else if (Headers.File.Substring(0, ("/content/WarShips/disconnect").Length) == "/content/WarShips/disconnect")
        // {
        //     OnPlayerDisconnect();
        //     client.Close();
        // }
        // else if (Headers.File.Substring(0, ("/content/WarShips/alive").Length) == "/content/WarShips/alive")
        // {
        //     // OnGetAliveTimer();
        //     client.Close();
        // }
        else if (Headers.File.Substring(0, ("/content/WarShips/endGame").Length) == "/content/WarShips/endGame")
        {
            EndGame();
            client.Close();
        }
        else
        {
            SendError(404);
            client.Close();
        }
    }



    private void SendPlayerId()
    {
        int playerIndex = allSutableIdes[0];
        SendSomeData(new Server.CurrentPlayerIndex { currentPlayerIndex = playerIndex }, client);

        AllPlayersInfo[playerIndex] = new Server.PlayerContent { enemyIndex = -1 };
        Server.PlayerContent temp = AllPlayersInfo[playerIndex];
        temp.fieldMatrix = new int[fieldWidth][];
        for (int i = 0; i < temp.fieldMatrix.Length; i++)
        {
            temp.fieldMatrix[i] = new int[fieldWidth];
        }
        temp.y = -1;
        temp.x = -1;
        temp.aliveTimer = new Timer(maxAliveTime);
        temp.aliveTimer.Elapsed += (Object source, ElapsedEventArgs e) =>
        {
            Console.WriteLine("aliveTimer Elapsed");
            RemovePlayer(playerIndex);
        };

        temp.waitingTimer = new Timer(maxWaitingtime);
        temp.waitingTimer.Elapsed += (Object source, ElapsedEventArgs e) => { isSendBot = true; };

        AllPlayersInfo[playerIndex] = temp;
        allSutableIdes.RemoveAt(0);
    }



    private void FindEnemy()
    {
        var playerInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/getEnemyMatrix").Length + 1));
        Server.MatrixData? returnedMatrixData = JsonSerializer.Deserialize<Server.MatrixData>(playerInfo);
        int playerId = returnedMatrixData.playerId;

        Server.PlayerContent temp = AllPlayersInfo[playerId];
        Array.Copy(returnedMatrixData.fieldMatrix, temp.fieldMatrix, returnedMatrixData.fieldMatrix.Length);
        temp.aliveTimer.Stop();
        temp.aliveTimer.Start();


        if (isSendBot)
        {
            isSendBot = false;
            SendBot();
        }
        else
        {
            if (waiterIds.Item1 == -1)
            {
                waiterIds.Item1 = playerId;
                SendSomeData(new Server.MatrixData() { playerId = errorId }, client);
                temp.waitingTimer.Start();
            }
            else
            {
                if (waiterIds.Item1 == playerId && waiterIds.Item2 != -1)
                {
                    temp.enemyIndex = waiterIds.Item2;
                    SendSomeData(new Server.MatrixData() { playerId = temp.enemyIndex, fieldMatrix = AllPlayersInfo[temp.enemyIndex].fieldMatrix }, client);
                }
                else if (waiterIds.Item1 != playerId)
                {
                    waiterIds.Item2 = playerId;
                    temp.enemyIndex = waiterIds.Item1;
                    SendSomeData(new Server.MatrixData() { playerId = temp.enemyIndex, fieldMatrix = AllPlayersInfo[temp.enemyIndex].fieldMatrix }, client);
                }
                else
                {
                    SendSomeData(new Server.MatrixData() { playerId = errorId }, client);
                }
                AllPlayersInfo[playerId] = temp;


                if (temp.enemyIndex != -1 &&
                    temp.enemyIndex + AllPlayersInfo[temp.enemyIndex].enemyIndex == waiterIds.Item1 + waiterIds.Item2)
                {
                    AllPlayersInfo[waiterIds.Item1].waitingTimer.Stop();
                    AllPlayersInfo[waiterIds.Item1].aliveTimer.Stop();

                    AllPlayersInfo[waiterIds.Item2].waitingTimer.Stop();
                    AllPlayersInfo[waiterIds.Item2].aliveTimer.Stop();

                    waiterIds.Item1 = -1;
                    waiterIds.Item2 = -1;


                    for (int i = 0; i < AllPlayersInfo.Length; i++)
                    {
                        Console.WriteLine($">>>>>>>>>>>>>>{i}<<<<<<<{AllPlayersInfo[i].enemyIndex}");
                    }
                }
            }
        }

        Console.WriteLine($"{waiterIds.Item1}______________{waiterIds.Item2}");
    }



    // private void GetSendMatrix(int playerId, Socket currentClient, int freePlayerId = -1)
    // {
    //     Server.PlayerContent freePlayer = new Server.PlayerContent();
    //     Server.PlayerContent temp = AllPlayersInfo[playerId];

    //     if (freePlayerId == -1)
    //     {
    //         for (int i = 0; i < AllPlayersInfo.Length; i++)
    //         {
    //             if (!AllPlayersInfo[i].Equals(Server.PlayerContent.Default) && i != playerId && AllPlayersInfo[i].enemyIndex == -1)
    //             {
    //                 freePlayer = AllPlayersInfo[i];
    //                 freePlayerId = i;

    //                 temp.enemyIndex = i;
    //                 AllPlayersInfo[playerId] = temp;
    //                 break;
    //             }
    //         }
    //     }
    //     else
    //     {
    //         freePlayer = AllPlayersInfo[freePlayerId];

    //         temp.enemyIndex = freePlayerId;
    //         AllPlayersInfo[playerId] = temp;
    //     }

    //     SendSomeData(new Server.MatrixData() { playerId = freePlayerId, fieldMatrix = freePlayer.fieldMatrix }, currentClient);
    //     currentClient.Close();
    // }



    private void GetMoveNumber()
    {
        var playerInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/getMoveNumber").Length + 1));
        Server.CurrentPlayerIndex? playerIndex = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerInfo);

        Server.PlayerContent temp = Server.AllPlayersInfo[playerIndex.currentPlayerIndex];
        temp.lastActionTimer = new Timer(maxInactionTime);
        temp.lastActionTimer.Elapsed += (Object source, ElapsedEventArgs e) =>
        {
            Console.WriteLine("lastActionTimer Elapsed");
            RemovePlayer(playerIndex.currentPlayerIndex);
        };
        Server.AllPlayersInfo[playerIndex.currentPlayerIndex] = temp;


        if (playerIndex.currentPlayerIndex < AllPlayersInfo[playerIndex.currentPlayerIndex].enemyIndex)
        {
            SendSomeData(new Server.MoveNumber() { moveNumber = 1 }, client);
            AllPlayersInfo[playerIndex.currentPlayerIndex].lastActionTimer.Start();
        }
        else
        {
            SendSomeData(new Server.MoveNumber() { moveNumber = 2 }, client);
            AllPlayersInfo[playerIndex.currentPlayerIndex].lastActionTimer.Stop();
        }
    }



    private void RemovePlayer(int playerId)
    {
        for (int i = 0; i < AllPlayersInfo.Length; i++)
        {
            Console.WriteLine(AllPlayersInfo[i].enemyIndex);
        }

        var temp = AllPlayersInfo[playerId];
        // if (temp.enemyIndex != -1 && isKicked)
        // {
        //     Console.WriteLine("jjjjjjjjjjjjjjjj1");
        //     var enenmyId = temp.enemyIndex;
        //     SendSomeData(new Server.CellData() { playerId = enemyKickedId }, client);
        //     Console.WriteLine("jjjjjjjjjjjjjjjj2");
        //     RemovePlayer(enenmyId, false);
        //     Console.WriteLine("jjjjjjjjjjjjjjjj3");
        // }
        Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>2");

        if (temp.aliveTimer != null) temp.aliveTimer.Close();
        Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>21");
        if (temp.lastActionTimer != null) temp.lastActionTimer.Close();
        Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>22");
        if (temp.waitingTimer != null) temp.waitingTimer.Close();
        Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>23");

        temp = Server.PlayerContent.Default;
        AllPlayersInfo[playerId] = temp;
        allSutableIdes.Add(playerId);
        Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>3");

        for (int i = 0; i < AllPlayersInfo.Length; i++)
        {
            Console.WriteLine(AllPlayersInfo[i].enemyIndex);
        }
    }



    public void SendBot()
    {
        Console.WriteLine("SendBot");

        Console.WriteLine("<<<<<<<<<<<<<<<<<<<<1");
        SendSomeData(new Server.MatrixData() { playerId = botId }, client);
        Console.WriteLine("<<<<<<<<<<<<<<<<<<<<2");

        Console.WriteLine("<<<<<<<<<<<<<<<<<<<<3");
        RemovePlayer(waiterIds.Item1);
        Console.WriteLine("<<<<<<<<<<<<<<<<<<<<4");
        waiterIds.Item1 = -1;
    }



    private void GetClickedCell()
    {
        var cellInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/clickedCellByMe").Length + 1));
        Server.CellData? returnedCellData = JsonSerializer.Deserialize<Server.CellData>(cellInfo);

        var temp = AllPlayersInfo[returnedCellData.playerId];
        temp.y = returnedCellData.y;
        temp.x = returnedCellData.x;
        temp.lastActionTimer.Stop();
        temp.lastActionTimer.Start();
        temp.aliveTimer.Stop();

        AllPlayersInfo[returnedCellData.playerId] = temp;
        SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);
    }



    private void GetEnemyClickedCell()
    {
        var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/clickedCellByEnemy").Length + 1));
        Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

        var temp = AllPlayersInfo[returnedId.currentPlayerIndex];
        int enemyId = temp.enemyIndex;
        var enemy = AllPlayersInfo[enemyId];

        temp.lastActionTimer.Stop();
        temp.aliveTimer.Stop();

        if (enemy.y != -1)
        {
            SendSomeData(new Server.CellData() { playerId = enemyId, y = enemy.y, x = enemy.x }, client);
            enemy.y = -1;
            enemy.x = -1;
        }
        else
        {
            SendSomeData(new Server.CellData() { playerId = errorId, y = -1, x = -1 }, client);
        }

        temp.aliveTimer.Start();
        AllPlayersInfo[returnedId.currentPlayerIndex] = temp;
        AllPlayersInfo[enemyId] = enemy;
    }



    public void EndGame()
    {
        var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/endGame").Length + 1));
        Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

        // SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);

        // BattleInfo? tempBattleInfo = Server.AllBattleInfo.Find(battleInfo =>
        //     battleInfo.Player1Id == returnedId.currentPlayerIndex ||
        //     battleInfo.Player2Id == returnedId.currentPlayerIndex
        // );

        // Server.AllBattleInfo.Remove(tempBattleInfo);
        // RemovePlayer(AllPlayersInfo[returnedId.currentPlayerIndex].enemyIndex, false);
        // RemovePlayer(returnedId.currentPlayerIndex, false);
    }



    // private void OnGetAliveTimer()
    // {
    //     var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/alive").Length + 1));
    //     Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

    //     AllPlayersInfo[returnedId.currentPlayerIndex].aliveTimer.Stop();
    //     SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);
    //     AllPlayersInfo[returnedId.currentPlayerIndex].aliveTimer.Start();
    // }




    // private void OnPlayerDisconnect()
    // {
    //     var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/disconnect").Length + 1));
    //     Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

    //     RemovePlayer(returnedId.currentPlayerIndex, true);
    // }




    public static void SendSomeData(Object classType, Socket sendClient)
    {
        string jsonFile = JsonSerializer.Serialize(classType);
        byte[] bytes = Encoding.UTF8.GetBytes(jsonFile);

        SendFileHeader("json", bytes.Length, sendClient);
        sendClient.Send(bytes, bytes.Length, SocketFlags.None);
    }

    public static void SendFileHeader(string contentType, long fileLength, Socket socket)
    {
        string headers = $"HTTP/1.1 200 OK\nContent-type: {contentType}\nContent-Length: {fileLength}\n\n";

        byte[] data = Encoding.UTF8.GetBytes(headers);
        socket.Send(data, data.Length, SocketFlags.None);
    }


    public void SendError(int code)
    {
        string html = $"<html><head><title></title></head><body><h1>Error {code}</h1></body></html>";
        string headers = $"HTTP/1.1 {code} OK\nContent-type: text/html\nContent-Length: {html.Length}\n\n{html}";
        byte[] data = Encoding.UTF8.GetBytes(headers);
        client.Send(data, data.Length, SocketFlags.None);
        client.Close();
    }




    public struct HTTPHeaders
    {
        public string Method;
        public string RealPath;
        public string File;
    }


    public static HTTPHeaders Parse(string headers)
    {
        HTTPHeaders result = new HTTPHeaders();
        result.Method = Regex.Match(headers, @"\A\w[a-zA-Z]+", RegexOptions.Multiline).Value;
        result.File = Regex.Match(headers, @"(?<=\w\s)([\Wa-zA-Z0-9]+)(?=\sHTTP)", RegexOptions.Multiline).Value;
        result.RealPath = $"{AppDomain.CurrentDomain.BaseDirectory}{result.File}";
        return result;
    }


    public void GetSheet()
    {
        try
        {
            string contentType = GetContentType();
            FileStream fs = new FileStream(Headers.RealPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            string headers = $"HTTP/1.1 200 OK\nContent-type: {contentType}\nContent-Length: {fs.Length}\n\n";

            byte[] data = Encoding.UTF8.GetBytes(headers);
            client.Send(data, data.Length, SocketFlags.None);

            data = new byte[fs.Length];
            int length = fs.Read(data, 0, data.Length);
            client.Send(data, data.Length, SocketFlags.None);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception: {ex}/nMessage: {ex.Message}");
        }
    }



    string GetContentType()
    {
        string result = "";
        string format = FileExtention(Headers.File);
        switch (format)
        {
            //image
            case "gif":
            case "jpeg":
            case "pjpeg":
            case "png":
            case "tiff":
            case "webp":
                result = $"image/{format}";
                break;
            case "svg":
                result = $"image/svg+xml";
                break;
            case "ico":
                result = $"image/vnd.microsoft.icon";
                break;
            case "wbmp":
                result = $"image/vnd.map.wbmp";
                break;
            case "jpg":
                result = $"image/jpeg";
                break;
            // text
            case "css":
                result = $"text/css";
                break;
            case "html":
                result = $"text/{format}";
                break;
            case "javascript":
            case "js":
                result = $"text/javascript";
                break;
            case "php":
                result = $"text/html";
                break;
            case "htm":
                result = $"text/html";
                break;
            default:
                result = "application/unknown";
                break;
        }
        return result;
    }


    public static string FileExtention(string file)
    {
        return Regex.Match(file, @"(?<=[\W])\w+(?=[\W]{0,}$)").Value;
    }
}
