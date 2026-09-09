// Atlas Command -- Store-preparation source. Build on an authorized Windows build runner only.
// No external dependencies. All app traffic stays on an ephemeral loopback port.
// Store submission preparation is not security clearance. Do not expose this server to a network.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class AtlasHost
{
    const int MaxJson = 16 * 1024 * 1024;
    const int MaxMedia = 25 * 1024 * 1024;
    static readonly object DataLock = new object();
    static readonly object LogLock = new object();
    static readonly SemaphoreSlim Clients = new SemaphoreSlim(16, 16);
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
    static string Root, AppData, DataDir, MediaDir, StatePath, Prefix, Authority, Origin;
    static string LogPath;
    static TcpListener Listener;
    static volatile bool Stopping;
    static long LastHeartbeat = DateTime.UtcNow.Ticks;
    static readonly Dictionary<string,string> MediaTypes = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase) {
        {".png","image/png"},{".jpg","image/jpeg"},{".jpeg","image/jpeg"},{".webp","image/webp"},
        {".mp4","video/mp4"},{".webm","video/webm"},{".pdf","application/pdf"}
    };
    const string CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    [STAThread]
    static void Main()
    {
        Mutex mutex = null;
        bool owned = false;
        try {
            Root = AppDomain.CurrentDomain.BaseDirectory;
            AppData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AtlasCommand");
            Directory.CreateDirectory(AppData);
            LogPath = Path.Combine(AppData, "host.log");
            string mutexName = "Local\\AtlasCommand-" + Regex.Replace(Environment.UserName, "[^A-Za-z0-9_-]", "_");
            mutex = new Mutex(false, mutexName);
            try { owned = mutex.WaitOne(0, false); } catch (AbandonedMutexException) { owned = true; }
            if (!owned) {
                MessageBox.Show("Atlas Command is already running. Return to its window. After closing the window, its local helper stops within five minutes. Use Settings > Stop local app to stop it immediately.", "Atlas Command", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            if (!File.Exists(Path.Combine(Root, "index.html"))) throw new Exception("An installed application file is missing. Repair the installed app through Windows; do not run the old batch launcher.");
            string edge = FindEdge();
            if (edge == null) throw new Exception("Microsoft Edge was not found in a standard location. This build requires Microsoft Edge. Ask your administrator to review this prerequisite; do not bypass endpoint policy. No runtime has been installed or downloaded.");
            DataDir = Path.Combine(AppData, "Data");
            MediaDir = Path.Combine(DataDir, "media");
            StatePath = Path.Combine(DataDir, "workspace.json");
            Directory.CreateDirectory(MediaDir);
            Listener = new TcpListener(IPAddress.Loopback, 0);
            Listener.Start(16);
            int port = ((IPEndPoint)Listener.LocalEndpoint).Port;
            Prefix = "/" + Guid.NewGuid().ToString("N") + "/";
            Authority = "127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture);
            Origin = "http://" + Authority;
            string url = Origin + Prefix + "index.html";
            string profile = Path.Combine(AppData, "Browser");
            ProcessStartInfo start = new ProcessStartInfo(edge,
                "--app=\"" + url + "\" --user-data-dir=\"" + profile + "\" --no-first-run --no-default-browser-check --window-size=1600,1000");
            start.UseShellExecute = false;
            Process.Start(start);
            Log("Started local host; Development 1.1. No online feed or updater is installed.");
            while (!Stopping) {
                if (new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes > 5) break;
                if (!Listener.Pending()) { Thread.Sleep(50); continue; }
                TcpClient client = Listener.AcceptTcpClient();
                if (!Clients.Wait(0)) { client.Close(); continue; }
                ThreadPool.QueueUserWorkItem(delegate(object unused) {
                    try { Handle(client); } catch (Exception ex) { Log("Request error: " + ex.GetType().Name + ": " + ex.Message); }
                    finally { client.Close(); Clients.Release(); }
                });
            }
            Listener.Stop();
            Log("Local host stopped.");
        } catch (Exception ex) {
            Log("Startup error: " + ex.ToString());
            MessageBox.Show(ex.Message + "\n\nLog: " + (LogPath ?? "Unable to create log"), "Atlas Command could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
        } finally {
            if (Listener != null) try { Listener.Stop(); } catch { }
            if (owned && mutex != null) mutex.ReleaseMutex();
            if (mutex != null) mutex.Close();
        }
    }

    static string FindEdge()
    {
        string[] bases = { Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) };
        foreach (string b in bases) { if (String.IsNullOrEmpty(b)) continue; string p = Path.Combine(b, "Microsoft", "Edge", "Application", "msedge.exe"); if (File.Exists(p)) return p; }
        return null;
    }
    static void Log(string message)
    {
        try { if (LogPath == null) return; lock (LogLock) { if (File.Exists(LogPath) && new FileInfo(LogPath).Length > 1024*1024) File.Move(LogPath, LogPath + "." + DateTime.UtcNow.ToString("yyyyMMddHHmmss") + ".old"); File.AppendAllText(LogPath, DateTime.UtcNow.ToString("o") + " " + message + Environment.NewLine, new UTF8Encoding(false)); } } catch { }
    }
    static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = MaxJson, RecursionLimit = 64 }; }
    static string ReadLine(NetworkStream s, ref int total)
    {
        MemoryStream b = new MemoryStream(); int c;
        while ((c = s.ReadByte()) != -1) {
            if (++total > 32768) throw new InvalidDataException("HTTP headers exceed 32 KB.");
            if (c == 10) break;
            if (c != 13) b.WriteByte((byte)c);
        }
        if (c == -1 && b.Length == 0) return null;
        return Encoding.ASCII.GetString(b.ToArray());
    }
    static void Handle(TcpClient client)
    {
        client.ReceiveTimeout = 15000; client.SendTimeout = 15000;
        NetworkStream stream = client.GetStream(); int headerBytes = 0;
        string first = ReadLine(stream, ref headerBytes);
        if (first == null) return;
        string[] parts = first.Split(' ');
        if (parts.Length != 3 || (parts[0] != "GET" && parts[0] != "HEAD" && parts[0] != "POST")) { Error(stream, 405, "Method not allowed"); return; }
        string method = parts[0], requestPath = parts[1];
        Dictionary<string,string> headers = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        string line;
        while (!String.IsNullOrEmpty(line = ReadLine(stream, ref headerBytes))) {
            int i = line.IndexOf(':');
            if (i <= 0) { Error(stream,400,"Invalid header"); return; }
            string k = line.Substring(0,i).Trim();
            if (headers.ContainsKey(k)) { Error(stream,400,"Duplicate header"); return; }
            headers[k] = line.Substring(i+1).Trim();
        }
        string host;
        if (!headers.TryGetValue("Host",out host) || !String.Equals(host,Authority,StringComparison.Ordinal)) { Error(stream,403,"Local host only"); return; }
        if (!requestPath.StartsWith(Prefix,StringComparison.Ordinal)) { Error(stream,404,"Not found"); return; }
        string origin;
        if (headers.TryGetValue("Origin",out origin) && origin != Origin) { Error(stream,403,"Cross-origin request refused"); return; }
        string fetchSite;
        if (headers.TryGetValue("Sec-Fetch-Site", out fetchSite) && fetchSite != "same-origin" && fetchSite != "none") { Error(stream,403,"Cross-site request refused"); return; }
        if (headers.ContainsKey("Transfer-Encoding")) { Error(stream,400,"Chunked requests are not accepted"); return; }
        string rel;
        try { rel = Uri.UnescapeDataString(requestPath.Substring(Prefix.Length).Split('?')[0]); }
        catch { Error(stream,400,"Bad path"); return; }
        if (rel.IndexOf('\\') >= 0 || rel.IndexOf(':') >= 0 || rel.IndexOf('\0') >= 0 || rel.StartsWith("/") || rel.Contains("..")) { Error(stream,403,"Invalid path"); return; }
        if (method == "POST") {
            string referrer;
            bool samePage = headers.TryGetValue("Referer", out referrer) && referrer.StartsWith(Origin + Prefix, StringComparison.Ordinal);
            string requested;
            bool localHeader = headers.TryGetValue("X-Atlas-Request",out requested) && requested == "local";
            // sendBeacon during close cannot set a custom header; it must still have a same-origin initiator.
            if (!localHeader && !(rel == "api/state" && (origin == Origin || samePage))) { Error(stream,403,"Local action header required"); return; }
        }
        Interlocked.Exchange(ref LastHeartbeat, DateTime.UtcNow.Ticks);
        int length = 0; string contentLength;
        if (headers.TryGetValue("Content-Length",out contentLength) && (!Int32.TryParse(contentLength,out length) || length < 0)) { Error(stream,400,"Invalid length"); return; }
        int limit = rel.StartsWith("api/media/",StringComparison.Ordinal) ? MaxMedia : MaxJson;
        if (length > limit) { Error(stream,413,"File is too large"); return; }
        byte[] body = new byte[length];
        for (int offset = 0; offset < body.Length;) { int n = stream.Read(body,offset,body.Length-offset); if (n <= 0) throw new EndOfStreamException(); offset += n; }
        bool head = method == "HEAD";
        try {
            if (rel == "api/heartbeat" && method == "GET") { SendJson(stream,"{\"ok\":true}"); return; }
            if (rel == "api/state") {
                if (method == "GET") {
                    lock (DataLock) {
                        string text = File.Exists(StatePath) ? File.ReadAllText(StatePath,Utf8) : "null";
                        if (text != "null") ValidateState(text);
                        SendJson(stream,text);
                    }
                    return;
                }
                if (method == "POST") {
                    RequireType(headers,"application/json"); string text = Utf8.GetString(body); ValidateState(text);
                    lock (DataLock) { SaveAtomic(text); }
                    SendJson(stream,"{\"ok\":true}"); return;
                }
            }
            if (rel.StartsWith("api/media/", StringComparison.Ordinal)) {
                string key = rel.Substring("api/media/".Length); string file = MediaPath(key); string mime = MediaTypes[Path.GetExtension(key)];
                if (method == "POST") {
                    RequireType(headers,mime);
                    if (body.Length == 0) throw new InvalidDataException("Empty media file.");
                    using (FileStream f = new FileStream(file,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { f.Write(body,0,body.Length); f.Flush(true); }
                    SendJson(stream,"{\"ok\":true}"); return;
                }
                if (method == "GET" || head) { SendFile(stream,file,mime,headers,head); return; }
            }
            if (rel == "api/open-media" && method == "POST") {
                RequireType(headers,"application/json");
                Dictionary<string,object> j = Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>;
                if (j == null || !j.ContainsKey("key")) throw new InvalidDataException("Missing media key.");
                string file = MediaPath(Convert.ToString(j["key"],CultureInfo.InvariantCulture));
                if (Path.GetExtension(file).ToLowerInvariant() != ".pdf" || !File.Exists(file)) throw new InvalidDataException("Only attached PDF files can be opened externally.");
                Process.Start(new ProcessStartInfo(file) { UseShellExecute = true }); SendJson(stream,"{\"ok\":true}"); return;
            }
            if (rel == "api/data-folder" && method == "POST") {
                Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe"),"\""+DataDir+"\"") { UseShellExecute=false }); SendJson(stream,"{\"ok\":true}"); return;
            }
            if (rel == "api/exit" && method == "POST") { SendJson(stream,"{\"ok\":true}"); Stopping = true; return; }
            if (rel.StartsWith("api/",StringComparison.Ordinal)) { Error(stream,404,"Unknown local API"); return; }
            if (method != "GET" && !head) { Error(stream,405,"Method not allowed"); return; }
            if (rel == "") rel = "index.html";
            // Serve the renderer only, never source/host files, data-folder backups, or directory listings.
            bool allowed = rel == "index.html" || rel == "src/app.js" || rel == "src/core.js" || rel == "src/globe.js" || rel == "src/styles.css" || rel == "src/next-ui.css" || rel == "src/workspace-layout.js" || rel == "src/weather-units.js" || rel == "src/lidar.js" || rel == "assets/world.js" || rel == "assets/icon.svg" || rel == "data/seed.js";
            string ext = Path.GetExtension(rel).ToLowerInvariant();
            string type = ext == ".html" ? "text/html; charset=utf-8" : ext == ".js" ? "text/javascript; charset=utf-8" : ext == ".css" ? "text/css; charset=utf-8" : ext == ".svg" ? "image/svg+xml" : "";
            if (!allowed || type == "") { Error(stream,404,"Not found"); return; }
            string path = Path.GetFullPath(Path.Combine(Root,rel.Replace('/',Path.DirectorySeparatorChar)));
            if (!path.StartsWith(Root,StringComparison.OrdinalIgnoreCase)) { Error(stream,403,"Invalid path"); return; }
            SendFile(stream,path,type,headers,head);
        } catch (Exception ex) {
            Log("Local action failed: " + ex.GetType().Name + ": " + ex.Message);
            Error(stream,400,"Local action failed: " + ex.Message + ". Existing data has not been deleted. See host.log.");
        }
    }
    static void RequireType(Dictionary<string,string> headers, string expected)
    {
        string value;
        if (!headers.TryGetValue("Content-Type",out value) || !String.Equals(value.Split(';')[0].Trim(),expected,StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Unsupported content type.");
    }
    static string MediaPath(string key)
    {
        if (!Regex.IsMatch(key ?? "", @"\A[a-fA-F0-9-]{36}\.(png|jpg|jpeg|webp|mp4|webm|pdf)\z",RegexOptions.IgnoreCase)) throw new InvalidDataException("Invalid media key.");
        return Path.Combine(MediaDir,key);
    }
    static void ValidateState(string text)
    {
        Dictionary<string,object> state = Json().DeserializeObject(text) as Dictionary<string,object>;
        if (state == null || !state.ContainsKey("schemaVersion") || Convert.ToInt32(state["schemaVersion"],CultureInfo.InvariantCulture) != 1) throw new InvalidDataException("Unsupported workspace schema.");
        object raw; if (!state.TryGetValue("sites",out raw) || !(raw is object[])) throw new InvalidDataException("Workspace sites must be an array.");
        object[] sites = (object[])raw;
        if (sites.Length > 5000) throw new InvalidDataException("Prototype limit: 5,000 records.");
        HashSet<string> ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (object value in sites) {
            Dictionary<string,object> s = value as Dictionary<string,object>;
            if (s == null || !s.ContainsKey("name") || !s.ContainsKey("id") || !s.ContainsKey("lat") || !s.ContainsKey("lon")) throw new InvalidDataException("Incomplete site record.");
            string name = Convert.ToString(s["name"],CultureInfo.InvariantCulture), id = Convert.ToString(s["id"],CultureInfo.InvariantCulture);
            if (String.IsNullOrWhiteSpace(name) || name.Length > 240 || String.IsNullOrEmpty(id) || !ids.Add(id)) throw new InvalidDataException("Invalid or repeated site identifier.");
            if (s["lat"] == null || s["lon"] == null) throw new InvalidDataException("Coordinates cannot be null.");
            double lat = Convert.ToDouble(s["lat"],CultureInfo.InvariantCulture), lon = Convert.ToDouble(s["lon"],CultureInfo.InvariantCulture);
            if (Double.IsNaN(lat) || Double.IsInfinity(lat) || lat < -90 || lat > 90 || Double.IsNaN(lon) || Double.IsInfinity(lon) || lon < -180 || lon > 180) throw new InvalidDataException("Invalid coordinates.");
        }
    }
    static void SaveAtomic(string text)
    {
        string temp = StatePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try {
            byte[] bytes = Utf8.GetBytes(text);
            using (FileStream f = new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { f.Write(bytes,0,bytes.Length); f.Flush(true); }
            if (File.Exists(StatePath)) {
                // Keep a last-good daily snapshot plus the immediately preceding committed state.
                string daily = Path.Combine(DataDir,"backup-"+DateTime.UtcNow.ToString("yyyy-MM-dd")+".json");
                if (!File.Exists(daily)) File.Copy(StatePath,daily,false);
                File.Replace(temp,StatePath,StatePath+".bak",true);
            } else File.Move(temp,StatePath);
        } finally { if (File.Exists(temp)) try { File.Delete(temp); } catch { } }
    }
    static void SendJson(NetworkStream stream, string json) { byte[] bytes = Utf8.GetBytes(json); Headers(stream,200,"application/json; charset=utf-8",bytes.Length,""); stream.Write(bytes,0,bytes.Length); }
    static void Error(NetworkStream stream, int status, string message) { byte[] bytes = Utf8.GetBytes(message); Headers(stream,status,"text/plain; charset=utf-8",bytes.Length,""); stream.Write(bytes,0,bytes.Length); }
    static void Headers(NetworkStream stream, int status, string type, long length, string extra)
    {
        string reason = status == 200 ? "OK" : status == 206 ? "Partial Content" : status == 404 ? "Not Found" : status == 403 ? "Forbidden" : status == 413 ? "Payload Too Large" : status == 416 ? "Range Not Satisfiable" : "Bad Request";
        string value = "HTTP/1.1 "+status+" "+reason+"\r\nContent-Type: "+type+"\r\nContent-Length: "+length+"\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: "+CSP+"\r\n"+extra+"\r\n";
        byte[] b = Encoding.ASCII.GetBytes(value); stream.Write(b,0,b.Length);
    }
    static void SendFile(NetworkStream stream, string path, string type, Dictionary<string,string> request, bool head)
    {
        if (!File.Exists(path)) { Error(stream,404,"File not found"); return; }
        using (FileStream f = new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.Read)) {
            long start=0, end=f.Length-1; int status=200; string extra="Accept-Ranges: bytes\r\n"; string range;
            if (request.TryGetValue("Range",out range)) {
                Match m=Regex.Match(range,@"\Abytes=(\d*)-(\d*)\z");
                if (!m.Success || (m.Groups[1].Value=="" && m.Groups[2].Value=="")) { Error(stream,416,"Unsupported range"); return; }
                if (m.Groups[1].Value=="") { long suffix; if (!Int64.TryParse(m.Groups[2].Value,out suffix) || suffix<=0) { Error(stream,416,"Invalid range");return; } start=Math.Max(0,f.Length-suffix); }
                else { if (!Int64.TryParse(m.Groups[1].Value,out start)) { Error(stream,416,"Invalid range");return; } if(m.Groups[2].Value!="" && !Int64.TryParse(m.Groups[2].Value,out end)) { Error(stream,416,"Invalid range");return; } }
                end=Math.Min(end,f.Length-1);
                if(start<0 || start>=f.Length || end<start) { Error(stream,416,"Invalid range");return; }
                status=206;extra+="Content-Range: bytes "+start+"-"+end+"/"+f.Length+"\r\n";
            }
            long length=Math.Max(0,end-start+1); Headers(stream,status,type,length,extra); if(head)return;
            f.Position=start; byte[] buffer=new byte[65536]; long remaining=length;
            while(remaining>0) { int n=f.Read(buffer,0,(int)Math.Min(buffer.Length,remaining));if(n==0)break;stream.Write(buffer,0,n);remaining-=n; }
        }
    }
}
