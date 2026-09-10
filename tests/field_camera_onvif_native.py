"""Functional ONVIF HTTP transport test on a disposable Windows runner.
Synthetic same-host HTTP fixtures only. No real camera, credentials, discovery scan, media decode, playback, or recording.
"""
import json, os, shutil, socket, threading
from pathlib import Path
from windows_native_smoke import NativeSmoke

PROFILE_ID='cam-onvif-fixture'
ACTION='http://www.onvif.org/ver10/device/wsdl/GetCapabilities'
SOAP='<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><tds:GetCapabilities xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Category>Media</tds:Category></tds:GetCapabilities></s:Body></s:Envelope>'
XML='<?xml version="1.0"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><tds:GetCapabilitiesResponse xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Capabilities><tt:Media xmlns:tt="http://www.onvif.org/ver10/schema"><tt:XAddr>http://CAMERA/onvif/media_service</tt:XAddr></tt:Media></tds:Capabilities></tds:GetCapabilitiesResponse></s:Body></s:Envelope>'

def private_ipv4():
    probe=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    try:
        probe.connect(('8.8.8.8',53));ip=probe.getsockname()[0]
    except OSError:
        ip=socket.gethostbyname(socket.gethostname())
    finally: probe.close()
    if ip.startswith('127.') or ip=='0.0.0.0':raise RuntimeError('No usable non-loopback fixture address.')
    return ip

def initial_state(host):
    return {'schemaVersion':1,'sites':[],'settings':{'fieldCameras':{'schemaVersion':1,'revision':1,'profiles':[{
        'id':PROFILE_ID,'name':'Synthetic ONVIF fixture','host':host,'location':'Disposable Windows runner',
        'mode':'local','method':'undecided','deployment':'planned','tags':[],'revision':1,
        'createdAt':'2026-09-10T00:00:00.000Z','updatedAt':'2026-09-10T00:00:00.000Z'}]}},'queue':[],'layout':{},'plan':{}}

def serve_once(ip,status=200,body=None,extra_headers=None):
    server=socket.socket(socket.AF_INET,socket.SOCK_STREAM);server.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);server.bind((ip,0));server.listen(1);server.settimeout(10);port=server.getsockname()[1];observed={}
    def worker():
        try:
            conn,addr=server.accept();conn.settimeout(5);data=b''
            while b'\r\n\r\n' not in data and len(data)<65536:
                part=conn.recv(4096)
                if not part:break
                data+=part
            head,_,rest=data.partition(b'\r\n\r\n');text=head.decode('ascii','replace');lines=text.split('\r\n');observed['request_line']=lines[0] if lines else '';headers={}
            for line in lines[1:]:
                if ':' in line:
                    k,v=line.split(':',1);headers[k.strip().lower()]=v.strip()
            length=int(headers.get('content-length','0'));payload=rest
            while len(payload)<length:payload+=conn.recv(min(4096,length-len(payload)))
            observed['headers']=headers;observed['body']=payload[:length].decode('utf-8','replace');observed['peer']=addr[0]
            response_body=(body if body is not None else XML.replace('CAMERA',ip)).encode('utf-8')
            reason={200:'OK',401:'Unauthorized',302:'Found'}.get(status,'Status')
            h={'Content-Type':'application/soap+xml; charset=utf-8','Content-Length':str(len(response_body)),'Connection':'close'}
            if extra_headers:h.update(extra_headers)
            wire='HTTP/1.1 %d %s\r\n%s\r\n\r\n'%(status,reason,'\r\n'.join(k+': '+v for k,v in h.items()))
            conn.sendall(wire.encode('ascii')+response_body);conn.close()
        finally:
            try:server.close()
            except OSError:pass
    t=threading.Thread(target=worker,daemon=True);t.start();return port,t,observed

def call(atlas,host,port):
    payload={'profileId':PROFILE_ID,'host':host,'scheme':'http','port':port,'path':'/onvif/device_service','action':ACTION,'soap':SOAP,'timeoutMs':4000}
    return atlas.request('POST','api/field-camera-test/onvif',body=json.dumps(payload).encode('utf-8'),headers={'Content-Type':'application/json','X-Atlas-Request':'local'})

def main():
    if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable GitHub Windows runner required.')
    exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):raise RuntimeError('Temporary executable required.')
    appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
    if appdata.exists():raise RuntimeError('Refusing existing Atlas workspace.')
    atlas=NativeSmoke(exe,appdata,temp)
    try:
        ip=private_ipv4();atlas.start();atlas.save(initial_state(ip))
        port,t,seen=serve_once(ip,200);status,_,raw=call(atlas,ip,port);t.join(6)
        assert status==200,status;result=json.loads(raw);assert result['ok'] is True and result['statusCode']==200,result
        assert result['authRequired'] is False and result['credentialsUsed'] is False and result['scanNetwork'] is False,result
        assert 'GetCapabilitiesResponse' in result['xml'] and result['redirectsFollowed'] is False,result
        assert seen.get('peer')==ip and seen.get('request_line')=='POST /onvif/device_service HTTP/1.1',seen
        assert ACTION in seen.get('headers',{}).get('soapaction','') and 'UsernameToken' not in seen.get('body',''),seen
        print('PASS: native ONVIF service transport reaches only the saved same-host fixture and returns bounded XML',flush=True)
        port,t,_=serve_once(ip,401,body='');status,_,raw=call(atlas,ip,port);t.join(6);assert status==200,status;result=json.loads(raw)
        assert result['ok'] is False and result['authRequired'] is True and result['statusCode']==401,result
        print('PASS: ONVIF authentication requirement is reported without inventing connectivity or using credentials',flush=True)
        port,t,_=serve_once(ip,302,body='',extra_headers={'Location':'http://example.invalid/onvif'});status,_,_=call(atlas,ip,port);t.join(6)
        assert status==400,status
        print('PASS: ONVIF redirects are refused instead of following a different endpoint',flush=True)
        return 0
    finally:
        try:atlas.stop()
        except Exception:pass
        shutil.rmtree(appdata,ignore_errors=True)

if __name__=='__main__':raise SystemExit(main())
