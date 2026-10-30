import {describe,it,expect} from 'vitest';
import {updateDue,safeUpdateDestination,validateUpdateFile} from './updates';
import {opportunityQuota} from './opportunityQuota';
describe('Updates recurrence',()=>{
 it('once never repeats after view',()=>expect(updateDue('once',7,0,'a','b',999999999)).toBe(false));
 for(const days of [7,15,30])it(`waits exactly ${days} days`,()=>{expect(updateDue(String(days),1,0,'a','a',days*86400000-1)).toBe(false);expect(updateDue(String(days),1,0,'a','a',days*86400000)).toBe(true);});
 it('login excludes same session',()=>{expect(updateDue('login',7,0,'a','a',1000)).toBe(false);expect(updateDue('login',7,0,'a','b',1000)).toBe(true);});
 it('custom uses chosen interval',()=>{expect(updateDue('custom',12,0,'a','a',12*86400000-1)).toBe(false);expect(updateDue('custom',12,0,'a','a',12*86400000)).toBe(true);});
 it('rejects unsafe destinations',()=>{expect(safeUpdateDestination('javascript:alert(1)')).toBe(false);expect(safeUpdateDestination('//evil.com')).toBe(false);expect(safeUpdateDestination('/admin/announcements')).toBe(false);expect(safeUpdateDestination('/projects')).toBe(true);});
 it('image limit is 5 MB',()=>{expect(validateUpdateFile({type:'image/png',size:5242880})).toBe(true);expect(validateUpdateFile({type:'image/png',size:5242881})).toBe(false);});
 it('video limit is 50 MB',()=>{expect(validateUpdateFile({type:'video/mp4',size:52428800})).toBe(true);expect(validateUpdateFile({type:'video/mp4',size:52428801})).toBe(false);});
 it('preserves quota zero and add-ons',()=>{expect(opportunityQuota({searches_limit:0})?.limit).toBe(0);expect(opportunityQuota({searches_limit:10000,extra_opportunities_packs:1,bonus_searches:12,searches_used:304})?.limit).toBe(11012);});
});
