"""Add bounded unauthenticated ONVIF SOAP transport for one exact saved camera endpoint.
Requires integrate_field_camera_route_test.py first for host normalization / one-time DNS validation.
No scanning, redirects, saved-credential loading, media decode, playback, or recording.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(name,fn):
 p=ROOT/name;p.write_text(fn(p.read_text('utf-8')),encoding='utf-8',newline='\n')

def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('ONVIF-service integration anchor mismatch: '+a[:100])
 return s.replace(a,b,1)

BLOCK=r'''
    sealed class FieldCameraHttpResponse
    {
        internal int StatusCode; internal string ContentType; internal byte[] Body; internal string AddressFamily;
    }
    static string NormalizeFieldCameraPath(string value)
    {
        string path=(value??"").Trim();
        if (path.Length<1 || path.Length>400 || !path.StartsWith("/") || path.StartsWith("//") || path.IndexOfAny(new[]{' ','\t','\r','\n','?','#','@','\\'})>=0) throw new InvalidDataException("ONVIF service path is invalid.");
        return path;
    }
    static string NormalizeOnvifAction(string value)
    {
        string action=(value??"").Trim();
        if (action=="http://www.onvif.org/ver10/device/wsdl/GetCapabilities" || action=="http://www.onvif.org/ver10/media/wsdl/GetProfiles" || action=="http://www.onvif.org/ver10/media/wsdl/GetStreamUri") return action;
        throw new InvalidDataException("Unsupported ONVIF action.");
    }
    static TcpClient ConnectFieldCameraExact(string host,int port,int timeoutMs,out string family)
    {
        IPAddress[] addresses=ResolveFieldCameraHostOnce(host); DateTime deadline=DateTime.UtcNow.AddMilliseconds(timeoutMs); family=""; SocketException last=null;
        foreach(IPAddress address in addresses) {
            int remaining=(int)Math.Max(1,(deadline-DateTime.UtcNow).TotalMilliseconds); if (remaining<=1) break;
            TcpClient client=new TcpClient(address.AddressFamily); IAsyncResult pending=null;
            try {
                pending=client.BeginConnect(address,port,null,null);
                if (!pending.AsyncWaitHandle.WaitOne(remaining)) { client.Close(); continue; }
                client.EndConnect(pending);
                if (client.Connected) { family=address.AddressFamily==AddressFamily.InterNetworkV6?"IPv6":"IPv4";return client; }
            } catch (SocketException ex) { last=ex; client.Close(); }
            finally { if (pending!=null) try { pending.AsyncWaitHandle.Close(); } catch { } }
        }
        if (last!=null) throw last; throw new IOException("Camera endpoint did not answer before the timeout.");
    }
    static byte[] ReadFieldCameraHeader(Stream stream,int maximum)
    {
        using(MemoryStream output=new MemoryStream()) {
            int matched=0;
            while(output.Length<maximum) {
                int b=stream.ReadByte(); if (b<0) throw new InvalidDataException("Camera closed before HTTP headers completed."); output.WriteByte((byte)b);
                matched=(matched==0&&b==13)?1:(matched==1&&b==10)?2:(matched==2&&b==13)?3:(matched==3&&b==10)?4:(b==13?1:0);
                if (matched==4) return output.ToArray();
            }
        }
        throw new InvalidDataException("Camera HTTP headers are too large.");
    }
    static string ReadFieldCameraAsciiLine(Stream stream,int maximum)
    {
        using(MemoryStream output=new MemoryStream()) {
            while(output.Length<maximum) { int b=stream.ReadByte(); if(b<0)throw new EndOfStreamException(); if(b==10)break; if(b!=13)output.WriteByte((byte)b); }
            if(output.Length>=maximum)throw new InvalidDataException("Camera HTTP line is too large.");return Encoding.ASCII.GetString(output.ToArray());
        }
    }
    static byte[] ReadFieldCameraBytes(Stream stream,int length)
    {
        byte[] data=new byte[length];int offset=0;while(offset<length){int n=stream.Read(data,offset,length-offset);if(n<=0)throw new EndOfStreamException();offset+=n;}return data;
    }
    static byte[] ReadFieldCameraChunked(Stream stream,int maximum)
    {
        using(MemoryStream output=new MemoryStream()) {
            while(true) {
                string line=ReadFieldCameraAsciiLine(stream,128);int semi=line.IndexOf(';');if(semi>=0)line=line.Substring(0,semi);int size;
                if(!Int32.TryParse(line.Trim(),NumberStyles.AllowHexSpecifier,CultureInfo.InvariantCulture,out size)||size<0)throw new InvalidDataException("Invalid camera chunked response.");
                if(size==0){while(ReadFieldCameraAsciiLine(stream,4096).Length>0){}break;}
                if(output.Length+size>maximum)throw new InvalidDataException("ONVIF response exceeds the size limit.");byte[] part=ReadFieldCameraBytes(stream,size);output.Write(part,0,part.Length);if(ReadFieldCameraAsciiLine(stream,4).Length!=0)throw new InvalidDataException("Invalid camera chunk framing.");
            }
            return output.ToArray();
        }
    }
    static FieldCameraHttpResponse ReadFieldCameraHttpResponse(Stream stream,string family)
    {
        byte[] headerBytes=ReadFieldCameraHeader(stream,64*1024);string headerText=Encoding.ASCII.GetString(headerBytes);string[] lines=headerText.Split(new[]{"\r\n"},StringSplitOptions.None);
        if(lines.Length<1)throw new InvalidDataException("Camera HTTP response is invalid.");Match status=Regex.Match(lines[0],@"\AHTTP/1\.[01]\s+(\d{3})\b");if(!status.Success)throw new InvalidDataException("Camera HTTP status line is invalid.");int statusCode=Int32.Parse(status.Groups[1].Value,CultureInfo.InvariantCulture);
        Dictionary<string,string> headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        for(int i=1;i<lines.Length;i++){string line=lines[i];if(line.Length==0)break;int colon=line.IndexOf(':');if(colon<=0)throw new InvalidDataException("Camera HTTP header is invalid.");string name=line.Substring(0,colon).Trim(),value=line.Substring(colon+1).Trim();if(name.Length>80||value.Length>8192)throw new InvalidDataException("Camera HTTP header is too large.");if(headers.ContainsKey(name))headers[name]=headers[name]+","+value;else headers[name]=value;}
        string encoding;if(headers.TryGetValue("Content-Encoding",out encoding)&&!String.IsNullOrWhiteSpace(encoding)&&!String.Equals(encoding,"identity",StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Compressed ONVIF responses are not accepted.");
        const int maximum=1024*1024;byte[] body;string transfer;
        if(headers.TryGetValue("Transfer-Encoding",out transfer)) {
            if(!String.Equals(transfer,"chunked",StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Unsupported camera transfer encoding.");body=ReadFieldCameraChunked(stream,maximum);
        } else { string lengthValue; if(headers.TryGetValue("Content-Length",out lengthValue)) { int length;if(!Int32.TryParse(lengthValue,NumberStyles.None,CultureInfo.InvariantCulture,out length)||length<0||length>maximum)throw new InvalidDataException("ONVIF response size is invalid.");body=ReadFieldCameraBytes(stream,length); }
          else using(MemoryStream output=new MemoryStream()){byte[] buffer=new byte[8192];int n;while((n=stream.Read(buffer,0,buffer.Length))>0){if(output.Length+n>maximum)throw new InvalidDataException("ONVIF response exceeds the size limit.");output.Write(buffer,0,n);}body=output.ToArray();} }
        string contentType="";headers.TryGetValue("Content-Type",out contentType);return new FieldCameraHttpResponse{StatusCode=statusCode,ContentType=contentType??"",Body=body,AddressFamily=family};
    }
    static FieldCameraHttpResponse SendFieldCameraOnvif(string host,string scheme,int port,string path,string action,byte[] soap,int timeoutMs)
    {
        string family;using(TcpClient client=ConnectFieldCameraExact(host,port,timeoutMs,out family)) {
            Stream transport=client.GetStream();transport.ReadTimeout=timeoutMs;transport.WriteTimeout=timeoutMs;
            if(scheme=="https") {
                System.Net.Security.SslStream ssl=new System.Net.Security.SslStream(transport,false,delegate(object sender,System.Security.Cryptography.X509Certificates.X509Certificate cert,System.Security.Cryptography.X509Certificates.X509Chain chain,System.Net.Security.SslPolicyErrors errors){return errors==System.Net.Security.SslPolicyErrors.None;});
                ssl.ReadTimeout=timeoutMs;ssl.WriteTimeout=timeoutMs;ssl.AuthenticateAsClient(host);transport=ssl;
            }
            string displayHost=host.IndexOf(':')>=0?"["+host+"]":host;bool defaultPort=(scheme=="http"&&port==80)||(scheme=="https"&&port==443);string hostHeader=displayHost+(defaultPort?"":":"+port.ToString(CultureInfo.InvariantCulture));
            string request="POST "+path+" HTTP/1.1\r\nHost: "+hostHeader+"\r\nContent-Type: application/soap+xml; charset=utf-8; action=\""+action+"\"\r\nSOAPAction: \""+action+"\"\r\nAccept: application/soap+xml, application/xml, text/xml\r\nContent-Length: "+soap.Length.ToString(CultureInfo.InvariantCulture)+"\r\nConnection: close\r\nUser-Agent: AtlasCommand/1.1\r\n\r\n";
            byte[] head=Encoding.ASCII.GetBytes(request);transport.Write(head,0,head.Length);transport.Write(soap,0,soap.Length);transport.Flush();return ReadFieldCameraHttpResponse(transport,family);
        }
    }
    static void HandleFieldCameraOnvifTest(NetworkStream stream,Dictionary<string,string> headers,byte[] body)
    {
        RequireType(headers,"application/json");Dictionary<string,object> j=Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>;if(j==null)throw new InvalidDataException("Invalid ONVIF test request.");
        object raw;if(!j.TryGetValue("profileId",out raw)||!(raw is string))throw new InvalidDataException("Camera profile is required.");string id=((string)raw).Trim();if(!Regex.IsMatch(id,@"\Acam-[A-Za-z0-9-]{1,90}\z"))throw new InvalidDataException("Invalid camera profile identifier.");
        if(!j.TryGetValue("host",out raw)||!(raw is string))throw new InvalidDataException("Camera address is required.");string host=NormalizeFieldCameraHost((string)raw),saved=NormalizeFieldCameraHost(CameraProfileHost(id));if(!String.Equals(host,saved,StringComparison.Ordinal))throw new InvalidDataException("Camera address changed. Reopen the saved profile before testing.");
        if(!j.TryGetValue("scheme",out raw)||!(raw is string))throw new InvalidDataException("ONVIF scheme is required.");string scheme=((string)raw).Trim().ToLowerInvariant();if(scheme!="http"&&scheme!="https")throw new InvalidDataException("ONVIF test requires HTTP or HTTPS.");
        if(!j.TryGetValue("port",out raw))throw new InvalidDataException("ONVIF port is required.");int port;if(!Int32.TryParse(Convert.ToString(raw,CultureInfo.InvariantCulture),NumberStyles.None,CultureInfo.InvariantCulture,out port)||port<1||port>65535)throw new InvalidDataException("ONVIF port must be between 1 and 65535.");
        if(!j.TryGetValue("path",out raw)||!(raw is string))throw new InvalidDataException("ONVIF path is required.");string path=NormalizeFieldCameraPath((string)raw);
        if(!j.TryGetValue("action",out raw)||!(raw is string))throw new InvalidDataException("ONVIF action is required.");string action=NormalizeOnvifAction((string)raw);
        if(!j.TryGetValue("soap",out raw)||!(raw is string))throw new InvalidDataException("ONVIF request body is required.");string soapText=(string)raw;if(soapText.Length<40||soapText.Length>64*1024||soapText.IndexOf("<s:Envelope",StringComparison.Ordinal)<0||soapText.IndexOf("UsernameToken",StringComparison.OrdinalIgnoreCase)>=0||soapText.IndexOf("Password",StringComparison.OrdinalIgnoreCase)>=0)throw new InvalidDataException("ONVIF request body is invalid for unauthenticated testing.");byte[] soap=Utf8.GetBytes(soapText);
        int timeoutMs=5000;if(j.TryGetValue("timeoutMs",out raw)&&(!Int32.TryParse(Convert.ToString(raw,CultureInfo.InvariantCulture),NumberStyles.None,CultureInfo.InvariantCulture,out timeoutMs)||timeoutMs<1000||timeoutMs>8000))throw new InvalidDataException("ONVIF timeout must be between 1000 and 8000 ms.");
        FieldCameraHttpResponse response=SendFieldCameraOnvif(host,scheme,port,path,action,soap,timeoutMs);bool auth=response.StatusCode==401||response.StatusCode==403,redirect=response.StatusCode>=300&&response.StatusCode<400;
        if(redirect)throw new InvalidDataException("ONVIF redirects are not followed. Save the camera's exact service endpoint instead.");string xml="";if(response.Body!=null&&response.Body.Length>0){string ct=response.ContentType.ToLowerInvariant();if(ct.Contains("xml")||ct.Contains("soap"))xml=Utf8.GetString(response.Body);}
        Dictionary<string,object> result=new Dictionary<string,object>();result["ok"]=response.StatusCode>=200&&response.StatusCode<300;result["statusCode"]=response.StatusCode;result["authRequired"]=auth;result["contentType"]=response.ContentType;result["xml"]=xml;result["addressFamily"]=response.AddressFamily;result["scanNetwork"]=false;result["redirectsFollowed"]=false;result["credentialsUsed"]=false;result["testedAt"]=DateTime.UtcNow.ToString("o");SendJson(stream,Json().Serialize(result));
    }
'''

def native(s):
 marker='    static string FindEdge()\n'
 if 'static void HandleFieldCameraOnvifTest' not in s:
  if marker not in s:raise RuntimeError('ONVIF service function anchor missing')
  s=s.replace(marker,BLOCK+'\n'+marker,1)
 router='            if (rel == "api/field-camera-test/route") {'
 route='            if (rel == "api/field-camera-test/onvif") { if (method != "POST") { Error(stream,405,"ONVIF testing requires an explicit local action"); return; } HandleFieldCameraOnvifTest(stream,headers,body); return; }\n'
 if route not in s:
  if s.count(router)!=1:raise RuntimeError('ONVIF service API anchor missing')
  s=s.replace(router,route+router,1)
 return s
edit('native/AtlasHost.cs',native)
print('Integrated bounded same-host ONVIF SOAP service transport. No redirects, saved credentials, playback or recording.')
