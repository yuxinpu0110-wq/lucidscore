"""Archive current working files and the verified portable ZIP without Git mutation."""
import hashlib,json,pathlib,subprocess,zipfile,datetime,shutil,sys
root=pathlib.Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
if version!='1.0.0': raise SystemExit('This baseline command is scoped to v1.0.0')
destination=root/'backups'/'v1.0-2026-11-12'
if destination.exists(): raise SystemExit('Backup already exists; refusing to overwrite it')
portable=root/'release'/f'LucidScore-v{version}-windows-x64.zip'
if not portable.is_file(): raise SystemExit('Build and verify the portable ZIP first')
def digest(file):
    h=hashlib.sha256()
    with open(file,'rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
expected=pathlib.Path(str(portable)+'.sha256').read_text().split()[0]
if digest(portable)!=expected:raise SystemExit('Portable checksum mismatch')
receipt=json.loads((root/'tmp'/f'portable-verification-v{version}.json').read_text(encoding='utf-8'))
if receipt.get('result')!='passed' or receipt.get('archiveSHA256')!=expected:raise SystemExit('Portable validation receipt missing or stale')
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode('utf-8').split('\0')
files=[]
for name in sorted(set(filter(None,names))):
    path=root/name
    if not path.exists():continue # tracked deletion in the current working tree
    parts=pathlib.PurePosixPath(name).parts
    excluded={'node_modules','tmp','dist','backups','.git','.local','.codex','.agents','.aws','.claude'}
    if any(part.lower() in excluded or part.lower() in {'agent.md','agents.md','project_overview.md'} or part.lower().startswith(('context','webui_agent','.env')) for part in parts):raise SystemExit('Excluded working file: '+name)
    if name in {'docs/PROGRESS.md','docs/DECISIONS.md','docs/WEBUI_DESIGN.md'}:raise SystemExit('Internal working record: '+name)
    if name.startswith('release/LucidScore-') or name.startswith('release/cache/'):raise SystemExit('Generated distribution in source list: '+name)
    if path.is_symlink() or not path.is_file():raise SystemExit('Unexpected source entry: '+name)
    files.append((name,path))
if not any(name=='src/MeasureLiquidLens.tsx' for name,_ in files):raise SystemExit('Source files missing')
destination.mkdir(parents=True)
created=datetime.datetime.now(datetime.timezone.utc).isoformat()
prefix=f'LucidScore-v{version}-source'
source_zip=destination/(prefix+'.zip')
inventory=[]
with zipfile.ZipFile(source_zip,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,path in files:
        item={'path':name,'bytes':path.stat().st_size,'sha256':digest(path)};inventory.append(item)
        archive.write(path,prefix+'/'+name)
    archive.writestr(prefix+'/SOURCE_SNAPSHOT.json',json.dumps({'application':'LucidScore','version':version,'createdAt':created,'snapshot':'current-working-tree','gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'files':inventory},ensure_ascii=False,indent=2)+'\n')
print(f'Source archive written: {len(inventory)} current files',flush=True)
# Verify every archived source against its recorded hash, including edited files.
with zipfile.ZipFile(source_zip) as archive:
    if len(archive.infolist())!=len(inventory)+1:raise SystemExit('Source inventory count mismatch')
    for entry in inventory:
        h=hashlib.sha256()
        with archive.open(prefix+'/'+entry['path']) as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
        if h.hexdigest()!=entry['sha256']:raise SystemExit('Source archive verification failed: '+entry['path'])
target=destination/portable.name
shutil.copy2(portable,target)
if digest(target)!=expected:raise SystemExit('Copied portable verification failed')
packages=[]
for file in [source_zip,target]:
    sha=digest(file);pathlib.Path(str(file)+'.sha256').write_text(f'{sha}  {file.name}\n',encoding='ascii')
    packages.append({'file':file.name,'bytes':file.stat().st_size,'sha256':sha})
manifest={'application':'LucidScore','version':'v1.0','packageVersion':version,'createdAt':created,'scope':'local baseline before v2 development','gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceSnapshot':'current-working-tree including uncommitted changes','sourceFiles':len(inventory),'verification':['77 unit tests','TypeScript and production build','all movement score motion including second/third system intermediate positions','portable ZIP fully extracted, file hashes, bundled runtime, audio, score, lyrics, narrow layout'],'packages':packages,'excluded':['agent/agents/webui_agent/context working records','secrets and local configuration','dependencies, temporary services and build caches'],'published':False}
(destination/'BACKUP.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(destination/'PORTABLE_VERIFICATION.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(destination/'README.md').write_text('# LucidScore v1.0 本地备份\n\nWindows便携包：完整解压 windows-x64.zip 后双击 START.cmd。\n\n源码快照：source.zip 包含封存时工作区的全部产品文件及未提交修改。恢复到新目录后安装 Node 24、npm 与 FFmpeg，运行 npm ci、npm run dev。\n\n每个ZIP附有SHA-256，详情见 BACKUP.json；PowerShell可用 Get-FileHash -Algorithm SHA256 文件路径 核对。\n\n备份不包含 agent/context 等工作记录，也没有上传GitHub。后续在原工作区继续v2.0开发，不修改本归档。\n',encoding='utf-8')
print(json.dumps({'backup':str(destination),'sourceFiles':len(inventory),'packages':packages},ensure_ascii=False,indent=2),flush=True)
