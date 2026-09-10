"""Add the first deliberate private-camera network action: one exact saved endpoint TCP reachability test.
No LAN scan, no port range, no credentials, no ONVIF SOAP, no playback, no recording.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(name,fn):
 p=ROOT/name
 p.write_text(fn(p.read_text('utf-8')),encoding='utf-8',newline='\n')

def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Route-test integration anchor mismatch: '+a[:100])
 return s.replace(a,b,1)

def insert_before_once(s,anchor,item):
 if item in s:return s
 if s.count(anchor)!=1:raise RuntimeError('Route-test asset anchor mismatch: '+anchor[:100])
 return s.replace(anchor,item+anchor,1)

for p in ['app/index.html','app/workspace-preview.html']:
 edit(p,lambda s:insert_before_once(s,'<script src="src/ui-directions.js"></script>','<script src="src/field-camera-test.js"></script>'))

BLOCK=r'''
    static string NormalizeFieldCameraHost(string value)
    {
        string host=(value??"").Trim();
        if (host.Length<1 || host.Length>253 || host.IndexOfAny(new[]{' ','\t','\r','\n','/','@','?','#','\\'})>=0) throw new InvalidDataException("Camera address is invalid.");
        if (host.StartsWith("[") && host.EndsWith("]") && host.Length>2) host=host.Substring(1,host.Length-2);
        return host.ToLowerInvariant();
    }
    static bool UnsafeCameraAddress(IPAddress address)
    {
        if (address==null || IPAddress.IsLoopback(address) || address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any) || address.Equals(IPAddress.None) || address.Equals(IPAddress.IPv6None) || address.IsIPv6Multicast) return true;
        byte[] b=address.GetAddressBytes();
        if (address.AddressFamily==AddressFamily.InterNetwork && (b[0]>=224 || (b[0]==255&&b[1]==255&&b[2]==255&&b[3]==255))) return true;
        return false;
    }
    static IPAddress[] ResolveFieldCameraHostOnce(string host)
    {
        IPAddress literal;
        IPAddress[] raw=IPAddress.TryParse(host,out literal)?new[]{literal}:Dns.GetHostAddresses(host);
        if (raw==null || raw.Length<1 || raw.Length>16) throw new InvalidDataException("Camera address did not resolve to a bounded endpoint set.");
        List<IPAddress> usable=new List<IPAddress>(); HashSet<string> seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(IPAddress address in raw) {
            if (address.AddressFamily!=AddressFamily.InterNetwork && address.AddressFamily!=AddressFamily.InterNetworkV6) continue;
            if (UnsafeCameraAddress(address)) continue;
            string key=address.ToString(); if (seen.Add(key)) usable.Add(address);
            if (usable.Count>8) throw new InvalidDataException("Camera address resolved to too many endpoints.");
        }
        if (usable.Count<1) throw new InvalidDataException("Camera address resolved only to unsupported local or multicast endpoints.");
        return usable.ToArray();
    }
    static bool TryFieldCameraTcp(string host,int port,int timeoutMs,out string family,out int resolvedCount,out string reason)
    {
        family="";resolvedCount=0;reason="unreachable";IPAddress[] addresses;
        try { addresses=ResolveFieldCameraHostOnce(host); resolvedCount=addresses.Length; }
        catch (SocketException) { reason="dns-failed"; return false; }
        DateTime deadline=DateTime.UtcNow.AddMilliseconds(timeoutMs);
        foreach(IPAddress address in addresses) {
            int remaining=(int)Math.Max(1,(deadline-DateTime.UtcNow).TotalMilliseconds); if (remaining<=1) { reason="timeout"; break; }
            using(TcpClient client=new TcpClient(address.AddressFamily)) {
                IAsyncResult pending=null;
                try {
                    pending=client.BeginConnect(address,port,null,null);
                    if (!pending.AsyncWaitHandle.WaitOne(remaining)) { reason="timeout"; continue; }
                    client.EndConnect(pending);
                    if (client.Connected) { family=address.AddressFamily==AddressFamily.InterNetworkV6?"IPv6":"IPv4";reason="reachable";return true; }
                } catch (SocketException ex) {
                    reason=ex.SocketErrorCode==SocketError.ConnectionRefused?"refused":ex.SocketErrorCode==SocketError.TimedOut?"timeout":"unreachable";
                } finally { if (pending!=null) try { pending.AsyncWaitHandle.Close(); } catch { } }
            }
        }
        return false;
    }
    static void HandleFieldCameraRouteTest(NetworkStream stream,Dictionary<string,string> headers,byte[] body)
    {
        RequireType(headers,"application/json");
        Dictionary<string,object> j=Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>;
        if (j==null) throw new InvalidDataException("Invalid camera test request.");
        object raw; if (!j.TryGetValue("profileId",out raw) || !(raw is string)) throw new InvalidDataException("Camera profile is required.");
        string id=((string)raw).Trim(); if (!Regex.IsMatch(id,@"\Acam-[A-Za-z0-9-]{1,90}\z")) throw new InvalidDataException("Invalid camera profile identifier.");
        if (!j.TryGetValue("host",out raw) || !(raw is string)) throw new InvalidDataException("Camera address is required.");
        string host=NormalizeFieldCameraHost((string)raw),current=NormalizeFieldCameraHost(CameraProfileHost(id));
        if (!String.Equals(host,current,StringComparison.Ordinal)) throw new InvalidDataException("Camera address changed. Reopen the saved profile before testing.");
        if (!j.TryGetValue("port",out raw)) throw new InvalidDataException("Camera port is required.");
        int port; if (!Int32.TryParse(Convert.ToString(raw,CultureInfo.InvariantCulture),NumberStyles.None,CultureInfo.InvariantCulture,out port) || port<1 || port>65535) throw new InvalidDataException("Camera port must be between 1 and 65535.");
        int timeoutMs=4000;
        if (j.TryGetValue("timeoutMs",out raw) && (!Int32.TryParse(Convert.ToString(raw,CultureInfo.InvariantCulture),NumberStyles.None,CultureInfo.InvariantCulture,out timeoutMs) || timeoutMs<1000 || timeoutMs>5000)) throw new InvalidDataException("Camera test timeout must be between 1000 and 5000 ms.");
        string family,reason;int resolved;bool reachable=TryFieldCameraTcp(host,port,timeoutMs,out family,out resolved,out reason);
        Dictionary<string,object> result=new Dictionary<string,object>();
        result["reachable"]=reachable;result["port"]=port;result["addressFamily"]=family;result["resolutionCount"]=resolved;result["reason"]=reason;result["testedAt"]=DateTime.UtcNow.ToString("o");result["scanNetwork"]=false;result["credentialsUsed"]=false;
        SendJson(stream,Json().Serialize(result));
    }
'''

def native(s):
 marker='    static string FindEdge()\n'
 if 'static void HandleFieldCameraRouteTest' not in s:
  if marker not in s:raise RuntimeError('Native route-test function anchor missing')
  s=s.replace(marker,BLOCK+'\n'+marker,1)
 router='            if (rel.StartsWith("api/field-camera-credentials/",StringComparison.Ordinal)) {'
 route='            if (rel == "api/field-camera-test/route") { if (method != "POST") { Error(stream,405,"Camera testing requires an explicit local action"); return; } HandleFieldCameraRouteTest(stream,headers,body); return; }\n'
 if route not in s:
  if s.count(router)!=1:raise RuntimeError('Native route-test API anchor missing')
  s=s.replace(router,route+router,1)
 allow='rel == "src/ui-refinement.css" ||'
 addition='rel == "src/ui-refinement.css" || rel == "src/field-camera-test.js" ||'
 if 'rel == "src/field-camera-test.js"' not in s:
  if s.count(allow)!=1:raise RuntimeError('Native route-test asset allowlist anchor missing')
  s=s.replace(allow,addition,1)
 return s

edit('native/AtlasHost.cs',native)

def build(s):
 asset="'src/field-camera-test.js'"
 if asset in s:return s
 anchor="'src/ui-refinement.css'"
 if s.count(anchor)!=1:raise RuntimeError('Build route-test asset anchor missing')
 return s.replace(anchor,anchor+','+asset,1)
edit('build/Build-Store.ps1',build)
print('Integrated deliberate exact saved-endpoint camera route test and UI. No scanning, credentials, ONVIF SOAP, playback or recording.')
