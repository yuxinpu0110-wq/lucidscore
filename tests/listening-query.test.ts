import {describe,it,expect} from 'vitest';
import {readListeningQuery,listeningURL} from '../src/listeningQuery';
const counts={1:26,2:13,3:23,4:5,5:35};
describe('listening links',()=>{
 it('validates movement, section and view independently',()=>{
  expect(readListeningQuery('?m=5&sec=23&tab=harmony&mode=guided',counts)).toEqual({movement:5,section:23,tab:'和声',mode:'启发探索',hasSelection:true});
  expect(readListeningQuery('?m=99&sec=-1&tab=invalid&mode=invalid',counts)).toEqual({movement:1,section:1,tab:'赏析',mode:'自由检索',hasSelection:true});
  expect(readListeningQuery('?m=2&sec=14',counts).section).toBe(1);
  expect(readListeningQuery('?catalog=1',counts).hasSelection).toBe(false);
 });
 it('round-trips views, preserving unrelated options and anchors',()=>{
  for(const tab of ['赏析','结构','和声','配器'] as const){
   const state={movement:3,section:9,tab,mode:'自由检索' as const};
   const url=listeningURL('https://lucidscore.org/?catalog=1&review=1#a',state);
   expect(url.pathname).toBe('/mahler/symphonie-2');expect(url.searchParams.get('catalog')).toBeNull();expect(url.searchParams.get('review')).toBe('1');expect(url.hash).toBe('#a');
   expect(readListeningQuery(url.search,counts)).toEqual({...state,hasSelection:true});
  }
 });
});
