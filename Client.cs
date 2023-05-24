
namespace ServerConnection;

using System;
using System.IO;
using System.Text;
using System.Net.Sockets;
using System.Text.RegularExpressions;

using System.Text.Json;


class Client
{
    Socket client;
    HTTPHeaders Headers;


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
        }
        else if(Headers.File == "/content/WarShips/getPlayerId")
        {
            string jsonId = JsonSerializer.Serialize(new Server.CurrentPlayerIndex { currentPlayerIndex = Server.currentPlayerIndex });
            Server.currentPlayerIndex++;
            byte[] bytes = Encoding.UTF8.GetBytes(jsonId);

            SendFileHeader("json", bytes.Length);
            client.Send(bytes, bytes.Length, SocketFlags.None);
        }
        else if(Headers.File.Substring(0, ("/content/WarShips/getEnemyMatrix").Length) == "/content/WarShips/getEnemyMatrix")
        {
            var playerInfo = Headers.File.Substring(("/content/WarShips/getEnemyMatrix").Length - 1);
            using (StreamWriter writer = new StreamWriter(Server.onlineFilePath))
            {
                writer.WriteLine(playerInfo);
                writer.Close();
            }
        }
        else
        {
            SendError(404);
        }
    
        client.Close();
    }


    public void SendFileHeader(string contentType, long fileLength)
    {
        string headers = $"HTTP/1.1 200 OK\nContent-type: {contentType}\nContent-Length: {fileLength}\n\n";

        byte[] data = Encoding.UTF8.GetBytes(headers);
        client.Send(data, data.Length, SocketFlags.None);
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
