    // Fixed USGS JPEG adapter. Never accepts a URL, credentials, or a LAN camera address.
    static readonly object CameraLock = new object();
    static readonly Dictionary<string,CameraFrame> CameraFrames = new Dictionary<string,CameraFrame>();
    static readonly Dictionary<string,DateTime> CameraAttempts = new Dictionary<string,DateTime>();
    sealed class CameraFrame { internal byte[] Bytes; internal DateTime Fetched; internal string Modified; }
    static bool CameraConsent()
    {
        lock (DataLock) {
            if (!File.Exists(StatePath)) return false;
            Dictionary<string,object> root = Json().DeserializeObject(File.ReadAllText(StatePath,Utf8)) as Dictionary<string,object>;
            object value;
            if (root == null || !root.TryGetValue("settings",out value)) return false;
            Dictionary<string,object> settings = value as Dictionary<string,object>;
            if (settings == null || !settings.TryGetValue("cameraDesk",out value)) return false;
            Dictionary<string,object> cameras = value as Dictionary<string,object>;
            return cameras != null && cameras.TryGetValue("connectSnapshots",out value) && value is bool && (bool)value;
        }
    }
    static void SendCamera(NetworkStream stream, string id)
    {
        if (id != "K2cam" && id != "F1cam" && id != "V1cam") { Error(stream,404,"Unregistered camera source"); return; }
        if (!CameraConsent()) { lock(CameraLock) { CameraFrames.Clear(); } Error(stream,403,"Camera connection consent is off"); return; }
        if (!Monitor.TryEnter(CameraLock)) { Error(stream,429,"Another camera request is in progress"); return; }
        try {
            CameraFrame frame; DateTime now = DateTime.UtcNow, attempted;
            if (!CameraFrames.TryGetValue(id,out frame) || (now-frame.Fetched).TotalSeconds>=60) {
                if (CameraAttempts.TryGetValue(id,out attempted) && (now-attempted).TotalSeconds<20) { Error(stream,429,"Camera refresh limit; retry later"); return; }
                CameraAttempts[id]=now;
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create("https://volcanoes.usgs.gov/observatories/hvo/cams/"+id+"/images/M.jpg");
                request.Method="GET";request.AllowAutoRedirect=false;request.Timeout=12000;request.ReadWriteTimeout=12000;
                request.UseDefaultCredentials=false;request.Credentials=null;request.CookieContainer=null;
                request.UserAgent="AtlasCommand/1.1 (personal public webcam viewer)";request.Accept="image/jpeg";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) {
                    if (response.StatusCode!=HttpStatusCode.OK || !String.Equals(response.ContentType.Split(';')[0],"image/jpeg",StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Camera source did not return a JPEG");
                    const int maximum = 5*1024*1024;
                    if (response.ContentLength>maximum) throw new InvalidDataException("Camera response exceeds the size limit");
                    byte[] bytes;
                    using (Stream input=response.GetResponseStream()) using (MemoryStream output=new MemoryStream()) {
                        byte[] buffer=new byte[16384];int n;
                        while ((n=input.Read(buffer,0,buffer.Length))>0) {
                            if (Stopping || output.Length+n>maximum || (DateTime.UtcNow-now).TotalSeconds>15) throw new InvalidDataException("Camera request interrupted or too large");
                            output.Write(buffer,0,n);
                        }
                        bytes=output.ToArray();
                    }
                    if (bytes.Length<4 || bytes[0]!=255 || bytes[1]!=216 || bytes[2]!=255) throw new InvalidDataException("Camera image signature is invalid");
                    DateTime modified;string stamp="";
                    if (DateTime.TryParse(response.Headers["Last-Modified"],CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal,out modified)) stamp=modified.ToUniversalTime().ToString("o");
                    frame=new CameraFrame {Bytes=bytes,Fetched=DateTime.UtcNow,Modified=stamp};
                }
                // Consent may have been removed while the request was in flight.
                if (!CameraConsent()) { CameraFrames.Clear(); Error(stream,403,"Camera connections were disabled"); return; }
                CameraFrames[id]=frame;
            }
            string extra="X-Atlas-Camera-Fetched-At: "+frame.Fetched.ToString("o")+"\r\n";
            if (!String.IsNullOrEmpty(frame.Modified)) extra+="X-Atlas-Camera-Modified: "+frame.Modified+"\r\n";
            Headers(stream,200,"image/jpeg",frame.Bytes.Length,extra);stream.Write(frame.Bytes,0,frame.Bytes.Length);
        } catch (WebException) { Error(stream,503,"Public camera source unavailable; no image substituted"); }
          catch (InvalidDataException) { Error(stream,503,"Public camera response could not be used"); }
        finally { Monitor.Exit(CameraLock); }
    }
