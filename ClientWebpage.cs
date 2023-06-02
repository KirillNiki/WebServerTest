namespace ServerConnection;

using System.Net;
using System.Text;
using System.Text.RegularExpressions;

class GetWebPage
{
    private HttpListener httpSender;
    private HTTPHeaders Headers;
    private HttpListenerResponse response;
    private Stream output;



    public GetWebPage(HttpListener httpListener, HttpListenerContext context)
    {
        httpSender = httpListener;
        string request = context.Request.Url.ToString();

        response = context.Response;
        output = response.OutputStream;

        if (request == "")
            return;


        Headers = Parse(request);
        Console.WriteLine($"[{context.Request.RemoteEndPoint}]\nReal path: {Headers.RealPath}\nFile: {Headers.File}\nDate: {DateTime.Now}");

        if (Headers.RealPath.IndexOf("..") != -1)
        {
            SendError(404);
            return;
        }

        if (File.Exists(Headers.RealPath))
            GetSheet();
        else
            SendError(404);
    }




    public struct HTTPHeaders
    {
        public string RealPath;
        public string File;
    }


    public static HTTPHeaders Parse(string request)
    {
        HTTPHeaders result = new HTTPHeaders();
        string tempRequest = request.Substring(7);
        int slashIndex = tempRequest.IndexOf('/');

        result.File = tempRequest.Substring(slashIndex + 1);
        result.RealPath = $"{AppDomain.CurrentDomain.BaseDirectory}{result.File}";
        return result;
    }



    public async void SendError(int code)
    {
        string html = $"<html><head><title></title></head><body><h1>Error {code}</h1></body></html>";
        byte[] data = Encoding.UTF8.GetBytes(html);

        response.ContentLength64 = data.Length;
        response.ContentType = "text/html";
        response.StatusCode = code;

        await output.WriteAsync(data);
        await output.FlushAsync();
        output.Close();
    }



    public async void GetSheet()
    {
        try
        {
            string contentType = GetContentType();
            FileStream fs = new FileStream(Headers.RealPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            byte[] data = new byte[fs.Length];
            fs.Read(data, 0, data.Length);
            fs.Close();

            response.ContentType = contentType;
            response.StatusCode = (int) HttpStatusCode.OK;
            response.ContentLength64 = data.Length;
            Console.WriteLine(contentType);

            await output.WriteAsync(data);
            await output.FlushAsync();
            output.Close();
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