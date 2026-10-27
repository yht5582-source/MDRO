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

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
