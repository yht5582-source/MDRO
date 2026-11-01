// Engine tests: node tests.cjs
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const src = html.split('/*ENGINE-START*/')[1].split('/*ENGINE-END*/')[0];
const MDRO = new Function(src + '\nreturn MDRO;')();
let pass = 0, fail = 0;
const base = { bug: 'esbl', site: 'bsi', clin: 'confirmed', sev: 'severe', mech: 'unknown', kidney: 'normal', susc: 'confirmed' };
const rec = o => MDRO.recommend({ ...base, ...o });
const txt = a => a.join(' | ');
function t(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL:', name); } }

// ESBL
t('ESBL cystitis nitrofurantoin preferred', /Nitrofurantoin/.test(txt(rec({ site: 'cystitis', sev: 'stable' }).pref)));
t('ESBL stable cUTI TMP-SMX/FQ preferred', /TMP-SMX/.test(rec({ site: 'cuti', sev: 'stable' }).pref[0]));
t('ESBL stable cUTI pip-tazo alt only', /Piperacillin/.test(txt(rec({ site: 'cuti', sev: 'stable' }).alt)));
t('ESBL severe cUTI carbapenem', /Meropenem/.test(txt(rec({ site: 'cuti', sev: 'severe' }).pref)));
t('ESBL bsi avoid pip-tazo', /Piperacillin/.test(txt(rec({}).avoid)));
t('ESBL critical meropenem/imipenem first', /Meropenem 或 imipenem/.test(rec({ sev: 'shock' }).pref[0]));
t('ESBL stable IAI ertapenem ok', /Ertapenem/.test(rec({ site: 'iai', sev: 'stable' }).pref[0]));
// Cefepime-enmetazobactam (IDSA 2026 Q1.1–1.3, 1.5, 2.3)
const FPE = /Cefepime-enmetazobactam/i;
t('FPE cystitis alt only', FPE.test(txt(rec({ site: 'cystitis', sev: 'stable' }).alt)) && !FPE.test(txt(rec({ site: 'cystitis', sev: 'stable' }).pref)));
t('FPE stable cUTI after TMP-SMX/FQ', !FPE.test(rec({ site: 'cuti', sev: 'stable' }).pref[0]) && FPE.test(rec({ site: 'cuti', sev: 'stable' }).pref[1]));
t('FPE severe cUTI preferred', FPE.test(txt(rec({ site: 'cuti', sev: 'severe' }).pref)));
for (const site of ['bsi', 'pna', 'iai']) for (const sev of ['stable', 'severe']) t(`FPE ${site} ${sev} alt only`, FPE.test(txt(rec({ site, sev }).alt)) && !FPE.test(txt(rec({ site, sev }).pref)));
t('ESBL cUTI avoid cefepime alone', /Cefepime 單藥/.test(txt(rec({ site: 'cuti', sev: 'stable' }).avoid)));
t('ESBL bsi avoid cefepime alone', /Cefepime 單藥/.test(txt(rec({}).avoid)));
t('ESBL cystitis does not avoid cefepime', !/Cefepime 單藥/.test(txt(rec({ site: 'cystitis', sev: 'stable' }).avoid)));
t('AmpC keeps cefepime first, FPE reserved', /^Cefepime（/.test(rec({ bug: 'ampc' }).pref[0]) && /保留/.test(txt(rec({ bug: 'ampc' }).alt)));
t('FPE renal note via cefepime', rec({ site: 'cuti', sev: 'severe', kidney: 'hd' }).renal.some(x => /Cefepime/.test(x)));
// AmpC
t('AmpC invasive cefepime MIC ≤8', /Cefepime.*≤8/.test(rec({ bug: 'ampc' }).pref[0]));
t('AmpC invasive avoid ceftriaxone', /Ceftriaxone/.test(txt(rec({ bug: 'ampc' }).avoid)));
t('AmpC cystitis no avoid', rec({ bug: 'ampc', site: 'cystitis', sev: 'stable' }).avoid.length === 0);
// CRE
t('KPC MEV first', /Meropenem-vaborbactam/.test(rec({ bug: 'cre', mech: 'kpc' }).pref[0]));
t('NDM ATM-AVI first', /Aztreonam-avibactam/.test(rec({ bug: 'cre', mech: 'ndm' }).pref[0]));
t('NDM avoid CZA mono', /Ceftazidime-avibactam/.test(txt(rec({ bug: 'cre', mech: 'ndm' }).avoid)));
t('NDM bsi no tigecycline alt', !/tigecycline/i.test(txt(rec({ bug: 'cre', mech: 'ndm', site: 'bsi' }).alt)));
t('NDM iai tigecycline alt', /tigecycline/i.test(txt(rec({ bug: 'cre', mech: 'ndm', site: 'iai' }).alt)));
t('OXA CZA preferred', rec({ bug: 'cre', mech: 'oxa' }).pref[0] === 'Ceftazidime-avibactam');
t('OXA avoid MEV/IMR', /Meropenem-vaborbactam/.test(txt(rec({ bug: 'cre', mech: 'oxa' }).avoid)));
t('noncp extended-infusion mero', /延長輸注 meropenem/.test(rec({ bug: 'cre', mech: 'noncp' }).pref[0]));
t('CRE cUTI FQ first only if S', /藥敏證實/.test(rec({ bug: 'cre', mech: 'kpc', site: 'cuti' }).pref[0]));
t('CRE cUTI no tigecycline', !/tigecycline/i.test(txt(rec({ bug: 'cre', mech: 'ndm', site: 'cuti' }).alt)));
t('CRE unknown mech alert', rec({ bug: 'cre' }).alerts.some(a => /機制未知/.test(a.t)));
t('CRE cystitis oral options', /Nitrofurantoin/.test(txt(rec({ bug: 'cre', site: 'cystitis', sev: 'stable' }).pref)));
t('CRE avoid tetracyclines in BSI', /Tigecycline/.test(txt(rec({ bug: 'cre', mech: 'kpc' }).avoid)));
// DTR-PA
t('PA pneumonia C/T first', /Ceftolozane/.test(rec({ bug: 'pa', site: 'pna' }).pref[0]));
t('PA bsi CZA first', /Ceftazidime-avibactam/.test(rec({ bug: 'pa', site: 'bsi' }).pref[0]));
t('PA MBL cefiderocol', rec({ bug: 'pa', mech: 'ndm' }).pref[0] === 'Cefiderocol');
t('PA MBL avoid ATM-AVI', /Aztreonam-avibactam/.test(txt(rec({ bug: 'pa', mech: 'ndm' }).avoid)));
t('PA KPC avoid C/T', /Ceftolozane/.test(txt(rec({ bug: 'pa', mech: 'kpc' }).avoid)));
t('PA cystitis colistin not polymyxin B', /Colistin/.test(txt(rec({ bug: 'pa', site: 'cystitis', sev: 'stable' }).pref)));
// CRAB / SM
t('CRAB SUL-DUR + carbapenem', /Sulbactam-durlobactam \+ imipenem/.test(rec({ bug: 'crab' }).pref[0]));
t('CRAB amp-sulb 9 g bridge', /9 g/.test(txt(rec({ bug: 'crab' }).alt)));
t('CRAB pna colonization note', /移生/.test(txt(rec({ bug: 'crab', site: 'pna' }).notes)));
t('SM cefiderocol mono', /Cefiderocol 單藥/.test(rec({ bug: 'sm' }).pref[0]));
// MRSA / VRE
t('MRSA pna avoid dapto', /Daptomycin/.test(txt(rec({ bug: 'mrsa', site: 'pna' }).avoid)) && !/Daptomycin/.test(txt(rec({ bug: 'mrsa', site: 'pna' }).pref)));
t('MRSA bsi vanco/dapto', /Daptomycin/.test(txt(rec({ bug: 'mrsa' }).pref)));
t('MRSA ssti I&D', /切開引流/.test(rec({ bug: 'mrsa', site: 'ssti', sev: 'stable' }).pref[0]));
t('VRE pna linezolid only', txt(rec({ bug: 'vre', site: 'pna' }).pref) === 'Linezolid');
t('VRE bsi high-dose dapto', /8–12/.test(rec({ bug: 'vre' }).pref[0]));
t('VRE cystitis fosfomycin', /Fosfomycin/.test(txt(rec({ bug: 'vre', site: 'cystitis', sev: 'stable' }).pref)));
// Gating & alerts
t('colonization stops', !!rec({ clin: 'colon' }).stop);
t('unknown clin stops', !!rec({ clin: 'unknown' }).stop);
t('confirmed no stop', rec({}).stop === null);
t('shock alert', rec({ sev: 'shock' }).alerts.some(a => a.lv === 'red'));
t('cystitis+shock mismatch', rec({ site: 'cystitis', sev: 'shock' }).alerts.some(a => /不一致/.test(a.t)));
t('bsi+stable alert', rec({ sev: 'stable' }).alerts.some(a => /菌血症/.test(a.t)));
t('resistant alert', rec({ susc: 'resistant' }).alerts.some(a => /抗藥/.test(a.t)));
// Renal
t('no renal notes when normal', rec({ bug: 'mrsa' }).renal.length === 0);
t('HD dapto renal note', rec({ bug: 'mrsa', kidney: 'hd' }).renal.some(x => /48/.test(x)));
t('HD nitrofurantoin warning', rec({ site: 'cystitis', sev: 'stable', kidney: 'hd' }).renal.some(x => /Nitrofurantoin/.test(x)));
t('CRAB sulbactam renal', rec({ bug: 'crab', kidney: 'crrt' }).renal.some(x => /Sulbactam/.test(x)));
// Every bug × site × mech returns a non-empty preferred list
const sites = ['cystitis', 'cuti', 'bsi', 'pna', 'iai', 'ssti', 'other'];
const mechs = ['unknown', 'kpc', 'ndm', 'oxa', 'noncp'];
let allOk = true;
for (const bug of ['esbl', 'ampc', 'cre', 'pa', 'crab', 'sm', 'mrsa', 'vre'])
  for (const site of sites) for (const mech of mechs) for (const sev of ['stable', 'severe', 'shock']) {
    const r = rec({ bug, site, mech, sev });
    if (!r.pref.length || r.pref.some(x => !x)) { allOk = false; console.log('empty', bug, site, mech, sev); }
  }
t('all combinations produce preferred list', allOk);

// NHI 第十節 (115.07.23) article numbers in the drug table
const medsSrc = html.match(/const meds=\[[\s\S]*?\n\];/)[0];
const meds = new Function(medsSrc + '\nreturn meds;')();
const nhi = name => (meds.find(m => m[0] === name) || [])[2] || '';
for (const [drug, art] of [['Meropenem / imipenem', '10.5.1'], ['Ertapenem', '10.5.2'], ['Ceftazidime-avibactam', '10.3.6'], ['Ceftolozane-tazobactam', '10.3.7'], ['Cefiderocol', '10.3.8'], ['Imipenem-relebactam', '10.5.4'], ['Tigecycline', '10.8.5'], ['Minocycline', '10.8.9'], ['Vancomycin / teicoplanin', '10.8.1.1'], ['Linezolid', '10.8.3'], ['Daptomycin', '10.8.7'], ['Levofloxacin', '10.8.2.3'], ['Colistin', '10.8.6'], ['Polymyxin B', '10.8.10']])
  t(`NHI ${drug} cites ${art}`, nhi(drug).startsWith(art));
for (const drug of ['Meropenem-vaborbactam', 'Aztreonam-avibactam', 'Sulbactam-durlobactam', 'Eravacycline', 'Cefepime-enmetazobactam'])
  t(`NHI ${drug} not presumed covered`, /無專屬條文/.test(nhi(drug)) && /待核實/.test(nhi(drug)));
t('NHI cefepime-enmetazobactam not presumed covered', /待核實/.test(nhi('Cefepime-enmetazobactam')) && /不推定給付/.test(nhi('Cefepime-enmetazobactam')));
t('NHI ertapenem flags cUTI gap', /cUTI 不在/.test(nhi('Ertapenem')));
t('NHI daptomycin flags VRE bacteremia gap', /VRE 菌血症未列舉/.test(nhi('Daptomycin')));
t('NHI polymyxin B not for UTI', /不適用於 UTI/.test(nhi('Polymyxin B')));

// Demo cases: engine output and NHI articles must match what each case teaches
const DEMO = new Function(html.split('/*DEMO-START*/')[1].split('/*DEMO-END*/')[0] + '\nreturn DEMO;')();
t('6 demo cases', DEMO.length === 6);
t('demo case ids unique', new Set(DEMO.map(c => c.id)).size === 6);
for (const c of DEMO) {
  const r = MDRO.recommend(c.input);
  t(`${c.id} engine does not stop`, r.stop === null);
  for (const k of ['pref', 'alt', 'avoid'])
    for (const s of (c.expect[k] || [])) t(`${c.id} ${k} has ${s}`, txt(r[k]).toLowerCase().includes(s.toLowerCase()));
  for (const [drug, art] of c.cite) t(`${c.id} cites ${drug} ${art}`, nhi(drug).startsWith(art) && c.nhi.includes(art.startsWith('10.') ? art : drug));
  for (const f of ['clin', 'sev', 'site', 'bug', 'mech', 'kidney', 'susc']) t(`${c.id} input ${f}`, !!c.input[f]);
  for (const [id, v] of [['clin', c.input.clin], ['severity', c.input.sev], ['site', c.input.site], ['mech', c.input.mech], ['kidney', c.input.kidney], ['suscept', c.input.susc]])
    t(`${c.id} ${id}=${v} is a wizard option`, new RegExp(`id="${id}">.*?value="${v}"`).test(html));
  for (const f of ['who', 'micro', 'nhi', 'course', 'pearl']) t(`${c.id} has ${f}`, !!c[f]);
  t(`${c.id} has steps`, c.think.length >= 3 && c.plan.length >= 3);
}
t('demo covers 6 organisms', new Set(DEMO.map(c => c.input.bug)).size === 6);

// Mind map: first-line drugs agree with the engine
const MAP = new Function(html.split('/*MAP-START*/')[1].split('/*MAP-END*/')[0] + '\nreturn MAP;')();
const mapTxt = title => MAP.right.find(n => n.t === title).k.map(k => k.b + ' ' + k.d).join(' | ');
for (const [title, o] of [
  ['ESBL-E', { bug: 'esbl', site: 'cystitis', sev: 'stable' }], ['AmpC-E', { bug: 'ampc' }], ['CRE', { bug: 'cre', mech: 'kpc' }], ['CRE', { bug: 'cre', mech: 'ndm' }], ['CRE', { bug: 'cre', mech: 'oxa' }],
  ['DTR-PA', { bug: 'pa', site: 'pna' }], ['DTR-PA', { bug: 'pa', mech: 'ndm' }], ['CRAB', { bug: 'crab' }], ['S. maltophilia', { bug: 'sm' }], ['MRSA', { bug: 'mrsa', site: 'pna' }], ['VRE', { bug: 'vre', site: 'pna' }]
]) {
  const first = rec(o).pref[0].split(/[（ ]/)[0];
  t(`map ${title} has ${first}`, mapTxt(title).includes(first));
}
t('map has both sides', MAP.left.length >= 4 && MAP.right.length >= 8);
for (const art of ['10.3.6', '10.3.7', '10.3.8', '10.5.4']) t(`map NHI ${art}`, mapTxt('健保與重評估').includes(art));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
