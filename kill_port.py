"""
用法: python kill_port.py <port>
杀掉占用指定端口的所有进程
"""
import subprocess, os, signal, sys

if len(sys.argv) < 2:
    print("用法: python kill_port.py <port>")
    sys.exit(1)

port = int(sys.argv[1])

if os.name == 'nt' or 'WINDIR' in os.environ:
    result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
    pids = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 5 and f':{port}' in parts[1] and parts[3] == 'LISTENING':
            pids.add(parts[4].strip())
    if pids:
        for pid in pids:
            # /T 连同子进程一起杀，解决 uvicorn --reload fork 子进程的问题
            r = subprocess.run(['taskkill', '/F', '/T', '/PID', pid], capture_output=True, text=True)
        print('ok')
    else:
        print('not_running')
else:
    result = subprocess.run(['lsof', '-ti', f'tcp:{port}'], capture_output=True, text=True)
    pids = result.stdout.strip().splitlines()
    if pids:
        for pid in pids:
            try:
                os.kill(int(pid), signal.SIGKILL)
            except:
                pass
        print('ok')
    else:
        print('not_running')
