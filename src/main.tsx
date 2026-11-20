import {UiIcon} from './UiIcon';
import {PlayIcon} from './PlayerIcons';
import {mediaUrl} from './mediaUrl';
import {IntroPrologue,hasSeenPrologue} from './IntroPrologue';
import {flushSync} from 'react-dom';
import {MahlerAudioEngine} from './MahlerAudioEngine';
import {PlaybackClock} from './PlaybackClock';
import {PlaybackProgress} from './PlaybackProgress';
import {useStageView} from './useStageView';
import { ReviewDrawer } from './ReviewDrawer';
import { PlaybackBuffer } from './PlaybackBuffer';
import rawWebAudio from '../content/real/web-audio.json';
import { validateWebAudio } from './webAudio';
import { AudioReactiveEngine, type VisualState } from './AudioReactiveEngine';
import { fractionalBarAt } from './dawnProgress';
import { ListeningAtmosphere, PoeticClue } from './ListeningAtmosphere';
import React, { useEffect, useRef, useState, useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { validate, mapped, transition, type Context, type State, type Mode } from './model';
import demo from '../content/demo/catalog.json';
import real from '../content/real/catalog.json';
import './fonts.css';
import './style.css';
import './tokens.css';
import './webui.css';
import './stage.css';
import './mobile.css';
import './tour.css';
import './performance.css';
import './playerTheme.css';
import './highlightsLocal.css';
import './theatre.css';
import './morphing.css';
import './icons.css';
import { MovementSwitcher } from './MovementSwitcher';
import { Segmented } from './Segmented';
import { listeningLayers, type ListeningLayer } from './ListeningLayers';
import { CurrentScore } from './CurrentScore';
import { CurrentScorePages } from './CurrentScorePages';
import { LyricsPanel } from './LyricsPanel';
import { lyricsLibrary } from './lyricsLibrary';
import { validateLyricsSync, lyricAt } from './lyricsModel';
import rawLyricsSync from '../content/real/lyrics-sync.json';
import rawWorkSync from '../content/real/work-score-sync.json';
import { validateWorkSync } from './workScoreSync';
import { GuidePanel } from './GuidePanel';
import { authorGuideLibrary } from './guideLibrary';
import { ContentImport } from './ContentImport';
import rawContinuous from '../content/real/continuous-recording.json';
import { validateContinuous, continuousCatalog, continuousSync, continuousMeasures } from './continuousRecording';
import { validateGuides, guideAt, type GuideData } from './guideContent';
import { measureAt, measureIntervals } from './measureSyncModel';
import { Resources } from './Resources';
import rawDrafts from '../content/real/alignment-drafts.json';
import { validateDrafts, draftEvents } from './alignmentDrafts';
import rawScoreEvidence from '../content/real/score-observations.json';
import { validateScoreEvidence } from './scoreReview';
import { validReplay } from './replay';
import { ScoreSync } from './ScoreSync';
import { validateSync } from './scoreSyncModel';
import rawSync from '../content/real/score-sync.json';
import rawMeasures from '../content/real/measure-sync.json';
import rawMeasureResearch from '../content/real/measure-research.json';
import { validateMeasures, validateMeasureResearch } from './measureSyncModel';
import { normalizeWorkLocation } from './workRoute';
import {upgradeStorage} from './storageUpgrade';
import {readListeningQuery,listeningURL,type ListeningQuery} from './listeningQuery';
import {useCuratedTour} from './useCuratedTour';
import {TourBar} from './TourBar';
upgradeStorage();
normalizeWorkLocation();
window.addEventListener('popstate', normalizeWorkLocation);
const originalCatalog = validate(real);
const continuousRecording = validateContinuous(rawContinuous, originalCatalog);
const playbackCatalog = continuousCatalog(originalCatalog, continuousRecording);
import rawWorkMeasures from '../content/real/work-measure-sync.json';
import { validateWorkMeasures, workMeasureAt, workBarRange } from './workMeasureSync';
const webAudio = validateWebAudio(rawWebAudio, continuousRecording);
for(const t of playbackCatalog.tracks)t.url=mediaUrl(t.url);
for(const t of webAudio.tracks){t.url=mediaUrl(t.url);if(t.hls)t.hls.url=mediaUrl(t.hls.url)}
const workSync = validateWorkSync(rawWorkSync, playbackCatalog, 'sha256:' + rawScoreEvidence.pdfSHA256);
const workMeasures = validateWorkMeasures(rawWorkMeasures, playbackCatalog, workSync);
const lyricsSync = validateLyricsSync(rawLyricsSync, lyricsLibrary, playbackCatalog, workSync);
const names = ['Allegro maestoso', 'Andante moderato', 'In ruhig fließender Bewegung', 'Urlicht', 'Im Tempo des Scherzos'];
const fmt = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const profilePlayback=new URLSearchParams(location.search).has('profilePlayback');
const guideCounts=Object.fromEntries(Object.entries(authorGuideLibrary).map(([m,g])=>[m,g.guides.length]));
const initialQuery=readListeningQuery(location.search,guideCounts);
const tourEnabled=true;
const initialTour=tourEnabled&&new URLSearchParams(location.search).get('tour')==='highlights';
function App() {
    const [introOpen,IntroOpen]=useState(()=>!initialTour&&!initialQuery.hasSelection&&!hasSeenPrologue());
    const pendingFullPlay=useRef(false);
    const prologuePlay=useRef<()=>void>(()=>{});
    const [mobileLayout,SetMobileLayout]=useState(()=>matchMedia('(max-width:768px)').matches);
    useEffect(()=>{const query=matchMedia('(max-width:768px)'),changed=()=>SetMobileLayout(query.matches);query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed)},[]);
    if(profilePlayback)performance.mark('lucidscore.app.render');
    const clock=useMemo(()=>new PlaybackClock(),[]);
    const time=useSyncExternalStore(clock.subscribe,clock.getSnapshot);
    const T=clock.publish;
    const transport=useRef<MahlerAudioEngine|null>(null);
    const tickRef=useRef<()=>void>(()=>{});
    const [lyricLanguage,LyricLanguage]=useState('de-zh');
    const {viewMode,enterStage,returnToLobby}=useStageView(initialQuery.hasSelection?'stage':'lobby');
    const pendingLink=useRef<ListeningQuery|null>(initialQuery.hasSelection&&!initialTour?initialQuery:null);
    const [linkRevision,LinkRevision]=useState(0);
    const linkHandler=useRef<(q:ListeningQuery)=>void>(()=>{});
    const [kind, setKind] = useState<'demo' | 'real'>(real.tracks.length ? 'real' : 'demo');
    const data = useMemo(() => kind === 'demo' ? validate(demo) : playbackCatalog, [kind]);
    const draftData = useMemo(() => validateDrafts(rawDrafts, validate(real), validateScoreEvidence(rawScoreEvidence)), []);
    const originalSync = useMemo(() => validateSync(rawSync, originalCatalog, 'sha256:' + rawScoreEvidence.pdfSHA256), []);
    const syncData = useMemo(() => continuousSync(originalSync, continuousRecording), [originalSync]);
    const measureData = useMemo(() => continuousMeasures(validateMeasures(rawMeasures, originalCatalog, originalSync), continuousRecording), [originalSync]);
    const measureResearch = useMemo(() => validateMeasureResearch(rawMeasureResearch, measureData), [measureData]);
    const defaultGuideLibrary = useMemo<Record<number, GuideData>>(() => Object.fromEntries(Object.entries(authorGuideLibrary).map(([key, document]) => [key, validateGuides(document, measureData, measureResearch, document)])), [measureData, measureResearch]);
    const [guideOverrides, SetGuideOverrides] = useState<Record<number, GuideData>>({});
    const remainingDrafts = draftData.events.filter(e => !real.events.some(x => x.id === e.id));
    const [showDrafts, Drafts] = useState(false);
    const [movement, M] = useState(initialQuery.movement), [trackChoice, SelectTrack] = useState(''), [mode, Mode] = useState<Mode>(initialQuery.mode), [duration, D] = useState(60), [selected, S] = useState(''), [range, R] = useState<[
        number,
        number
    ]>([0, 8]), [loop, L] = useState(false), [tab, Tab] = useState<ListeningLayer>(initialQuery.tab), [pageBrowse, PageBrowse] = useState<string | null>(null), [barBrowse, BarBrowse] = useState<number | null>(initialQuery.hasSelection?authorGuideLibrary[initialQuery.movement].guides[initialQuery.section-1].from:null), [hidden, H] = useState(false), [history, Hist] = useState<string[]>([]), [stack, Stack] = useState<Context[]>([]), [error, Err] = useState(''), [bindings, B] = useState<Record<number, {
        url: string;
        id: string;
    }>>({}), [continuous, C] = useState(false), [loadedMedia, Loaded] = useState<{
        url: string;
        duration: number;
    } | null>(null);
    const pendingBarSeek = useRef<{
        movement: number;
        url: string;
        from: number;
        to: number;
        start: number;
        end: number;
    } | null>(null);
    const audio = useRef<HTMLAudioElement>(null);
    const reactive = useRef<AudioReactiveEngine | null>(null);
    const visualState = useRef<() => VisualState>(() => ({ movement: 0, playing: false, bar: null }));
    const state = useRef<State>({ panel: false, playing: false, dragging: false, resume: false });
    const [ui, U] = useState(state.current);
    const generation = useRef(0);
    const stopAt = useRef<number | null>(null);
    const continueNext = useRef(false);
    const auditionMode = useRef(false);
    const auditionOrigin = useRef<Context | null>(null);
    const pendingRestore = useRef<{
        context: Context;
        resume: boolean;
        url: string;
    } | null>(null);
    const defaultGuides = defaultGuideLibrary[movement];
    const guides = guideOverrides[movement] || defaultGuides;
    const [failedDelivery, FailedDelivery] = useState<Set<string>>(() => new Set());
    const binding = bindings[movement];
    const movementTracks = data.tracks.filter(t => t.movement === movement);
    const track = (binding ? movementTracks.find(t => t.fingerprint === binding.id) : movementTracks.find(t => t.id === trackChoice)) || movementTracks[0];
    const delivery = !binding && kind === 'real' && track && !failedDelivery.has(track.id) ? webAudio.tracks.find(t => t.trackId === track.id && t.sourceFingerprint === track.fingerprint) : undefined;
    const requestedTransport=new URLSearchParams(location.search).get('audio');
    const pagesProduction=import.meta.env.PROD&&import.meta.env.MODE!=='portable';
    const hlsRequested=pagesProduction||requestedTransport==='hls'||(requestedTransport!=='progressive'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname));
    const deliveryURL=(id:string)=>{const item=webAudio.tracks.find(t=>t.trackId===id);return (hlsRequested?item?.hls?.url:undefined)||item?.url};
    const url = binding?.url || (hlsRequested?delivery?.hls?.url:undefined) || delivery?.url || track?.url || '';
    const navigation = movement === 3 ? measureData : workMeasures[movement];
    const navigationFingerprint = kind === 'real' && loadedMedia?.url === url && track && Math.abs(loadedMedia.duration - track.duration) < .5 ? (binding?.id || track.fingerprint) : '';
    const canSeekGuides = kind === 'real' && !!track && !!navigationFingerprint && navigation.tracks.some(t => t.id === track.id && t.fingerprint === navigationFingerprint);
    const nextPart = movementTracks[movementTracks.findIndex(t => t.id === track?.id) + 1];
    const officialEvents = (!url || (kind === 'real' && (loadedMedia?.url !== url || !track || Math.abs(loadedMedia.duration - track.duration) > .5))) ? [] : mapped(data, movement, track?.recording || '', track?.id || '', binding?.id || track?.fingerprint || '', data.edition);
    const readyForDrafts = kind === 'real' && showDrafts && loadedMedia?.url === url && !!track && Math.abs(loadedMedia.duration - track.duration) < .5;
    const currentDrafts = readyForDrafts ? draftEvents(draftData, track.id, binding?.id || track.fingerprint).filter(e => !data.events.some(x => x.id === e.id)) : [];
    const events = [...officialEvents, ...currentDrafts];
    const isDraft = (id: string) => kind === 'real' && !data.events.some(e => e.id === id) && draftData.events.some(e => e.id === id);
    const eventStatus = (id: string) => kind === 'demo' ? '演示' : isDraft(id) ? '待回听' : '已审阅';
    const allCues = [...data.cues, ...(kind === 'real' && showDrafts ? remainingDrafts.map(e => ({ id: 'draft-cue-' + e.id, event: e.id, start: e.start, end: e.end, text: e.guide, priority: 0, alignmentId: undefined })) : [])];
    const event = events.find(e => e.id === selected);
    const playbackBoundaries=useMemo(()=>{
        const spans=navigation.tracks.find(t=>t.id===track?.id&&t.fingerprint===(binding?.id||track?.fingerprint))?.intervals||[];
        const regions=(movement===3?syncData:workSync[movement]).tracks.find(t=>t.id===track?.id)?.intervals||[];
        const lyrics=lyricsSync.tracks.find(t=>t.id===track?.id)?.intervals||[];
        return [...spans,...regions,...lyrics,...data.cues,...draftData.events].flatMap(s=>[s.start,s.end]);
    },[navigation,track,binding,movement,syncData,data,draftData]);
    useEffect(()=>{clock.configure(playbackBoundaries);clock.sample(audio.current?.currentTime||0,true)},[clock,playbackBoundaries]);
    useEffect(()=>{const a=audio.current!;let raf=0,last=0;
        const frame=(now:number)=>{raf=0;if(now-last>=1000/30){last=now;tickRef.current()}if(!a.paused&&!a.ended&&!document.hidden)raf=requestAnimationFrame(frame)};
        const wake=()=>{tickRef.current();if(!raf&&!a.paused&&!document.hidden)raf=requestAnimationFrame(frame)};
        for(const e of ['playing','seeked','pause','ended'])a.addEventListener(e,wake);document.addEventListener('visibilitychange',wake);
        return()=>{cancelAnimationFrame(raf);for(const e of ['playing','seeked','pause','ended'])a.removeEventListener(e,wake);document.removeEventListener('visibilitychange',wake)};
    },[]);
    const cue = !hidden && mode === '启发探索' && !ui.dragging && ui.playing ? allCues.filter(c => events.some(e => e.id === c.event) && c.start <= time && time < c.end && (kind === 'demo' || isDraft(c.event) || data.alignments.some(a => a.id === c.alignmentId && a.trackId === track?.id))).sort((a, b) => b.priority - a.priority)[0] : undefined;
    useEffect(() => { const engine = new AudioReactiveEngine(); reactive.current = engine; engine.update(() => visualState.current()); return () => { engine.dispose(); reactive.current = null; }; }, []);
    useEffect(() => { reactive.current?.update(() => visualState.current()); });
    useEffect(()=>{const engine=new MahlerAudioEngine(audio.current!,(value,seconds)=>reactive.current?.fadeTo(value,seconds));transport.current=engine;return()=>{engine.dispose();transport.current=null}},[]);
    function act(a: string) { state.current = transition(state.current, a); U(state.current); }
    useEffect(() => { if (cue && !(kind === 'real' && canSeekGuides))
        Hist(h => h.includes(cue.id) ? h : [...h, cue.id]); }, [cue?.id, kind, canSeekGuides]);
    useEffect(() => { const a = audio.current!; generation.current++; a.pause(); stopAt.current = null; act('ended'); transport.current!.load(url,!pagesProduction||delivery&&delivery.bytes<24000000?delivery?.url:undefined); BarBrowse(null); PageBrowse(null); T(0); D(track?.duration || 0); L(false); Err(''); }, [url]);
    async function play(keepPanel = false) { enterStage(); pendingBarSeek.current = null; auditionMode.current = keepPanel; if (!url) {
        Err('此乐章的录音暂不可用。');
        return;
    } const g = ++generation.current; if (audio.current!.error) {
        pendingRestore.current = { context: context(), resume: true, url };
        Err('');
        audio.current!.load();
        return;
    } if(!keepPanel){BarBrowse(null);PageBrowse(null)}
    act(keepPanel ? 'audition' : 'play'); try {
        void reactive.current?.connectAudio(audio.current!);
        await audio.current!.play();
        if (g === generation.current)
            act(keepPanel ? 'audition' : 'play');
    }
    catch {
        if (g === generation.current) {
            act('error');
            Err('播放失败，请检查文件格式后重试。');
        }
    } }
    function audioError() {
        if (!pagesProduction && delivery && track && [3, 4].includes(audio.current?.error?.code || 0)) {
            const a = audio.current!;
            pendingRestore.current = { context: { ...context(), time: a.currentTime || time }, resume: state.current.playing, url: track.url };
            FailedDelivery(previous => new Set([...previous, track.id]));
            return;
        }
        if (url) {
            act('error');
            Err('音频暂时无法播放，请检查网络后点击播放重试。');
        }
    }
    function pause() { pendingBarSeek.current = null; pendingRestore.current = null; auditionMode.current = false; continueNext.current = false; stopAt.current = null; generation.current++; audio.current!.pause(); T(audio.current!.currentTime); act('pause'); }
    function seek(t: number) { pendingBarSeek.current = null; if (!url)
        return; const target=Math.max(0,Math.min(t,duration));transport.current!.seek(target);T(target); }
    function context(): Context { return { trackId: track?.id, movement, time:audio.current?.currentTime||0, mode, selected, range, loop, tab, bar: barBrowse, scoreRegion: pageBrowse, binding: binding?.id || track?.fingerprint || '' }; }
    function choose(id: string, jump = false) { const e = events.find(e => e.id === id); if (!e)
        return; if (jump)
        Stack(s => [...s, context()].slice(-12)); pause(); L(false); S(id); Tab('赏析'); R([e.start, e.end]); seek(e.start); }
    function applyContext(c: Context, resume: boolean) { BarBrowse(c.bar ?? null); PageBrowse(c.scoreRegion ?? null); Mode(c.mode); S(c.selected); R(c.range); L(c.loop); Tab(listeningLayers.includes(c.tab as ListeningLayer) ? c.tab as ListeningLayer : '赏析'); seek(c.time); if (resume)
        void play();
    else
        act('pause'); }
    function back(resume: boolean) { const c = stack.at(-1); if (!c)
        return; pause(); auditionOrigin.current = null; const target = data.tracks.find(t => t.id === c.trackId && t.fingerprint === c.binding); const bound = bindings[c.movement]; const targetURL = bound?.id === c.binding ? bound.url : (target && !failedDelivery.has(target.id) ? deliveryURL(target.id) : undefined) || target?.url; if (!targetURL) {
        Err('原录音已变更或缺失，暂时无法返回。');
        return;
    } Stack(s => s.slice(0, -1)); if (bound && bound.id !== c.binding)
        B(b => { const next = { ...b }; delete next[c.movement]; return next; }); M(c.movement); SelectTrack(c.trackId || ''); if (targetURL === url)
        applyContext(c, resume);
    else
        pendingRestore.current = { context: c, resume, url: targetURL }; }
    function changeMovement(n: number) { tour.exit(); enterStage(); BarBrowse(null); SelectTrack(''); pause(); state.current = { ...state.current, panel: false }; act('ended'); M(n); S(''); L(false); Stack([]); T(0); audio.current!.currentTime = 0; }
    function replay(start: number, end: number, repeat = false) { tour.exit(); if (!validReplay([start, end], duration))
        return; if (!auditionOrigin.current) {
        auditionOrigin.current = context();
        Stack(s => [...s, context()].slice(-12));
    } audio.current!.pause(); continueNext.current = false; R([start, end]); L(repeat); stopAt.current = repeat ? null : end; seek(start); void play(true); }
    function locateScore(id: string, start: number, end: number) { const target = data.tracks.find(t => t.id === id); if (!target)
        return; const origin = context(); pause(); S(''); L(false); R([start, end]); if (id === track?.id) {
        seek(start);
        return;
    } Stack(s => [...s, origin].slice(-12)); pendingRestore.current = { context: { ...origin, trackId: id, binding: target.fingerprint, time: start, range: [start, end], loop: false, selected: '' }, resume: false, url: (!failedDelivery.has(target.id) ? deliveryURL(target.id) : undefined) || target.url }; SelectTrack(id); }
    function barRange(from: number, to = from, requireLoaded = true) {
        if (kind !== 'real' || !track || (requireLoaded && !canSeekGuides) || !Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from)
            return null;
        return mappedBarRange(movement, track.id, binding?.id || track.fingerprint, from, to);
    }
    function mappedBarRange(chapter:number,trackId:string,fingerprint:string,from:number,to:number) {
        if (chapter !== 3)
            return workBarRange(workMeasures[chapter], trackId, fingerprint, from, to);
        const first = measureData.measures[from - 1], last = measureData.measures[to - 1];
        if (!first || !last)
            return null;
        const start = measureIntervals(measureData, first.id).find(i => i.trackId === trackId && i.fingerprint === fingerprint);
        const end = measureIntervals(measureData, last.id).find(i => i.trackId === trackId && i.fingerprint === fingerprint);
        return start && end ? { trackId: start.trackId, start: start.start, end: end.end, regionId: first.regionId } : null;
    }
    function browseGuide(number: number) { Stack(s => [...s, context()].slice(-12)); seekToBar(number); }
    function seekToBar(number: number) { tour.exit(); navigateReference(number, number); }
    function navigateReference(from: number, to: number) { tour.exit();
        const target = barRange(from, to, false);
        BarBrowse(from);
        PageBrowse(null);
        if (!target) {
            pendingBarSeek.current = null;
            Err(canSeekGuides ? `稿件第 ${from}${to !== from ? `—${to}` : ''} 小节尚未对应到当前谱本，已保留原播放位置。` : '当前音频没有匹配的小节映射；已打开解读，请切回项目录音后定位。');
            return;
        }
        if (!canSeekGuides) {
            if (loadedMedia?.url === url) {
                Err('音轨时长与定位记录不符，请切回项目录音。');
                return;
            }
            pause();
            S('');
            L(false);
            pendingBarSeek.current = { movement, url, from, to, start: target.start, end: target.end };
            Err('正在载入录音，完成后会定位到所选小节。');
            return;
        }
        Err('');
        locateScore(target.trackId, target.start, target.end);
    }
    function followReference(from:number,to=from,chapter=movement) {
        const origin=context();
        if(chapter===movement){
            Stack(s=>[...s,origin].slice(-12));
            navigateReference(from,to);
            return;
        }
        const bound=bindings[chapter];
        const destination=data.tracks.filter(t=>t.movement===chapter && (!bound||t.fingerprint===bound.id))
            .map(track=>({track,range:mappedBarRange(chapter,track.id,track.fingerprint,from,to)}))
            .find(candidate=>!!candidate.range);
        const targetURL=destination&&(bound?.url||(!failedDelivery.has(destination.track.id)?deliveryURL(destination.track.id):undefined)||destination.track.url);
        if(!destination?.range||!targetURL){
            Err('目标乐章没有匹配的小节定位，请检查录音版本。');
            return;
        }
        tour.exit();
        pause();
        Stack(s=>[...s,origin].slice(-12));
        auditionOrigin.current=null;
        SelectTrack(destination.track.id);
        S('');
        L(false);
        M(chapter);
        BarBrowse(from);
        PageBrowse(null);
        if(targetURL===url && loadedMedia?.url===url && Math.abs(loadedMedia.duration-destination.track.duration)<.5){
            seek(destination.range.start);
            R([destination.range.start,destination.range.end]);
            Err('');
            return;
        }
        pendingBarSeek.current={movement:chapter,url:targetURL,from,to,start:destination.range.start,end:destination.range.end};
        Err('正在载入目标乐章，完成后会定位到所选小节。');
    }
    function tick() { const a = audio.current!; if (state.current.dragging)
        return; if (!loop && stopAt.current !== null && a.currentTime >= stopAt.current) {
        a.pause();
        a.currentTime = stopAt.current;
        stopAt.current = null;
        act(auditionMode.current ? 'preview-ended' : 'ended');
    } if (loop && a.currentTime >= range[1]) {
        a.currentTime = range[0];
    } clock.sample(a.currentTime); }
    tickRef.current=tick;
    function drop() { if (!state.current.dragging)
        return; act('drop'); if (state.current.resume)
        void play(); }
    useEffect(()=>{if(pendingFullPlay.current&&movement===1&&canSeekGuides){pendingFullPlay.current=false;seek(0);void play()}},[movement,canSeekGuides]);
    const currentBar = canSeekGuides ? (movement === 3 ? measureAt(measureData, track!.id, navigationFingerprint, time) : workMeasureAt(workMeasures[movement], track!.id, navigationFingerprint, time))?.measure.number || null : null;
    const displayedBar = barBrowse || currentBar || guides.guides[0]?.from || null;
    const tour=useCuratedTour({enabled:tourEnabled,audio,movement,source:url,ready:canSeekGuides,
        select:stop=>{pendingLink.current=null;pause();B(previous=>{const next={...previous};delete next[stop.movementId];return next});setKind('real');SelectTrack('');S('');L(false);Stack([]);C(false);M(stop.movementId);Mode('启发探索');BarBrowse(null);PageBrowse(null);enterStage();IntroOpen(false)},
        gain:(value,base)=>{if(audio.current)reactive.current?.setTourGain(audio.current,value,base)},
        playing:()=>{void reactive.current?.connectAudio(audio.current!);act('play')},paused:()=>act('ended')});
    function listenToFullMovement(){
        const root=document.documentElement;
        if(root.hasAttribute('data-tour-transition'))return;
        const commit=()=>flushSync(()=>{
            tour.exit();
            Mode('自由检索');
        });
        if(matchMedia('(prefers-reduced-motion: reduce)').matches){commit();return}
        if(document.startViewTransition){
            root.setAttribute('data-tour-transition','');
            try{
                const transition=document.startViewTransition(commit);
                void transition.ready.catch(()=>{});
                void transition.finished.catch(()=>{}).then(()=>root.removeAttribute('data-tour-transition'));
                return;
            }catch{root.removeAttribute('data-tour-transition')}
        }
        commit();
        document.querySelectorAll('.floating-player-dock,.guide-panel,.movement-area').forEach(element=>
            element.animate([{opacity:.35},{opacity:1}],{duration:260,easing:'ease-out'})
        );
    }
    useEffect(()=>{if(initialTour)tour.start(Math.max(1,Math.min(6,Number(new URLSearchParams(location.search).get('step'))||1)))},[]);
    const guideBar=mode==='启发探索'&&ui.playing&&canSeekGuides?currentBar:displayedBar;
    const activeGuide=guideBar?guideAt(guides,measureResearch,guideBar):undefined;
    const activeSection=Math.max(1,guides.guides.findIndex(g=>g.id===activeGuide?.id)+1);
    linkHandler.current=q=>{
        pause();SelectTrack('');S('');L(false);Stack([]);M(q.movement);Mode(q.mode);Tab(q.tab);
        const document=guideOverrides[q.movement]||defaultGuideLibrary[q.movement];
        BarBrowse(document.guides[q.section-1]?.from||document.guides[0].from);PageBrowse(null);
        pendingLink.current=q.hasSelection?q:null;LinkRevision(n=>n+1);
        if(q.hasSelection)enterStage();else returnToLobby();
    };
    useEffect(()=>{
        const pending=pendingLink.current;
        if(!pending||pending.movement!==movement)return;
        pendingLink.current=null;
        const guide=guides.guides[pending.section-1]||guides.guides[0];
        navigateReference(guide.from,guide.from);
    },[movement,linkRevision,guides]);
    useEffect(()=>{
        const pop=()=>{if(new URLSearchParams(location.search).get('tour')==='highlights'){tour.start(Number(new URLSearchParams(location.search).get('step'))||1)}else{tour.exit();linkHandler.current(readListeningQuery(location.search,guideCounts))}};
        window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
    },[]);
    useEffect(()=>{
        if(viewMode!=='stage'||pendingLink.current)return;
        const next=listeningURL(location.href,{movement,section:activeSection,tab,mode});
        if(next.href!==location.href)window.history.replaceState(window.history.state,'',next.pathname+next.search+next.hash);
    },[viewMode,movement,activeSection,tab,mode,linkRevision]);
    const historyPrefix = 'guide:' + movement + ':';
    const visibleHistory = history.filter(id => id.startsWith(historyPrefix) || (!id.startsWith('guide:') && allCues.some(c => c.id === id && data.events.some(e => e.id === c.event && e.movement === movement))));
    const guideCue = kind === 'real' && canSeekGuides && mode === '启发探索' && !hidden && !ui.dragging && ui.playing && currentBar ? guideAt(guides, measureResearch, currentBar) : undefined;
    useEffect(() => { if (guideCue)
        Hist(h => h.includes(historyPrefix + guideCue.id) ? h : [...h, historyPrefix + guideCue.id]); }, [guideCue?.id, historyPrefix]);
    const activeLyric = kind === 'real' && loadedMedia?.url === url && track && Math.abs(loadedMedia.duration - track.duration) < .5 ? lyricAt(lyricsSync, lyricsLibrary, movement, track.id, binding?.id || track.fingerprint, time) : null;
    const visualTrack = canSeekGuides ? navigation.tracks.find(t => t.id === track?.id && t.fingerprint === navigationFingerprint) : undefined;
    visualState.current = () => ({ movement, playing: state.current.playing && !!audio.current && !audio.current.paused && !audio.current.ended && audio.current.readyState >= 3, bar: visualTrack && audio.current ? fractionalBarAt(visualTrack.intervals, audio.current.currentTime) : null });
    const phase = movement === 5 && currentBar !== null && currentBar >= 472 ? 'dawn' : 'storm';
    const visualEvent = movement === 3 && currentBar !== null && currentBar >= 465 && currentBar <= 472 ? 'cry' : 'none';
    const scoreMode = movement === 2 ? 'light' : 'dark';
    useEffect(() => { document.body.dataset.movement = String(movement); document.body.dataset.phase = phase; document.body.dataset.event = visualEvent; document.body.dataset.scoreMode = scoreMode; document.documentElement.style.colorScheme = scoreMode; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ({ 1: '#0e1013', 2: '#f5f2eb', 3: '#0d1517', 4: '#090b10', 5: '#111015' } as Record<number, string>)[movement]); }, [movement, phase, visualEvent, scoreMode]);
    const concert = mode === '启发探索' && !auditionMode.current && (ui.playing || (ui.dragging && ui.resume));
    const continuousSettings=(<label className="glass-switch"><input type="checkbox" role="switch" checked={continuous} onChange={e => C(e.target.checked)}/><span className="glass-switch-track" aria-hidden="true"/><span>连续播放</span></label>);
    const recordingSettings=(<label className="recording">录音 <select aria-label="录音版本" value={binding ? 'local' : 'configured'} onChange={e => { pause(); if (e.target.value === 'configured')
        B(b => { const n = { ...b }; delete n[movement]; return n; }); }}><option value="configured">{track ? (kind === 'demo' ? '合成演示 v1' : '伯恩斯坦 · 1987 / DG') : kind === 'real' ? '伯恩斯坦 1987 / DG · 待导入' : '未配置录音'}</option>{binding && <option value="local">本地导入</option>}</select></label>);
    prologuePlay.current=()=>{void play()};
    const enterFromPrologue=(guided:boolean)=>{flushSync(()=>{setKind('real');changeMovement(1);Mode(guided?'启发探索':'自由检索');IntroOpen(false)});if(guided)prologuePlay.current()};
    const listeningCue = (<div className="cue focus-stage-container" data-visible={mode === '启发探索'}><div className="cue-inner" aria-hidden={mode !== '启发探索'}>{mode === '启发探索' && <><label className="glass-switch"><input type="checkbox" role="switch" checked={hidden} onChange={e => H(e.target.checked)}/><span className="glass-switch-track" aria-hidden="true"/><span>隐藏提示，连续聆听</span></label>{guideCue ? <PoeticClue id={guideCue.id} text={guideCue.prompt} onExplore={() => { Stack(s => [...s, context()].slice(-12)); pause(); BarBrowse(currentBar); PageBrowse(null); Tab('赏析'); }}/> : cue ? <PoeticClue id={cue.id} text={(isDraft(cue.event) ? '待回听 · ' : '') + cue.text} onExplore={() => choose(cue.event, true)}/> : <p>{!canSeekGuides && kind === 'real' ? '当前音频尚无匹配的小节定位，可浏览下方导读。' : ui.playing ? '安心聆听，提示会随音乐出现。' : '点击播放开始；提示不会自动暂停。'}</p>}<details><summary>本乐章最近提示（{visibleHistory.length}）</summary>{visibleHistory.map(id => { if (id.startsWith(historyPrefix)) {
        const g = guides.guides.find(x => x.id === id.slice(historyPrefix.length));
        return g && <button key={id} onClick={() => browseGuide(g.from)}>{g.prompt}（第 {g.from} 小节）</button>;
    } const c = allCues.find(c => c.id === id); return c && <button key={id} onClick={() => choose(c.event)}>{c.text}（{eventStatus(c.event)}）</button>; })}</details></>}</div></div>);
    return <>{introOpen&&<IntroPrologue onTour={tourEnabled?()=>{IntroOpen(false);tour.start()}:undefined} onEnter={enterFromPrologue} onSkip={()=>{IntroOpen(false);if(initialQuery.hasSelection)enterStage();else returnToLobby()}}/>}<main inert={introOpen} id="main-content" data-view-mode={viewMode} data-concert={concert} data-tour={!!tour.stop} data-movement={movement} data-phase={phase} data-event={visualEvent} data-score-mode={scoreMode}><a className="skip-link" href="#listening-content">跳到谱面与导读</a>{viewMode==='lobby'&&!introOpen&&<button className="lobby-return-prologue" onClick={()=>{pause();IntroOpen(true)}}>返回序幕</button>}<ListeningAtmosphere movement={movement} phase={phase} visualEvent={visualEvent}/><header className="site-header"><button className="brand work-home" aria-label="展开作品导览" onClick={returnToLobby}><img className="brand-logo" src="/logo-512.webp" width="24" height="24" alt=""/><span>LucidScore<small>INTERACTIVE SCORE GUIDE</small></span></button><span className="header-note">C-MOLL · AUFERSTEHUNGSSYMPHONIE (1888–1894)</span><ReviewDrawer>{tourEnabled&&<button onClick={e=>{e.currentTarget.closest('dialog')?.close();tour.start()}}>进入精华导听</button>}<button className="replay-prologue" onClick={e=>{e.currentTarget.closest('dialog')?.close();pause();IntroOpen(true)}}>重看序幕</button>{mobileLayout&&<div className="mobile-settings">{continuousSettings}{recordingSettings}</div>}{kind === 'real' && remainingDrafts.length > 0 && <div className="draft-entry"><div><strong>{showDrafts ? '核对视图 · 对齐草稿待回听' : `${remainingDrafts.length} 条真实录音对齐草稿可试听`}</strong><p>第三乐章开头 · 原谱、实际波形与两次短音型比较；不计入已核验覆盖。</p></div><button onClick={() => { if (showDrafts) {
        pause();
        Drafts(false);
        S('');
        Stack([]);
        Hist([]);
    }
    else {
        changeMovement(3);
        SelectTrack(draftData.trackId);
        Drafts(true);
        act('pause');
    } }}>{showDrafts ? '退出对齐核对' : '进入对齐核对'}</button></div>}{kind === 'real' && <details className="development-tools"><summary>开发工具 · 小节定位与整章核对</summary><p>用于内容校对：小节定位、完整谱页与本地导读编辑。常规聆听使用舞台中的总谱与导读。</p>{import.meta.env.DEV && <ContentImport key={movement} data={guides} reference={defaultGuides} measures={measureData} research={measureResearch} onApply={next => SetGuideOverrides(previous => ({ ...previous, [next.movement]: next }))} onReset={() => SetGuideOverrides(previous => { const next = { ...previous }; delete next[movement]; return next; })}/>}{movement === 3 && <ScoreSync data={syncData} measures={measureData} research={measureResearch} trackId={track?.id || ''} fingerprint={binding?.id || track?.fingerprint || ''} time={time} onLocate={locateScore} onReplay={replay}/>}</details>}<Resources movement={movement} fingerprint={binding?.id || track?.fingerprint} duration={duration} range={range} demo={kind === 'demo'}/><p className="review-scope">正式内容仍在核验，演示材料不计入覆盖；谱面与时间定位精度见总谱控制栏中的说明。</p></ReviewDrawer></header><section className="intro lobby-hero-section" inert={viewMode === 'stage'} aria-hidden={viewMode === 'stage'}><p className="eyebrow">GUSTAV MAHLER · SYMPHONIE NR. 2</p><h1>第二交响曲<span>「复活」</span></h1><p className="work-dates">1888 — 1894</p><div className="lobby-actions"><button className="lobby-start" onClick={()=>ui.playing?enterStage():void play()}>{ui.playing?'返回舞台':'开始聆听'}<span aria-hidden="true"><UiIcon name="external"/></span></button>{tourEnabled&&<button className="tour-lobby-shortcut" onClick={()=>tour.start()}>精华导听 <span>6 个瞬间 <UiIcon name="external"/></span></button>}</div></section>{tour.stop?<TourBar tour={tour} onListenFull={listenToFullMovement} audio={audio} playing={ui.playing} onToggle={()=>ui.playing?pause():void play()} onDrag={()=>{act('drag');generation.current++;audio.current!.pause()}} onSeek={seek} onDrop={drop}/>:<MovementSwitcher compact={viewMode === 'stage'} controls={<><div className="modes"><button className="compact-mode-toggle" aria-label="切换聆听模式" onClick={()=>Mode(mode==='自由检索'?'启发探索':'自由检索')}>{mode} <UiIcon name="switch"/></button>{!mobileLayout&&continuousSettings}</div>{!mobileLayout&&recordingSettings}</>} movement={movement} names={names} onChange={changeMovement} descriptions={names.map((_, i) => kind === 'demo' && i === 2 ? '3 条演示 · 60 秒' : `${kind === 'real' ? (guideOverrides[i + 1] || defaultGuideLibrary[i + 1]).guides.length : 0} 段导读 · ` + (bindings[i + 1] || data.tracks.some(t => t.movement === i + 1 && t.url) ? '可播放' : '资源缺失'))}/>}<div className="stage-scene" inert={viewMode==='lobby'} aria-hidden={viewMode==='lobby'}><div className="stage-scene-content"><section className="player" aria-label="音乐播放器"><audio crossOrigin="anonymous" preload="auto" ref={audio} onLoadedMetadata={() => { const actual = audio.current!.duration; D(delivery && track ? track.duration : actual); Loaded({ url, duration: actual }); const pendingBar = pendingBarSeek.current; if (pendingBar && pendingBar.url === url && pendingBar.movement === movement) {
        pendingBarSeek.current = null;
        if (track && Math.abs(actual - track.duration) < .5 && barRange(pendingBar.from, pendingBar.to, false)) {
            audio.current!.currentTime = pendingBar.start;
            T(pendingBar.start);
            R([pendingBar.start, pendingBar.end]);
            BarBrowse(pendingBar.from);
            PageBrowse(null);
            Err('');
            act('pause');
        }
        else
            Err('音轨与小节定位记录不匹配，请切回项目录音。');
        return;
    } if (pendingRestore.current?.url === url) {
        const pending = pendingRestore.current;
        pendingRestore.current = null;
        applyContext(pending.context, pending.resume);
        return;
    } if (kind === 'real' && track && binding?.id === track.fingerprint && Math.abs(actual - track.duration) > .5)
        Err('音轨时长与核验记录不符，已停用注释。'); if (continueNext.current) {
        continueNext.current = false;
        void play();
    } }} onTimeUpdate={tick} onError={audioError} onEnded={() => { act('ended'); if (continuous) {
        if (!binding && nextPart) {
            continueNext.current = true;
            SelectTrack(nextPart.id);
            S('');
            L(false);
        }
        else if (movement < 5 && (bindings[movement + 1] || data.tracks.some(t => t.movement === movement + 1 && t.url))) {
            continueNext.current = true;
            SelectTrack('');
            M(movement + 1);
            S('');
            L(false);
        }
        else if (movement < 5)
            Err('下一乐章资源缺失');
    } }}/><div className="stage-controls floating-player-dock"><PlaybackProgress chapters={guides.guides.map(g=>barRange(g.from,g.to,false)?.start).filter((t):t is number=>t!==undefined)} audio={audio} duration={duration} disabled={!url} onDrag={()=>{act('drag');generation.current++;audio.current!.pause()}} onSeek={t=>{tour.manualSeek(t);seek(t)}} onDrop={drop}><button className="primary" data-playing={ui.playing} onClick={() => ui.playing ? pause() : void play()}><PlayIcon playing={ui.playing}/>{ui.playing ? '暂停并探索' : '播放'}</button></PlaybackProgress><PlaybackBuffer audio={audio} url={url}/></div>{event && <p>所选片段：{fmt(event.start)}–{fmt(event.end)} · {event.title}（{eventStatus(event.id)}）</p>}{error && <p role="alert" className="notice">{error}</p>}{!url && <p className="notice">此乐章资源缺失，可导入本地音频无注释聆听。</p>}{(kind === 'demo' || !canSeekGuides) && listeningCue}</section>{stack.length > 0 && <aside className="reference-return" aria-label="返回原处">出发位置 {fmt(stack.at(-1)!.time)} · 第 {stack.at(-1)!.movement} 乐章 <span className="return-source">{data.tracks.find(t => t.id === stack.at(-1)!.trackId)?.label}</span><button onClick={() => back(false)}>仅返回</button><button onClick={() => back(true)}>返回原处继续</button></aside>}<section id="listening-content" className="explore" data-open={ui.panel}><div className="panel-content">{kind === 'real' && <><div className="listening-workspace"><div className="score-column">{movement !== 3 && <CurrentScorePages vocal={<LyricsPanel lyric={activeLyric} language={lyricLanguage} onLanguage={LyricLanguage}/>} key={movement + url} data={workSync[movement]} measures={workMeasures[movement]} selectedNumber={barBrowse} onBarSelect={n => { if (n === null) {
        BarBrowse(null);
        PageBrowse(null);
    }
    else
        browseGuide(n); }} selectedRegion={pageBrowse} onSelect={id => { BarBrowse(null); PageBrowse(id); }} trackId={track?.id || ''} fingerprint={navigationFingerprint} time={time} onLocate={locateScore} onReplay={replay}/>} {movement === 3 && <CurrentScore vocal={<LyricsPanel lyric={activeLyric} language={lyricLanguage} onLanguage={LyricLanguage}/>} data={measureData} trackId={track?.id || ''} fingerprint={navigationFingerprint} time={time} selectedNumber={barBrowse} onSelect={n => n === null ? BarBrowse(null) : seekToBar(n)} onLocate={locateScore} onReplay={replay}/>}</div><GuidePanel tourActive={!!tour.stop} tourCue={tour.stop?<div className="tour-cue"><p>{tour.stop.bridgeNote}</p><strong>{tour.stop.listeningCue}</strong></div>:undefined} onShare={()=>navigator.clipboard.writeText(listeningURL(location.href,{movement,section:activeSection,tab,mode}).href)} listeningCue={listeningCue} data={guides} research={measureResearch} bar={mode === '启发探索' && ui.playing && canSeekGuides ? currentBar : displayedBar} layer={tab} canSeek={canSeekGuides} isRangeMapped={(from, to) => !!barRange(from, to)} onRangeReplay={(from, to) => { const target = barRange(from, to); if (target) {
        BarBrowse(from);
        replay(target.start, target.end);
    }
    else
        followReference(from, to); }} showPrompt={mode === '启发探索'} promptOnly={!tour.stop && mode === '启发探索' && ui.playing && canSeekGuides && !auditionMode.current} onExplore={() => { Stack(s => [...s, context()].slice(-12)); pause(); BarBrowse(currentBar); Tab('赏析'); }} onLayer={Tab} onBrowse={browseGuide} onReference={followReference}/></div></>}</div></section>{tour.notice&&<p className="tour-notice" role="status">{tour.notice}</p>}{tour.status==='finished'&&<div className="tour-finish" role="dialog" aria-modal="true" aria-label="精华导听完成"><h2>你已走完六个决定性瞬间</h2><p>从墓地里的第一声叩问，到星空下的无伴奏合唱——完整版 85 分钟的每一个细节，随时为你敞开。</p><button autoFocus onClick={()=>{tour.exit();pause()}}>自由探索五乐章</button><button onClick={()=>{tour.exit();changeMovement(1);pendingFullPlay.current=true}}>从第一乐章完整开始</button></div>}<footer><button onClick={()=>{pause();IntroOpen(true)}}>{'重看序幕'}</button><a href="https://github.com/yuxinpu0110-wq/lucidscore" target="_blank" rel="noreferrer">LucidScore · GitHub</a><span>© 2026 LucidScore</span><span>GUSTAV MAHLER · SYMPHONIE NR. 2</span><span>PARTITUR &amp; KOMMENTAR</span></footer></div></div></main></>;
}
class Boundary extends React.Component<{
    children: React.ReactNode;
}, {
    error: string;
}> {
    state = { error: '' };
    static getDerivedStateFromError(e: Error) { return { error: e.message }; }
    render() { return this.state.error ? <p role="alert">内容校验失败：{this.state.error}</p> : this.props.children; }
}
try {
    createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>);
}
catch (e) {
    document.getElementById('root')!.textContent = '内容校验失败：' + String(e);
}
