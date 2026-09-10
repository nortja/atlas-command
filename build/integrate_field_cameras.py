"""Integrate private camera profile UI plus Windows-protected credential storage.
No camera transport, scanning, recording, install, signing or Store publication.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
 p=ROOT/name;p.write_text(fn(p.read_text('utf-8')),encoding='utf-8',newline='\n')
def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Camera integration anchor mismatch: '+a[:90])
 return s.replace(a,b,1)
def insert_before_once(s,anchor,items):
 if s.count(anchor)!=1:raise RuntimeError('Camera integration anchor mismatch: '+anchor[:90])
 missing=[x for x in items if x not in s]
 if not missing:return s
 return s.replace(anchor,''.join(missing)+anchor,1)
for p in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=insert_before_once(s,'</head>',[
   '<link rel="stylesheet" href="src/field-cameras.css">',
   '<link rel="stylesheet" href="src/field-camera-ux.css">'])
  s=insert_before_once(s,'<script src="src/ui-directions.js"></script>',[
   '<script src="src/field-cameras.js"></script>',
   '<script src="src/field-camera-diagnostics.js"></script>',
   '<script src="src/field-camera-onvif.js"></script>',
   '<script src="src/field-camera-transport.js"></script>',
   '<script src="src/field-camera-layout.js"></script>',
   '<script src="src/field-camera-recordings.js"></script>',
   '<script src="src/field-camera-desk.js"></script>',
   '<script src="src/field-camera-ux.js"></script>',
   '<script src="src/field-camera-auth.js"></script>'])
  return s
 edit(p,entry)
def app(s):
 s=once(s,'const appearancePreferences=','const fieldCameraProfiles=AtlasFieldCameras.store(()=>state.settings.fieldCameras,v=>{if(v===undefined)delete state.settings.fieldCameras;else state.settings.fieldCameras=v;},flush,()=>window.dispatchEvent(new Event("atlas:field-cameras-changed")));\nconst appearancePreferences=')
 s=once(s,' version:1,storageMode:', ' fieldCameras:fieldCameraProfiles,\n version:1,storageMode:')
 s=once(s,"JSON.stringify(state,null,2),'application/json'","JSON.stringify(AtlasFieldCameras.shareableWorkspace(state),null,2),'application/json'")
 s=s.replace('JSON exchange exports site records, notes, plans and layouts. Media files are separate; copy the entire native Data folder for a complete backup.','JSON exchange exports site records, notes, plans and layouts, but excludes private IP-camera profiles. Media files are separate. Copy the entire native Data folder for a complete backup; it includes private camera locations and setup notes, but not Windows-protected camera passwords.')
 s=s.replace('Local records refreshed. No online feeds are connected.','Local records refreshed. Live data connections are controlled separately.')
 return s
edit('app/src/app.js',app)

def native(s):
 s=once(s,'using System.Net.Sockets;','using System.Net.Sockets;\nusing System.Security.Cryptography;')
 s=once(s,'static string Root, AppData, DataDir, MediaDir, StatePath, Prefix, Authority, Origin;','static string Root, AppData, DataDir, MediaDir, CredentialDir, StatePath, Prefix, Authority, Origin;')
 s=once(s,'MediaDir = Path.Combine(DataDir, "media");\n            StatePath = Path.Combine(DataDir, "workspace.json");\n            Directory.CreateDirectory(MediaDir);','MediaDir = Path.Combine(DataDir, "media");\n            CredentialDir = Path.Combine(AppData, "Credentials");\n            StatePath = Path.Combine(DataDir, "workspace.json");\n            Directory.CreateDirectory(MediaDir);\n            Directory.CreateDirectory(CredentialDir);')
 block=r'''
    sealed class CameraSecret
    {
        public int Version { get; set; }
        public string ProfileId { get; set; }
        public string Host { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
    }
    static string CameraCredentialPath(string profileId)
    {
        if (!Regex.IsMatch(profileId ?? "", @"\Acam-[A-Za-z0-9-]{1,90}\z")) throw new InvalidDataException("Invalid camera profile identifier.");
        return Path.Combine(CredentialDir, profileId + ".bin");
    }
    static string CameraProfileHost(string profileId)
    {
        lock (DataLock) {
            if (!File.Exists(StatePath)) throw new InvalidDataException("Save the camera profile before adding sign-in details.");
            Dictionary<string,object> root = Json().DeserializeObject(File.ReadAllText(StatePath,Utf8)) as Dictionary<string,object>;
            object value; if (root == null || !root.TryGetValue("settings",out value)) throw new InvalidDataException("Camera profile is unavailable.");
            Dictionary<string,object> settings = value as Dictionary<string,object>;
            if (settings == null || !settings.TryGetValue("fieldCameras",out value)) throw new InvalidDataException("Camera profile is unavailable.");
            Dictionary<string,object> cameras = value as Dictionary<string,object>;
            if (cameras == null || !cameras.TryGetValue("profiles",out value) || !(value is object[])) throw new InvalidDataException("Camera profile is unavailable.");
            foreach (object item in (object[])value) {
                Dictionary<string,object> p = item as Dictionary<string,object>; object id,host;
                if (p != null && p.TryGetValue("id",out id) && String.Equals(Convert.ToString(id,CultureInfo.InvariantCulture),profileId,StringComparison.Ordinal) && p.TryGetValue("host",out host))
                    return Convert.ToString(host,CultureInfo.InvariantCulture);
            }
        }
        throw new InvalidDataException("Camera profile is unavailable.");
    }
    static Dictionary<string,object> CredentialRequest(byte[] body)
    {
        Dictionary<string,object> j = Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>;
        if (j == null) throw new InvalidDataException("Invalid camera sign-in request.");
        return j;
    }
    static string RequiredCredentialText(Dictionary<string,object> j,string key,int max,bool allowEmpty=false)
    {
        object raw; if (!j.TryGetValue(key,out raw) || !(raw is string)) throw new InvalidDataException("Incomplete camera sign-in request.");
        string value=(string)raw; if ((!allowEmpty && String.IsNullOrWhiteSpace(value)) || value.Length>max || value.IndexOf('\0')>=0) throw new InvalidDataException("Camera sign-in field is invalid.");
        return key=="username" ? value.Trim() : value;
    }
    static CameraSecret ReadCameraSecret(string profileId)
    {
        string path=CameraCredentialPath(profileId); if (!File.Exists(path)) return null;
        byte[] cipher=File.ReadAllBytes(path); if (cipher.Length==0 || cipher.Length>16384) throw new InvalidDataException("Saved camera sign-in could not be read.");
        byte[] plain=null;
        try {
            plain=ProtectedData.Unprotect(cipher,null,DataProtectionScope.CurrentUser);
            CameraSecret secret=Json().Deserialize<CameraSecret>(Utf8.GetString(plain));
            if (secret==null || secret.Version!=1 || secret.ProfileId!=profileId || String.IsNullOrEmpty(secret.Host) || secret.Username==null || secret.Password==null) throw new InvalidDataException("Saved camera sign-in could not be read.");
            return secret;
        } catch (CryptographicException) { throw new InvalidDataException("Saved camera sign-in is not available to this Windows user."); }
        finally { if (plain!=null) Array.Clear(plain,0,plain.Length); Array.Clear(cipher,0,cipher.Length); }
    }
    static void WriteCameraSecret(CameraSecret secret)
    {
        byte[] plain=Utf8.GetBytes(Json().Serialize(secret)),cipher=null; string path=CameraCredentialPath(secret.ProfileId),temp=path+"."+Guid.NewGuid().ToString("N")+".tmp",old=path+".old";
        try {
            cipher=ProtectedData.Protect(plain,null,DataProtectionScope.CurrentUser);
            using (FileStream f=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { f.Write(cipher,0,cipher.Length); f.Flush(true); }
            if (File.Exists(path)) { if (File.Exists(old)) File.Delete(old); File.Replace(temp,path,old,true); if (File.Exists(old)) File.Delete(old); }
            else File.Move(temp,path);
        } finally { Array.Clear(plain,0,plain.Length); if (cipher!=null) Array.Clear(cipher,0,cipher.Length); if (File.Exists(temp)) try { File.Delete(temp); } catch { } if (File.Exists(old)) try { File.Delete(old); } catch { } }
    }
    static void SendCredentialStatus(NetworkStream stream,bool saved,string username="",bool needsUpdate=false)
    {
        Dictionary<string,object> result=new Dictionary<string,object>(); result["saved"]=saved; result["needsUpdate"]=needsUpdate; if (saved) result["username"]=username;
        SendJson(stream,Json().Serialize(result));
    }
    static void HandleCameraCredentials(NetworkStream stream,string action,Dictionary<string,string> headers,byte[] body)
    {
        RequireType(headers,"application/json"); Dictionary<string,object> j=CredentialRequest(body);
        string id=RequiredCredentialText(j,"profileId",100),host=RequiredCredentialText(j,"host",253); string currentHost=CameraProfileHost(id);
        if (!String.Equals(currentHost,host,StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Camera address changed. Reopen the current profile before using saved sign-in details.");
        if (action=="status") {
            CameraSecret secret=ReadCameraSecret(id); if (secret==null) { SendCredentialStatus(stream,false); return; }
            if (!String.Equals(secret.Host,currentHost,StringComparison.OrdinalIgnoreCase)) { SendCredentialStatus(stream,false,"",true); return; }
            SendCredentialStatus(stream,true,secret.Username); return;
        }
        if (action=="save") {
            string username=RequiredCredentialText(j,"username",160),password=RequiredCredentialText(j,"password",1024);
            WriteCameraSecret(new CameraSecret {Version=1,ProfileId=id,Host=currentHost,Username=username,Password=password});
            SendCredentialStatus(stream,true,username); return;
        }
        if (action=="forget") {
            string path=CameraCredentialPath(id); if (File.Exists(path)) File.Delete(path); SendCredentialStatus(stream,false); return;
        }
        throw new InvalidDataException("Unknown camera sign-in action.");
    }
'''
 marker='    static string FindEdge()\n'
 if 'sealed class CameraSecret' not in s:
  if marker not in s: raise RuntimeError('Native credential insertion anchor missing')
  s=s.replace(marker,block+'\n'+marker,1)
 s=once(s,'if (rel.StartsWith("api/media/", StringComparison.Ordinal)) {','if (rel.StartsWith("api/field-camera-credentials/",StringComparison.Ordinal)) { if (method != "POST") { Error(stream,405,"Camera sign-in actions require an explicit local action"); return; } HandleCameraCredentials(stream,rel.Substring("api/field-camera-credentials/".Length),headers,body); return; }\n            if (rel.StartsWith("api/media/", StringComparison.Ordinal)) {')
 allow='rel == "src/ui-refinement.css" ||'
 addition='rel == "src/ui-refinement.css" || rel == "src/field-cameras.js" || rel == "src/field-camera-diagnostics.js" || rel == "src/field-camera-onvif.js" || rel == "src/field-camera-transport.js" || rel == "src/field-camera-layout.js" || rel == "src/field-camera-recordings.js" || rel == "src/field-camera-desk.js" || rel == "src/field-cameras.css" || rel == "src/field-camera-ux.js" || rel == "src/field-camera-ux.css" || rel == "src/field-camera-auth.js" ||'
 s=once(s,allow,addition)
 return s
edit('native/AtlasHost.cs',native)

def build(s):
 anchor="'src/ui-refinement.css'"
 assets=['src/field-cameras.js','src/field-camera-diagnostics.js','src/field-camera-onvif.js','src/field-camera-transport.js','src/field-camera-layout.js','src/field-camera-recordings.js','src/field-camera-desk.js','src/field-cameras.css','src/field-camera-ux.js','src/field-camera-ux.css','src/field-camera-auth.js']
 if anchor not in s: raise RuntimeError('Build runtime allowlist anchor missing')
 missing=[a for a in assets if ("'"+a+"'") not in s]
 if missing:s=s.replace(anchor,anchor+','+','.join("'"+a+"'" for a in missing),1)
 s=s.replace('/reference:System.dll,System.Core.dll,System.Web.Extensions.dll,System.Windows.Forms.dll','/reference:System.dll,System.Core.dll,System.Security.dll,System.Web.Extensions.dll,System.Windows.Forms.dll')
 return s
edit('build/Build-Store.ps1',build)
print('Integrated camera profiles, diagnostics, ONVIF planning, exact-endpoint transport contract, live-view layout memory, recording metadata and Windows CurrentUser-protected credential vault. No private camera transport or playback yet.')
