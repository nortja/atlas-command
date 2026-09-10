"""Functional exact-endpoint private-camera route test on a disposable Windows runner.
Uses a synthetic TCP listener bound to the runner's own non-loopback address. No real camera,
credentials, LAN scan, ONVIF SOAP, media, or recording is involved.
"""
import json, os, shutil, socket, threading, time
from pathlib import Path
from windows_native_smoke import NativeSmoke


def private_ipv4():
    probe=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    try:
        probe.connect(('8.8.8.8',53))
        ip=probe.getsockname()[0]
    except OSError:
        ip=socket.gethostbyname(socket.gethostname())
    finally:
        probe.close()
    if ip.startswith('127.') or ip=='0.0.0.0':
        raise RuntimeError('Disposable runner did not expose a usable non-loopback IPv4 address.')
    return ip


def profile_state(base,host):
    state=json.loads(json.dumps(base))
    settings=state.setdefault('settings',{})
    settings['fieldCameras']={'schemaVersion':1,'revision':1,'profiles':[{
        'id':'cam-route-fixture','name':'Synthetic route fixture','host':host,
        'location':'Disposable Windows runner','mode':'local','method':'undecided',
        'deployment':'planned','tags':[],'revision':1,
        'createdAt':'2026-09-10T00:00:00.000Z','updatedAt':'2026-09-10T00:00:00.000Z'
    }]}
    return state


def call(host,profile_host,port,timeout=2500):
    payload={'profileId':'cam-route-fixture','host':profile_host,'port':port,'timeoutMs':timeout}
    status,_,body=host.request('POST','api/field-camera-test/route',
        body=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type':'application/json','X-Atlas-Request':'local'})
    if status!=200:
        raise AssertionError('Expected route-test HTTP 200; received '+str(status))
    return json.loads(body)


def main():
    if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
        raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
    exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):raise RuntimeError('Temporary executable required.')
    appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
    if appdata.exists():raise RuntimeError('Refusing existing Atlas workspace.')
    atlas=NativeSmoke(exe,appdata,temp);server=None;accepted=[]
    try:
        ip=private_ipv4();server=socket.socket(socket.AF_INET,socket.SOCK_STREAM);server.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);server.bind((ip,0));server.listen(1);server.settimeout(8);port=server.getsockname()[1]
        def accept_once():
            try:
                conn,addr=server.accept();accepted.append(addr[0]);conn.close()
            except OSError:pass
        thread=threading.Thread(target=accept_once,daemon=True);thread.start()
        atlas.start();base=atlas.read_state();atlas.save(profile_state(base,ip))
        result=call(atlas,ip,port)
        thread.join(5)
        assert result['reachable'] is True,result
        assert result['port']==port and result['scanNetwork'] is False and result['credentialsUsed'] is False,result
        assert result['addressFamily']=='IPv4' and 1<=result['resolutionCount']<=8,result
        assert accepted and accepted[0]==ip,accepted
        print('PASS: exact saved camera endpoint is reachable through the native route-test API',flush=True)
        server.close();server=None;time.sleep(.15)
        result=call(atlas,ip,port,1500)
        assert result['reachable'] is False,result
        assert result['reason'] in ('refused','timeout','unreachable'),result
        assert result['scanNetwork'] is False and result['credentialsUsed'] is False,result
        print('PASS: closed endpoint remains a truthful non-live failure without scanning or credentials',flush=True)
        changed=dict(profile_state(atlas.read_state(),ip));changed['settings']['fieldCameras']['profiles'][0]['host']='192.0.2.77';atlas.save(changed)
        status,_,_=atlas.request('POST','api/field-camera-test/route',body=json.dumps({'profileId':'cam-route-fixture','host':ip,'port':port,'timeoutMs':1000}).encode('utf-8'),headers={'Content-Type':'application/json','X-Atlas-Request':'local'})
        assert status==400,status
        print('PASS: address changes invalidate stale route-test requests before any connection attempt',flush=True)
        return 0
    finally:
        if server is not None:
            try:server.close()
            except OSError:pass
        try:atlas.stop()
        except Exception:pass
        shutil.rmtree(appdata,ignore_errors=True)

if __name__=='__main__':raise SystemExit(main())
