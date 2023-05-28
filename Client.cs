
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
    Socket client;
    HTTPHeaders Headers;

    private static Server.PlayerContent[] AllPlayersInfo = Server.AllPlayersInfo;
    private static int waiterId = -1;
    public static Timer watingTimer = new Timer(20000);

    private delegate void NewClientConnected();
    private static event NewClientConnected? newClientConnected;

    private delegate void OnsendCell();
    private static event OnsendCell? onsendCell;

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
        }
        else
        {
            SendError(404);
            client.Close();
        }
    }



    private void SendPlayerId()
    {
        SendSomeData(new Server.CurrentPlayerIndex { currentPlayerIndex = allSutableIdes[0] }, client);

        AllPlayersInfo[allSutableIdes[0]] = new Server.PlayerContent { enemyIndex = -1 };
        Server.PlayerContent temp = AllPlayersInfo[allSutableIdes[0]];
        temp.fieldMatrix = new int[10][];
        for (int i = 0; i < temp.fieldMatrix.Length; i++)
        {
            temp.fieldMatrix[i] = new int[10];
        }
        temp.y = -1;
        temp.x = -1;

        AllPlayersInfo[allSutableIdes[0]] = temp;
        allSutableIdes.RemoveAt(0);
    }



    private void FindEnemy()
    {
        var playerInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/getEnemyMatrix").Length + 1));
        Server.MatrixData? returnedMatrixData = JsonSerializer.Deserialize<Server.MatrixData>(playerInfo);

        Array.Copy(returnedMatrixData.fieldMatrix, AllPlayersInfo[returnedMatrixData.playerId].fieldMatrix
                    , returnedMatrixData.fieldMatrix.Length);


        Server.PlayerContent temp = AllPlayersInfo[returnedMatrixData.playerId];
        temp.playerSocket = client;
        AllPlayersInfo[returnedMatrixData.playerId] = temp;


        if (waiterId == -1)
        {
            waiterId = returnedMatrixData.playerId;
            newClientConnected += () => GetSendMatrix(waiterId, AllPlayersInfo[waiterId].playerSocket);

            watingTimer.Start();
        }
        else
        {
            watingTimer.Stop();
            watingTimer.Dispose();

            newClientConnected?.Invoke();
            newClientConnected -= () => GetSendMatrix(waiterId, AllPlayersInfo[waiterId].playerSocket);

            GetSendMatrix(returnedMatrixData.playerId, AllPlayersInfo[returnedMatrixData.playerId].playerSocket, waiterId);
            waiterId = -1;
        }
    }



    private void GetSendMatrix(int playerId, Socket currentClient, int freePlayerId = -1)
    {
        Server.PlayerContent freePlayer = new Server.PlayerContent();
        Server.PlayerContent temp = AllPlayersInfo[playerId];

        temp.lastActionTimer = new Timer(20000);
        // temp.lastActionTimer.Elapsed += (Object source, ElapsedEventArgs e) => RemovePlayer(playerId);
        temp.lastActionTimer.Start();

        if (freePlayerId == -1)
        {
            for (int i = 0; i < AllPlayersInfo.Length; i++)
            {
                if (!AllPlayersInfo[i].Equals(default(Server.PlayerContent)) && i != playerId && AllPlayersInfo[i].enemyIndex == -1)
                {
                    freePlayer = AllPlayersInfo[i];
                    freePlayerId = i;

                    temp.enemyIndex = i;
                    AllPlayersInfo[playerId] = temp;
                    break;
                }
            }
        }
        else
        {
            freePlayer = AllPlayersInfo[freePlayerId];

            temp.enemyIndex = freePlayerId;
            AllPlayersInfo[playerId] = temp;
        }
        SendSomeData(new Server.MatrixData() { playerId = freePlayerId, fieldMatrix = freePlayer.fieldMatrix }, currentClient);
        currentClient.Close();


        for (int i = 0; i < AllPlayersInfo.Length; i++)
        {
            if (!AllPlayersInfo[i].Equals(default(Server.PlayerContent)))
            {
                Console.WriteLine($"{i}:   {AllPlayersInfo[i].enemyIndex}");
            }
        }


        for (int y = 0; y < AllPlayersInfo[playerId].fieldMatrix.Length; y++)
        {
            for (int x = 0; x < AllPlayersInfo[playerId].fieldMatrix[y].Length; x++)
            {
                Console.Write(AllPlayersInfo[playerId].fieldMatrix[y][x]);
            }
            Console.WriteLine();
        }
    }



    private void GetMoveNumber()
    {
        var playerInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/getMoveNumber").Length + 1));
        Server.CurrentPlayerIndex? playerIndex = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerInfo);

        if (playerIndex.currentPlayerIndex < AllPlayersInfo[playerIndex.currentPlayerIndex].enemyIndex)
        {
            SendSomeData(new Server.MoveNumber() { moveNumber = 1 }, client);
        }
        else
        {
            SendSomeData(new Server.MoveNumber() { moveNumber = 2 }, client);
        }
    }



    private static void RemovePlayer(int playerId)
    {
        for (int i = 0; i < AllPlayersInfo.Length; i++)
            Console.WriteLine(AllPlayersInfo[i].enemyIndex);
        Console.WriteLine();


        AllPlayersInfo[playerId] = default(Server.PlayerContent);
        allSutableIdes.Add(playerId);


        for (int i = 0; i < AllPlayersInfo.Length; i++)
            Console.WriteLine(AllPlayersInfo[i].enemyIndex);
    }



    public static void SendBot()
    {
        Socket clientSocket = Server.AllPlayersInfo[waiterId].playerSocket;
        SendSomeData(new Server.MatrixData() { playerId = -2 }, clientSocket);

        watingTimer.Stop();
        watingTimer.Dispose();
        RemovePlayer(waiterId);
        waiterId = -1;
    }



    private void GetClickedCell()
    {
        var cellInfo = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/clickedCellByMe").Length + 1));
        Server.CellData? returnedCellData = JsonSerializer.Deserialize<Server.CellData>(cellInfo);

        var temp = AllPlayersInfo[returnedCellData.playerId];
        temp.y = returnedCellData.y;
        temp.x = returnedCellData.x;
        AllPlayersInfo[returnedCellData.playerId] = temp;

        Console.WriteLine(temp.y);
        Console.WriteLine(temp.x);

        SendSomeData(new Server.SuccessFulOperation() { success = 1 }, client);
        onsendCell?.Invoke();
        onsendCell -= () => SendClickedCell(temp.enemyIndex);
    }



    private void GetEnemyClickedCell()
    {
        var playerId = System.Web.HttpUtility.UrlDecode(Headers.File.Substring(("/content/WarShips/clickedCellByEnemy").Length + 1));
        Server.CurrentPlayerIndex? returnedId = JsonSerializer.Deserialize<Server.CurrentPlayerIndex>(playerId);

        int enemyId = AllPlayersInfo[returnedId.currentPlayerIndex].enemyIndex;
        var temp = AllPlayersInfo[enemyId];

        if (temp.y != -1)
        {
            SendSomeData(new Server.CellData() { playerId = enemyId, y = temp.y, x = temp.x }, client);
            temp.y = -1;
            temp.x = -1;
            client.Close();
        }
        else
        {
            onsendCell += () => SendClickedCell(returnedId.currentPlayerIndex);
            AllPlayersInfo[returnedId.currentPlayerIndex].playerSocket = client;
        }
    }

    private void SendClickedCell(int playerId)
    {
        var enemyId = AllPlayersInfo[playerId].enemyIndex;
        var temp = AllPlayersInfo[enemyId];

        if (temp.y != -1)
        {
            SendSomeData(new Server.CellData() { playerId = enemyId, y = temp.y, x = temp.x }, AllPlayersInfo[playerId].playerSocket);
            AllPlayersInfo[playerId].playerSocket.Close();
            temp.y = -1;
            temp.x = -1;
            AllPlayersInfo[enemyId] = temp;
        }
    }



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
